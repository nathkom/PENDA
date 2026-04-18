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
