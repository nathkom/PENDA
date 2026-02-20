"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resend } from "@/lib/email/client"
import { SubmissionApproved } from "@/lib/email/templates/SubmissionApproved"
import { SubmissionRejected } from "@/lib/email/templates/SubmissionRejected"
import { EventSchema, type EventFormValues } from "@/lib/validations/event"
import type { AppRole, Event } from "@/types"

async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createServerClient>>) {
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

export async function createEvent(data: EventFormValues) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }
  if (!auth.role || !["organizer", "admin"].includes(auth.role)) {
    return { data: null, error: "You must be an organizer or admin to create events" }
  }

  const parsed = EventSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  const { tags, ...eventData } = parsed.data
  const dedupe_key = `${eventData.title.toLowerCase()}|${eventData.starts_at}|${eventData.place_id}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error } = await (supabase.from("events") as any)
    .insert({
      ...eventData,
      description: eventData.description || null,
      ends_at: eventData.ends_at || null,
      is_free: eventData.is_free ?? null,
      primary_image_path: eventData.primary_image_path || null,
      created_by: auth.user.id,
      dedupe_key,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "An event with this title, time, and place already exists" }
    }
    return { data: null, error: error.message }
  }

  const created = event as Event | null

  // Insert tags if provided
  if (tags && tags.length > 0 && created) {
    const tagInserts = tags.map((tag_id) => ({
      event_id: created.id,
      tag_id,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("event_tags") as any).insert(tagInserts)
  }

  revalidatePath("/organizer/events")
  return { data: created, error: null }
}

export async function updateEvent(id: string, data: EventFormValues) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }

  const parsed = EventSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  // Verify ownership and status
  const { data: existing } = await supabase
    .from("events")
    .select("created_by, status")
    .eq("id", id)
    .single()

  const existingEvent = existing as { created_by: string; status: string } | null
  if (!existingEvent) {
    return { data: null, error: "Event not found" }
  }
  if (existingEvent.created_by !== auth.user.id && auth.role !== "admin") {
    return { data: null, error: "You can only edit your own events" }
  }
  if (!["draft", "pending"].includes(existingEvent.status)) {
    return { data: null, error: "Only draft or pending events can be edited" }
  }

  const { tags, ...eventData } = parsed.data
  const dedupe_key = `${eventData.title.toLowerCase()}|${eventData.starts_at}|${eventData.place_id}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error } = await (supabase.from("events") as any)
    .update({
      ...eventData,
      description: eventData.description || null,
      ends_at: eventData.ends_at || null,
      is_free: eventData.is_free ?? null,
      primary_image_path: eventData.primary_image_path || null,
      dedupe_key,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Replace tags
  if (tags !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("event_tags") as any).delete().eq("event_id", id)
    if (tags.length > 0) {
      const tagInserts = tags.map((tag_id) => ({
        event_id: id,
        tag_id,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("event_tags") as any).insert(tagInserts)
    }
  }

  revalidatePath("/organizer/events")
  revalidatePath(`/organizer/events/${id}/edit`)
  return { data: event as Event | null, error: null }
}

export async function submitEventForReview(id: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }

  // Verify ownership and check image
  const { data: existing } = await supabase
    .from("events")
    .select("created_by, status, primary_image_path")
    .eq("id", id)
    .single()

  const event = existing as {
    created_by: string
    status: string
    primary_image_path: string | null
  } | null

  if (!event) {
    return { data: null, error: "Event not found" }
  }
  if (event.created_by !== auth.user.id && auth.role !== "admin") {
    return { data: null, error: "You can only submit your own events" }
  }
  if (!event.primary_image_path) {
    return { data: null, error: "An image is required before submitting for review" }
  }

  const action = event.status === "draft" ? "create" : "edit"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("events") as any)
    .update({ status: "pending" })
    .eq("id", id)

  if (updateError) {
    return { data: null, error: updateError.message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: queueError } = await (supabase.from("moderation_queue") as any).insert({
    item_type: "event",
    item_id: id,
    submitted_by: auth.user.id,
    action,
  })

  if (queueError) {
    return { data: null, error: queueError.message }
  }

  revalidatePath("/organizer/events")
  return { data: { id }, error: null }
}

export async function publishEvent(id: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth || auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error } = await (supabase.from("events") as any)
    .update({ status: "published" })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const published = event as Event | null

  // Send approval email to the organizer
  try {
    if (published?.created_by) {
      const adminClient = createAdminClient()
      const { data: userData } = await adminClient.auth.admin.getUserById(published.created_by)
      const userEmail = userData?.user?.email

      if (userEmail) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: userEmail,
          subject: `Your event "${published.title}" has been approved`,
          react: SubmissionApproved({
            itemTitle: published.title,
            itemType: "event",
            itemUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${published.id}`,
          }),
        })
      }
    }
  } catch (emailError) {
    console.error("Failed to send event approval email:", emailError)
  }

  revalidatePath("/events")
  revalidatePath("/organizer/events")
  return { data: published, error: null }
}

export async function hideEvent(id: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth || auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error } = await (supabase.from("events") as any)
    .update({ status: "hidden" })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath("/events")
  revalidatePath("/organizer/events")
  return { data: event as Event | null, error: null }
}

export async function rejectEvent(id: string, note: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth || auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error } = await (supabase.from("events") as any)
    .update({ status: "rejected" })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const rejected = event as Event | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("moderation_queue") as any)
    .update({
      status: "rejected",
      note,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("item_id", id)
    .eq("item_type", "event")
    .eq("status", "pending")

  // Send rejection email to the organizer
  try {
    if (rejected?.created_by) {
      const adminClient = createAdminClient()
      const { data: userData } = await adminClient.auth.admin.getUserById(rejected.created_by)
      const userEmail = userData?.user?.email

      if (userEmail) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: userEmail,
          subject: `Your event "${rejected.title}" needs changes`,
          react: SubmissionRejected({
            itemTitle: rejected.title,
            itemType: "event",
            rejectionNote: note,
          }),
        })
      }
    }
  } catch (emailError) {
    console.error("Failed to send event rejection email:", emailError)
  }

  revalidatePath("/events")
  revalidatePath("/organizer/events")
  return { data: rejected, error: null }
}
