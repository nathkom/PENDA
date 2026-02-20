"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resend } from "@/lib/email/client"
import { SubmissionApproved } from "@/lib/email/templates/SubmissionApproved"
import { SubmissionRejected } from "@/lib/email/templates/SubmissionRejected"
import { PlaceSchema, type PlaceFormValues } from "@/lib/validations/place"
import type { AppRole, Place } from "@/types"

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

export async function createPlace(data: PlaceFormValues) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }
  if (!auth.role || !["organizer", "admin"].includes(auth.role)) {
    return { data: null, error: "You must be an organizer or admin to create places" }
  }

  const parsed = PlaceSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  const { tags, ...placeData } = parsed.data
  const dedupe_key = `${placeData.name.toLowerCase()}|${placeData.address.toLowerCase()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: place, error } = await (supabase.from("places") as any)
    .insert({
      ...placeData,
      description: placeData.description || null,
      neighborhood: placeData.neighborhood || null,
      zip: placeData.zip || null,
      is_free: placeData.is_free ?? null,
      accessibility: placeData.accessibility ?? {},
      created_by: auth.user.id,
      dedupe_key,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "A place with this name and address already exists" }
    }
    return { data: null, error: error.message }
  }

  const created = place as Place | null

  // Insert tags if provided
  if (tags && tags.length > 0 && created) {
    const tagInserts = tags.map((tag_id) => ({
      place_id: created.id,
      tag_id,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("place_tags") as any).insert(tagInserts)
  }

  revalidatePath("/organizer/places")
  return { data: created, error: null }
}

export async function updatePlace(id: string, data: PlaceFormValues) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }

  const parsed = PlaceSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  // Verify ownership and status
  const { data: existing } = await supabase
    .from("places")
    .select("created_by, status")
    .eq("id", id)
    .single()

  const existingPlace = existing as { created_by: string; status: string } | null
  if (!existingPlace) {
    return { data: null, error: "Place not found" }
  }
  if (existingPlace.created_by !== auth.user.id && auth.role !== "admin") {
    return { data: null, error: "You can only edit your own places" }
  }
  if (!["draft", "pending"].includes(existingPlace.status)) {
    return { data: null, error: "Only draft or pending places can be edited" }
  }

  const { tags, ...placeData } = parsed.data
  const dedupe_key = `${placeData.name.toLowerCase()}|${placeData.address.toLowerCase()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: place, error } = await (supabase.from("places") as any)
    .update({
      ...placeData,
      description: placeData.description || null,
      neighborhood: placeData.neighborhood || null,
      zip: placeData.zip || null,
      is_free: placeData.is_free ?? null,
      accessibility: placeData.accessibility ?? {},
      dedupe_key,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Replace tags: delete existing, insert new
  if (tags !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("place_tags") as any).delete().eq("place_id", id)
    if (tags.length > 0) {
      const tagInserts = tags.map((tag_id) => ({
        place_id: id,
        tag_id,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("place_tags") as any).insert(tagInserts)
    }
  }

  revalidatePath("/organizer/places")
  revalidatePath(`/organizer/places/${id}/edit`)
  return { data: place as Place | null, error: null }
}

export async function submitPlaceForReview(id: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth) {
    return { data: null, error: "Not authenticated" }
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("places")
    .select("created_by, status")
    .eq("id", id)
    .single()

  const place = existing as { created_by: string; status: string } | null
  if (!place) {
    return { data: null, error: "Place not found" }
  }
  if (place.created_by !== auth.user.id && auth.role !== "admin") {
    return { data: null, error: "You can only submit your own places" }
  }

  // Determine action based on current status
  const action = place.status === "draft" ? "create" : "edit"

  // Update status to pending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("places") as any)
    .update({ status: "pending" })
    .eq("id", id)

  if (updateError) {
    return { data: null, error: updateError.message }
  }

  // Create moderation queue entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: queueError } = await (supabase.from("moderation_queue") as any).insert({
    item_type: "place",
    item_id: id,
    submitted_by: auth.user.id,
    action,
  })

  if (queueError) {
    return { data: null, error: queueError.message }
  }

  revalidatePath("/organizer/places")
  return { data: { id }, error: null }
}

export async function publishPlace(id: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth || auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: place, error } = await (supabase.from("places") as any)
    .update({ status: "published" })
    .eq("id", id)
    .select("*, profiles!places_created_by_fkey(display_name)")
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const published = place as (Place & { profiles?: { display_name: string } }) | null

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
          subject: `Your place "${published.name}" has been approved`,
          react: SubmissionApproved({
            itemTitle: published.name,
            itemType: "place",
            itemUrl: `${process.env.NEXT_PUBLIC_APP_URL}/places/${published.id}`,
          }),
        })
      }
    }
  } catch (emailError) {
    console.error("Failed to send place approval email:", emailError)
  }

  revalidatePath("/places")
  revalidatePath("/organizer/places")
  return { data: published as Place | null, error: null }
}

export async function hidePlace(id: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth || auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: place, error } = await (supabase.from("places") as any)
    .update({ status: "hidden" })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath("/places")
  revalidatePath("/organizer/places")
  return { data: place as Place | null, error: null }
}

export async function rejectPlace(id: string, note: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedUser(supabase)

  if (!auth || auth.role !== "admin") {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: place, error } = await (supabase.from("places") as any)
    .update({ status: "rejected" })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const rejected = place as Place | null

  // Update moderation queue entry with rejection note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("moderation_queue") as any)
    .update({
      status: "rejected",
      note,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("item_id", id)
    .eq("item_type", "place")
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
          subject: `Your place "${rejected.name}" needs changes`,
          react: SubmissionRejected({
            itemTitle: rejected.name,
            itemType: "place",
            rejectionNote: note,
          }),
        })
      }
    }
  } catch (emailError) {
    console.error("Failed to send place rejection email:", emailError)
  }

  revalidatePath("/places")
  revalidatePath("/organizer/places")
  return { data: rejected, error: null }
}
