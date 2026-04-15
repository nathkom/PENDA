import { useState, useEffect, useMemo } from "react";
import { fetchAllEvents } from "../lib/events";
import { useUser } from "../context/UserContext";

export function useEvents() {
  const { createdEvents, deletedEventIds, editedEvents, attendingEvents } = useUser();
  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const base = import.meta.env.BASE_URL;

  // Re-attach BASE_URL to relative image paths stored in Supabase
  function normalizeImages(event) {
    function fixUrl(url) {
      if (!url || url.startsWith("http") || url.startsWith(base)) return url;
      return base + url.replace(/^\//, "");
    }
    return {
      ...event,
      image_url: fixUrl(event.image_url),
      gallery_images: (event.gallery_images ?? []).map((g) =>
        typeof g === "string" ? fixUrl(g) : { ...g, url: fixUrl(g.url) }
      ),
    };
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllEvents();
      setDbEvents(data.map(normalizeImages));
    } catch (err) {
      console.error("Failed to load events from Supabase:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const events = useMemo(() => {
    // createdEvents (optimistic) take precedence over DB rows
    const optimisticIds = new Set(createdEvents.map((e) => e.id));
    const base = [
      ...createdEvents,
      ...dbEvents.filter((e) => !optimisticIds.has(e.id)),
    ];
    return base
      .filter((e) => !deletedEventIds.has(e.id))
      .map((e) => (editedEvents[e.id] ? { ...e, ...editedEvents[e.id] } : e))
      .filter(
        (e) =>
          !e.attending_limit ||
          (e.attending_count || 0) + (attendingEvents.has(e.id) ? 1 : 0) <
            e.attending_limit,
      );
  }, [dbEvents, createdEvents, deletedEventIds, editedEvents, attendingEvents]);

  return { events, loading, error, refetch: load };
}
