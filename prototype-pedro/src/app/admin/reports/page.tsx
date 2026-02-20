import { createServerClient } from "@/lib/supabase/server"
import ReportsTable, {
  type ReportItem,
} from "@/components/moderation/ReportsTable"

export default async function ReportsPage() {
  const supabase = await createServerClient()

  // Fetch open and triaged reports with reporter profiles
  const { data: reportsData } = await supabase
    .from("reports")
    .select("*, profiles!reports_reporter_id_fkey(display_name)")
    .in("status", ["open", "triaged"])
    .order("created_at", { ascending: true })

  const raw = (reportsData ?? []) as Array<{
    id: string
    target_type: string
    place_id: string | null
    event_id: string | null
    review_id: string | null
    reason: string
    details: string | null
    status: string
    created_at: string
    profiles: { display_name: string } | null
  }>

  // Fetch target names
  const placeIds = raw.filter((r) => r.place_id).map((r) => r.place_id!)
  const eventIds = raw.filter((r) => r.event_id).map((r) => r.event_id!)

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

  const reports: ReportItem[] = raw.map((r) => {
    let target_name = "Unknown"
    if (r.target_type === "place" && r.place_id) {
      target_name = placeNames.get(r.place_id) ?? "Unknown place"
    } else if (r.target_type === "event" && r.event_id) {
      target_name = eventNames.get(r.event_id) ?? "Unknown event"
    } else if (r.target_type === "review") {
      target_name = `Review ${r.review_id?.slice(0, 8) ?? ""}`
    }

    return {
      id: r.id,
      target_type: r.target_type,
      target_name,
      reporter_name: r.profiles?.display_name ?? "Unknown",
      reason: r.reason,
      details: r.details,
      status: r.status,
      created_at: r.created_at,
    }
  })

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Reports</h2>
      <ReportsTable reports={reports} />
    </div>
  )
}
