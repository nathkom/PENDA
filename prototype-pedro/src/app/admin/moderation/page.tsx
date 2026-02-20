import { createServerClient } from "@/lib/supabase/server"
import ModerationQueueTable, {
  type ModerationItem,
} from "@/components/moderation/ModerationQueueTable"

export default async function ModerationPage() {
  const supabase = await createServerClient()

  // Fetch pending queue items with submitter profiles
  const { data: queueItems } = await supabase
    .from("moderation_queue")
    .select("*, profiles!moderation_queue_submitted_by_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  const raw = (queueItems ?? []) as Array<{
    id: string
    item_type: string
    item_id: string
    action: string
    status: string
    created_at: string
    submitted_by: string
    profiles: { display_name: string } | null
  }>

  // Fetch item names for each queue entry
  const placeIds = raw.filter((q) => q.item_type === "place").map((q) => q.item_id)
  const eventIds = raw.filter((q) => q.item_type === "event").map((q) => q.item_id)

  const [placesRes, eventsRes] = await Promise.all([
    placeIds.length > 0
      ? supabase.from("places").select("id, name").in("id", placeIds)
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? supabase.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] }),
  ])

  const placeNames = new Map(
    ((placesRes.data ?? []) as Array<{ id: string; name: string }>).map((p) => [
      p.id,
      p.name,
    ])
  )
  const eventNames = new Map(
    ((eventsRes.data ?? []) as Array<{ id: string; title: string }>).map((e) => [
      e.id,
      e.title,
    ])
  )

  const items: ModerationItem[] = raw.map((q) => ({
    id: q.id,
    item_type: q.item_type,
    item_id: q.item_id,
    action: q.action,
    status: q.status,
    created_at: q.created_at,
    submitted_by: q.submitted_by,
    item_name:
      q.item_type === "place"
        ? placeNames.get(q.item_id) ?? "Unknown place"
        : eventNames.get(q.item_id) ?? "Unknown event",
    submitter_name: q.profiles?.display_name ?? "Unknown",
  }))

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Moderation Queue</h2>
      <ModerationQueueTable items={items} />
    </div>
  )
}
