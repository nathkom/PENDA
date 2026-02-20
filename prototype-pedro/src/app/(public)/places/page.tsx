import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import { PlaceList } from "@/components/places/PlaceList"
import { SearchBar } from "@/components/search/SearchBar"
import { FilterPanel } from "@/components/search/FilterPanel"
import type { PlaceCardData, Tag } from "@/types"

const PAGE_SIZE = 20

type PlaceRow = PlaceCardData & {
  place_tags: { tags: Tag }[]
}

export const metadata = {
  title: "Places — Seattle Third Spaces",
  description: "Browse community third spaces in the Seattle area.",
}

export default async function PlacesPage({
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

  // Fetch neighborhoods + tags in parallel with main query
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
    .from("places")
    .select("*, place_tags(tags(*))", { count: "exact" })
    .eq("status", "published" as const)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (q) {
    query = query.textSearch("name", q, {
      type: "websearch",
      config: "english",
    })
  }

  if (neighborhood) {
    query = query.eq("neighborhood", neighborhood)
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

  const places = (data ?? []) as unknown as PlaceRow[]

  // Tag filtering: applied in application code
  // (Supabase doesn't support filtering parent rows by nested join values)
  let filteredPlaces: PlaceRow[] = places
  if (tagIds.length > 0) {
    filteredPlaces = filteredPlaces.filter((place) =>
      place.place_tags.some((pt) => tagIds.includes(pt.tags?.id)),
    )
  }

  const total = tagIds.length > 0 ? filteredPlaces.length : (count ?? 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Places</h1>
        <p className="text-muted-foreground">
          Browse community third spaces in the Seattle area.
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
            {total} {total === 1 ? "place" : "places"} found
          </p>

          <PlaceList places={filteredPlaces} />

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
