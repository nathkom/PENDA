"use server"

import { createServerClient } from "@/lib/supabase/server"
import { ReviewSchema, type ReviewFormValues } from "@/lib/validations/review"

export async function createReview(data: ReviewFormValues) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "You must be signed in to leave a review" }
  }

  const parsed = ReviewSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  const { target_type, target_id, rating, body } = parsed.data

  const insertPayload =
    target_type === "place"
      ? {
          target_type: "place" as const,
          place_id: target_id,
          event_id: null,
          user_id: user.id,
          rating,
          body: body ?? null,
        }
      : {
          target_type: "event" as const,
          event_id: target_id,
          place_id: null,
          user_id: user.id,
          rating,
          body: body ?? null,
        }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: review, error } = await (supabase.from("reviews") as any).insert(insertPayload).select().single()

  if (error) {
    // Postgres unique constraint violation code
    if (error.code === "23505") {
      return { data: null, error: "You've already reviewed this" }
    }
    return { data: null, error: error.message }
  }

  return { data: review, error: null }
}

export async function hideReview(reviewId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  // Verify caller is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role: string } | null)?.role
  if (role !== "admin") {
    return { data: null, error: "Forbidden" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase.from("reviews") as any)
    .update({ status: "hidden" })
    .eq("id", reviewId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: updated, error: null }
}
