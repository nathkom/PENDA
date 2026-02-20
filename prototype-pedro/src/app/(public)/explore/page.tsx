import { createServerClient } from "@/lib/supabase/server"
import type { Place, Tag } from "@/types"
import { ExploreContent } from "./ExploreContent"

export const metadata = {
  title: "Explore — Seattle Third Spaces",
  description: "Discover third spaces on an interactive map of Seattle.",
}

type PlaceWithTags = Place & {
  place_tags: { tags: Tag }[]
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const neighborhood =
    typeof params.neighborhood === "string" ? params.neighborhood : ""
  const indoors = params.indoors === "true"
  const outdoors = params.outdoors === "true"
  const isFree = params.is_free === "true"

  const rawTag = params.tag
  const tagIds: string[] = Array.isArray(rawTag)
    ? rawTag
    : typeof rawTag === "string"
      ? [rawTag]
      : []

  const supabase = await createServerClient()

  // Fetch places, neighborhoods, and tags in parallel
  const [placesResult, neighborhoodsResult, tagsResult] = await Promise.all([
    (async () => {
      let query = supabase
        .from("places")
        .select("*, place_tags(tags(*))")
        .eq("status", "published" as const)
        .order("created_at", { ascending: false })

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

      return query
    })(),
    supabase
      .from("places")
      .select("neighborhood")
      .eq("status", "published" as const)
      .not("neighborhood", "is", null)
      .order("neighborhood", { ascending: true }),
    supabase.from("tags").select("*").order("name", { ascending: true }),
  ])

  if (placesResult.error) throw placesResult.error

  const allPlaces = (placesResult.data ?? []) as unknown as PlaceWithTags[]

  // Tag filtering in application code
  let places: Place[]
  if (tagIds.length > 0) {
    places = allPlaces.filter((place) =>
      place.place_tags.some((pt) => tagIds.includes(pt.tags?.id)),
    )
  } else {
    places = allPlaces
  }

  const neighborhoods = [
    ...new Set(
      (neighborhoodsResult.data ?? [])
        .map((r) => (r as { neighborhood: string }).neighborhood)
        .filter(Boolean),
    ),
  ]
  const tags = (tagsResult.data ?? []) as unknown as Tag[]

  return (
    <ExploreContent
      places={places}
      tags={tags}
      neighborhoods={neighborhoods}
    />
  )
}
