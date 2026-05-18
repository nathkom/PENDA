import { supabase } from "./supabase";

export async function fetchHostEvents(hostId) {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, category, attending_count, hidden")
    .eq("host_id", hostId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchHostAnalytics(hostId) {
  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id")
    .eq("host_id", hostId);
  if (evErr) throw evErr;

  const eventIds = (events ?? []).map((e) => e.id);
  if (!eventIds.length) return {};

  const { data, error } = await supabase
    .from("event_analytics")
    .select("event_id, action")
    .in("event_id", eventIds);
  if (error) throw error;

  const counts = {};
  for (const row of data ?? []) {
    if (!counts[row.event_id]) counts[row.event_id] = { view: 0, like: 0, bookmark: 0 };
    counts[row.event_id][row.action] = (counts[row.event_id][row.action] ?? 0) + 1;
  }
  return counts;
}

// Fetches raw timestamped action rows for a single event.
// Returns { actions: [{action, created_at}], attendance: [{created_at}] }.
// Caller buckets these into daily series client-side.
export async function fetchEventTimeSeries(eventId, sinceIso) {
  let analyticsQuery = supabase
    .from("event_analytics")
    .select("action, created_at")
    .eq("event_id", eventId);
  let attendanceQuery = supabase
    .from("event_attendance")
    .select("created_at")
    .eq("event_id", eventId);

  if (sinceIso) {
    analyticsQuery = analyticsQuery.gte("created_at", sinceIso);
    attendanceQuery = attendanceQuery.gte("created_at", sinceIso);
  }

  const [{ data: actions, error: aErr }, { data: attendance, error: atErr }] =
    await Promise.all([analyticsQuery, attendanceQuery]);
  if (aErr) throw aErr;
  if (atErr) throw atErr;

  return { actions: actions ?? [], attendance: attendance ?? [] };
}
