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

const ALLOWED_EVENT_FIELDS = new Set([
  "title", "space_name", "neighborhood", "category", "description",
  "date", "time", "cost", "cost_amount", "accessibility", "tags",
  "image_url", "gallery_images", "contact_email", "featured",
  "noise_level", "accessibility_info", "space_format", "crowd_level",
  "attending_limit", "show_attendance", "attending_count", "hidden",
  "hide_when_full", "host_id",
]);

function sanitizeEvent(obj) {
  const out = {};
  for (const key of ALLOWED_EVENT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  }
  if (out.title) out.title = String(out.title).slice(0, 200);
  if (out.description) out.description = String(out.description).slice(0, 5000);
  if (out.cost_amount != null) out.cost_amount = Math.max(0, Number(out.cost_amount)) || null;
  if (out.crowd_level != null) out.crowd_level = Math.min(100, Math.max(0, Number(out.crowd_level)));
  if (out.attending_limit != null) out.attending_limit = Math.max(1, Math.floor(Number(out.attending_limit))) || null;
  return out;
}

export async function createEvent(eventObj) {
  const { data, error } = await supabase
    .from("events")
    .insert([sanitizeEvent(eventObj)])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, patch) {
  const { data, error } = await supabase
    .from("events")
    .update(sanitizeEvent(patch))
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

export async function setEventHidden(id, hidden) {
  const { error } = await supabase.from("events").update({ hidden }).eq("id", id);
  if (error) throw error;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function fetchUserAttendance(userId) {
  const { data, error } = await supabase
    .from("event_attendance")
    .select("event_id")
    .eq("user_id", userId);
  if (error) throw error;
  return data?.map((r) => r.event_id) ?? [];
}

export async function markAttendance(eventId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("event_attendance")
    .insert({ event_id: eventId, user_id: user.id });
  if (error) throw error;
}

export async function unmarkAttendance(eventId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("event_attendance")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function fetchEventAttendees(eventId) {
  const { data, error } = await supabase
    .from("event_attendance")
    .select("user_id, created_at, profiles(full_name, email)")
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
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
