"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resend } from "@/lib/email/client"
import { OrganizerRequestReceived } from "@/lib/email/templates/OrganizerRequestReceived"
import { OrganizerRequestDecision } from "@/lib/email/templates/OrganizerRequestDecision"
import type { AppRole, OrganizerRequest } from "@/types"

async function getAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createServerClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role: AppRole } | null)?.role ?? null
  return { user, role }
}

export async function requestOrganizerRole(message?: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }

  if (auth.role === "organizer" || auth.role === "admin") {
    return { data: null, error: "Already an organizer" }
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from("organizer_requests")
    .select("id, status")
    .eq("user_id", auth.user.id)
    .eq("status", "pending")
    .maybeSingle()

  if (existing) {
    return { data: null, error: "Request already pending" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request, error } = await (supabase.from("organizer_requests") as any)
    .insert({
      user_id: auth.user.id,
      message: message?.trim() || null,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: "Failed to submit request. Please try again." }
  }

  // Send notification email to admin
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", auth.user.id)
        .single()
      const displayName =
        (profile as { display_name: string } | null)?.display_name ?? "Unknown"

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: adminEmail,
        subject: `New organizer request from ${displayName}`,
        react: OrganizerRequestReceived({
          requesterName: displayName,
          requesterEmail: auth.user.email ?? "",
          message: message?.trim() || null,
          reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/organizer-requests`,
        }),
      })
    }
  } catch (emailError) {
    console.error("Failed to send organizer request notification email:", emailError)
  }

  revalidatePath("/organizer")
  return { data: request as OrganizerRequest, error: null }
}

export async function approveOrganizerRequest(requestId: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }
  if (auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  // Fetch the request to get the user_id
  const { data: request } = await supabase
    .from("organizer_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .single()

  if (!request) {
    return { data: null, error: "Request not found or already reviewed" }
  }

  const reqData = request as OrganizerRequest

  // Use admin client to update the user's role (bypasses RLS self-role-escalation protection)
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: roleError } = await (adminClient.from("profiles") as any)
    .update({ role: "organizer" })
    .eq("id", reqData.user_id)

  if (roleError) {
    return { data: null, error: "Failed to update user role" }
  }

  // Update the request status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (adminClient.from("organizer_requests") as any)
    .update({
      status: "approved",
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single()

  if (updateError) {
    return { data: null, error: "Failed to update request status" }
  }

  // Send approval email to user
  try {
    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.auth.admin.getUserById(reqData.user_id)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("id", reqData.user_id)
      .single()
    const displayName =
      (profile as { display_name: string } | null)?.display_name ?? "Organizer"
    const userEmail = userData?.user?.email

    if (userEmail) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: userEmail,
        subject: "Your organizer request has been approved!",
        react: OrganizerRequestDecision({
          approved: true,
          requesterName: displayName,
        }),
      })
    }
  } catch (emailError) {
    console.error("Failed to send organizer approval email:", emailError)
  }

  revalidatePath("/admin/organizer-requests")
  return { data: updated as OrganizerRequest, error: null }
}

export async function rejectOrganizerRequest(requestId: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }
  if (auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (adminClient.from("organizer_requests") as any)
    .update({
      status: "rejected",
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single()

  if (error) {
    return { data: null, error: "Failed to reject request" }
  }

  if (!updated) {
    return { data: null, error: "Request not found or already reviewed" }
  }

  // Send rejection email to user
  try {
    const updatedReq = updated as OrganizerRequest
    const { data: userData } = await adminClient.auth.admin.getUserById(updatedReq.user_id)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("id", updatedReq.user_id)
      .single()
    const displayName =
      (profile as { display_name: string } | null)?.display_name ?? "User"
    const userEmail = userData?.user?.email

    if (userEmail) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: userEmail,
        subject: "Update on your organizer request",
        react: OrganizerRequestDecision({
          approved: false,
          requesterName: displayName,
        }),
      })
    }
  } catch (emailError) {
    console.error("Failed to send organizer rejection email:", emailError)
  }

  revalidatePath("/admin/organizer-requests")
  return { data: updated as OrganizerRequest, error: null }
}
