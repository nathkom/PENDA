import { supabase } from "./supabase";

export async function fetchAllEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date");
  if (error) throw error;
  return data ?? [];
}

export async function fetchEventById(id) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createEvent(eventObj) {
  const { data, error } = await supabase
    .from("events")
    .insert([eventObj])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, patch) {
  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function trackAnalytic(eventId, action, userId = null) {
  // Fire-and-forget — don't block the UI on analytics writes
  supabase
    .from("event_analytics")
    .insert([{ event_id: eventId, action, user_id: userId || null }])
    .then(({ error }) => {
      if (error) console.warn("Analytics insert failed:", error.message);
    });
}
