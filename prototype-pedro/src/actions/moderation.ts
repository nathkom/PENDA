"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { publishPlace, rejectPlace, hidePlace } from "@/actions/places"
import { publishEvent, rejectEvent, hideEvent } from "@/actions/events"
import { hideReview } from "@/actions/reviews"
import type { AppRole } from "@/types"

async function getAuthenticatedAdmin(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role: AppRole } | null)?.role
  if (role !== "admin") return null
  return { user, role }
}

export async function approveSubmission(queueId: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedAdmin(supabase)

  if (!auth) {
    return { data: null, error: "Admin access required" }
  }

  // Fetch the queue entry
  const { data: queueItem } = await supabase
    .from("moderation_queue")
    .select("*")
    .eq("id", queueId)
    .eq("status", "pending")
    .single()

  const item = queueItem as {
    id: string
    item_type: string
    item_id: string
    submitted_by: string
  } | null

  if (!item) {
    return { data: null, error: "Queue item not found or already reviewed" }
  }

  // Delegate to the existing publish actions (which handle email sending)
  let result: { data: unknown; error: string | null }
  if (item.item_type === "place") {
    result = await publishPlace(item.item_id)
  } else if (item.item_type === "event") {
    result = await publishEvent(item.item_id)
  } else {
    return { data: null, error: "Unknown item type" }
  }

  if (result.error) {
    return { data: null, error: result.error }
  }

  // Update the moderation queue entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("moderation_queue") as any)
    .update({
      status: "approved",
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", queueId)

  revalidatePath("/admin/moderation")
  return { data: { id: queueId }, error: null }
}

export async function rejectSubmission(queueId: string, note: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedAdmin(supabase)

  if (!auth) {
    return { data: null, error: "Admin access required" }
  }

  if (!note || note.trim().length === 0) {
    return { data: null, error: "A rejection note is required" }
  }

  // Fetch the queue entry
  const { data: queueItem } = await supabase
    .from("moderation_queue")
    .select("*")
    .eq("id", queueId)
    .eq("status", "pending")
    .single()

  const item = queueItem as {
    id: string
    item_type: string
    item_id: string
    submitted_by: string
  } | null

  if (!item) {
    return { data: null, error: "Queue item not found or already reviewed" }
  }

  // Delegate to the existing reject actions (which handle email sending + queue update)
  let result: { data: unknown; error: string | null }
  if (item.item_type === "place") {
    result = await rejectPlace(item.item_id, note.trim())
  } else if (item.item_type === "event") {
    result = await rejectEvent(item.item_id, note.trim())
  } else {
    return { data: null, error: "Unknown item type" }
  }

  if (result.error) {
    return { data: null, error: result.error }
  }

  revalidatePath("/admin/moderation")
  return { data: { id: queueId }, error: null }
}

export async function triageReport(reportId: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedAdmin(supabase)

  if (!auth) {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report, error } = await (supabase.from("reports") as any)
    .update({ status: "triaged" })
    .eq("id", reportId)
    .eq("status", "open")
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  if (!report) {
    return { data: null, error: "Report not found or already triaged" }
  }

  revalidatePath("/admin/reports")
  return { data: report, error: null }
}

export async function closeReport(reportId: string, hideContent?: boolean) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedAdmin(supabase)

  if (!auth) {
    return { data: null, error: "Admin access required" }
  }

  // Fetch the report to get target info
  const { data: reportData } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single()

  const report = reportData as {
    id: string
    target_type: string
    place_id: string | null
    event_id: string | null
    review_id: string | null
    status: string
  } | null

  if (!report) {
    return { data: null, error: "Report not found" }
  }

  // Optionally hide the reported content
  if (hideContent) {
    if (report.target_type === "place" && report.place_id) {
      await hidePlace(report.place_id)
    } else if (report.target_type === "event" && report.event_id) {
      await hideEvent(report.event_id)
    } else if (report.target_type === "review" && report.review_id) {
      await hideReview(report.review_id)
    }
  }

  // Close the report
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: closed, error } = await (supabase.from("reports") as any)
    .update({ status: "closed" })
    .eq("id", reportId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath("/admin/reports")
  return { data: closed, error: null }
}
