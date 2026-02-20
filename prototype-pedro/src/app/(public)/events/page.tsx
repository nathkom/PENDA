import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import { EventList } from "@/components/events/EventList"
import { SearchBar } from "@/components/search/SearchBar"
import { FilterPanel } from "@/components/search/FilterPanel"
import type { EventCardData, Tag } from "@/types"

const PAGE_SIZE = 20

type EventRow = EventCardData & {
  event_tags: { tags: Tag }[]
  places: { name: string; neighborhood: string | null } | null
}

export const metadata = {
  title: "Events — Seattle Third Spaces",
  description: "Discover upcoming community events in the Seattle area.",
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q : ""
  const neighborhood =
    typeof params.neighborhood === "string" ? params.neighborhood : ""
  const indoors = params.indoors === "true"
  const outdoors = params.outdoors === "true"
  const isFree = params.is_free === "true"
  const page = Math.max(1, Number(params.page) || 1)

  // Support multiple tag params: ?tag=id1&tag=id2
  const rawTag = params.tag
  const tagIds: string[] = Array.isArray(rawTag)
    ? rawTag
    : typeof rawTag === "string"
      ? [rawTag]
      : []

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createServerClient()

  // Fetch neighborhoods (from places, since events inherit location from their place)
  // and tags in parallel
  const [neighborhoodsResult, tagsResult] = await Promise.all([
    supabase
      .from("places")
      .select("neighborhood")
      .eq("status", "published" as const)
      .not("neighborhood", "is", null)
      .order("neighborhood", { ascending: true }),
    supabase.from("tags").select("*").order("name", { ascending: true }),
  ])

  const neighborhoods = [
    ...new Set(
      (neighborhoodsResult.data ?? [])
        .map((r) => (r as { neighborhood: string }).neighborhood)
        .filter(Boolean),
    ),
  ]
  const tags = (tagsResult.data ?? []) as unknown as Tag[]

  // Build main query
  let query = supabase
    .from("events")
    .select("*, event_tags(tags(*)), places(name, neighborhood)", {
      count: "exact",
    })
    .eq("status", "published" as const)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .range(from, to)

  if (q) {
    query = query.textSearch("title", q, {
      type: "websearch",
      config: "english",
    })
  }

  if (indoors) {
    query = query.eq("indoors", true)
  }

  if (outdoors) {
    query = query.eq("outdoors", true)
  }

  if (isFree) {
    query = query.eq("is_free", true)
  }

  const { data, count, error } = await query

  if (error) throw error

  const events = (data ?? []) as unknown as EventRow[]

  // Neighborhood filter: applied via the joined places table
  let filteredEvents = events
  if (neighborhood) {
    filteredEvents = filteredEvents.filter(
      (e) => e.places?.neighborhood === neighborhood,
    )
  }

  // Tag filter: applied in application code
  // (Supabase doesn't support filtering parent rows by nested join values)
  if (tagIds.length > 0) {
    filteredEvents = filteredEvents.filter((e) =>
      e.event_tags.some((et) => tagIds.includes(et.tags?.id)),
    )
  }

  // Resolve image URLs
  const eventsWithImages: EventCardData[] = filteredEvents.map((event) => {
    let imageUrl: string | null = null
    if (event.primary_image_path) {
      const { data: urlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(event.primary_image_path)
      imageUrl = urlData.publicUrl
    }
    return { ...event, imageUrl }
  })

  const total =
    neighborhood || tagIds.length > 0 ? filteredEvents.length : (count ?? 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">
          Discover upcoming community events in the Seattle area.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchBar />
      </Suspense>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filter sidebar */}
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64 lg:self-start">
          <div className="rounded-lg border bg-card p-4">
            <Suspense fallback={null}>
              <FilterPanel
                availableTags={tags}
                availableNeighborhoods={neighborhoods}
              />
            </Suspense>
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} upcoming {total === 1 ? "event" : "events"} found
          </p>

          <EventList events={eventsWithImages} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {page > 1 && (
                <a
                  href={`?${new URLSearchParams({ ...stripUndefined(params), page: String(page - 1) }).toString()}`}
                  className="rounded border px-3 py-1 text-sm hover:bg-accent"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`?${new URLSearchParams({ ...stripUndefined(params), page: String(page + 1) }).toString()}`}
                  className="rounded border px-3 py-1 text-sm hover:bg-accent"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function stripUndefined(
  obj: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = value
    }
  }
  return result
}
