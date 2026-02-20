import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import { EventList } from "@/components/events/EventList"
import { PlaceList } from "@/components/places/PlaceList"
import { SearchBar } from "@/components/search/SearchBar"
import { HomepageTabs } from "@/components/search/HomepageTabs"
import type { EventCardData, PlaceCardData, Tag } from "@/types"

type EventRow = EventCardData & {
  event_tags: { tags: Tag }[]
  places: { name: string; neighborhood: string | null } | null
}

type PlaceRow = PlaceCardData & {
  place_tags: { tags: Tag }[]
}

const FEED_LIMIT = 12

export const metadata = {
  title: "Seattle Third Spaces",
  description:
    "Discover community third spaces, cafés, parks, and events in the Seattle area.",
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const tab =
    typeof params.tab === "string" && params.tab === "places"
      ? "places"
      : "events"
  const q = typeof params.q === "string" ? params.q : ""

  const supabase = await createServerClient()

  let eventsContent: React.ReactNode = null
  let placesContent: React.ReactNode = null

  if (tab === "events") {
    let query = supabase
      .from("events")
      .select("*, event_tags(tags(*)), places(name, neighborhood)")
      .eq("status", "published" as const)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(FEED_LIMIT)

    if (q) {
      query = query.textSearch("title", q, {
        type: "websearch",
        config: "english",
      })
    }

    const { data, error } = await query
    if (error) throw error

    const events = (data ?? []) as unknown as EventRow[]

    const eventsWithImages: EventCardData[] = events.map((event) => {
      let imageUrl: string | null = null
      if (event.primary_image_path) {
        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(event.primary_image_path)
        imageUrl = urlData.publicUrl
      }
      return { ...event, imageUrl }
    })

    eventsContent = <EventList events={eventsWithImages} />
  } else {
    let query = supabase
      .from("places")
      .select("*, place_tags(tags(*))")
      .eq("status", "published" as const)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT)

    if (q) {
      query = query.textSearch("name", q, {
        type: "websearch",
        config: "english",
      })
    }

    const { data, error } = await query
    if (error) throw error

    const places = (data ?? []) as unknown as PlaceRow[]
    placesContent = <PlaceList places={places} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Seattle Third Spaces</h1>
        <p className="text-muted-foreground">
          Discover community spaces and upcoming events in the Seattle area.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchBar />
      </Suspense>

      <Suspense fallback={null}>
        <HomepageTabs activeTab={tab}>
          {tab === "events" ? eventsContent : placesContent}
        </HomepageTabs>
      </Suspense>
    </div>
  )
}
