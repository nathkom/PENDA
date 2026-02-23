import { createServerClient } from "@/lib/supabase/server"
import type { PlaceWithTags, EventWithPlace, Tag } from "@/types"
import { ExploreContent } from "./ExploreContent"

export const metadata = {
  title: "Explore — Seattle Third Spaces",
  description: "Discover third spaces on an interactive map of Seattle.",
}

export default async function ExplorePage() {
  const supabase = await createServerClient()

  const [placesResult, eventsResult, tagsResult] = await Promise.all([
    supabase
      .from("places")
      .select("*, place_tags(tags(*))")
      .eq("status", "published" as const)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("*, places(id, lat, lng, name, neighborhood), event_tags(tags(*))")
      .eq("status", "published" as const)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
    supabase.from("tags").select("*").order("name", { ascending: true }),
  ])

  if (placesResult.error) throw placesResult.error
  if (eventsResult.error) throw eventsResult.error

  const places = (placesResult.data ?? []) as unknown as PlaceWithTags[]
  const events = (eventsResult.data ?? []) as unknown as EventWithPlace[]
  const tags = (tagsResult.data ?? []) as unknown as Tag[]

  return <ExploreContent places={places} events={events} tags={tags} />
}
