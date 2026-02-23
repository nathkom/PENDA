"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { MapFilterPanel, DEFAULT_EXPLORE_FILTERS } from "@/components/map/MapFilterPanel"
import type { ExploreFilters } from "@/components/map/MapFilterPanel"
import { Skeleton } from "@/components/ui/skeleton"
import type { PlaceWithTags, EventWithPlace, Tag } from "@/types"

const ExploreMap = dynamic(() => import("@/components/map/ExploreMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
})

interface ExploreContentProps {
  places: PlaceWithTags[]
  events: EventWithPlace[]
  tags: Tag[]
}

export function ExploreContent({ places, events, tags }: ExploreContentProps) {
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_EXPLORE_FILTERS)

  // Derive available neighborhoods from data; include the map-selected one even if no results
  const availableNeighborhoods = useMemo(() => {
    const fromData = [
      ...new Set(
        places
          .map((p) => p.neighborhood)
          .filter(Boolean) as string[],
      ),
    ].sort()
    if (filters.neighborhood && !fromData.includes(filters.neighborhood)) {
      return [...fromData, filters.neighborhood].sort()
    }
    return fromData
  }, [places, filters.neighborhood])

  const filteredPlaces = useMemo(() => {
    if (filters.contentType === "events") return []
    return places.filter((place) => {
      if (filters.neighborhood && place.neighborhood !== filters.neighborhood) return false
      if (filters.indoors && !place.indoors) return false
      if (filters.outdoors && !place.outdoors) return false
      if (filters.is_free && !place.is_free) return false
      if (
        filters.tagIds.length > 0 &&
        !place.place_tags.some((pt) => filters.tagIds.includes(pt.tags?.id))
      )
        return false
      return true
    })
  }, [places, filters])

  const filteredEvents = useMemo(() => {
    if (filters.contentType === "places") return []
    return events.filter((event) => {
      if (filters.neighborhood && event.places?.neighborhood !== filters.neighborhood) return false
      if (filters.indoors && !event.indoors) return false
      if (filters.outdoors && !event.outdoors) return false
      if (filters.is_free && !event.is_free) return false
      if (
        filters.tagIds.length > 0 &&
        !event.event_tags.some((et) => filters.tagIds.includes(et.tags?.id))
      )
        return false
      return true
    })
  }, [events, filters])

  function handleNeighborhoodClick(neighborhood: string) {
    setFilters((prev) => ({
      ...prev,
      neighborhood: prev.neighborhood === neighborhood ? "" : neighborhood,
    }))
  }

  const placeCount = filteredPlaces.length
  const eventCount = filteredEvents.length

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Filter sidebar */}
      <aside className="w-72 shrink-0 overflow-y-auto border-r bg-background p-4">
        <MapFilterPanel
          filters={filters}
          onChange={setFilters}
          tags={tags}
          availableNeighborhoods={availableNeighborhoods}
        />
        <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            {placeCount} place{placeCount !== 1 ? "s" : ""}
          </span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {eventCount} event{eventCount !== 1 ? "s" : ""}
          </span>
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1">
        <ExploreMap
          places={filteredPlaces}
          events={filteredEvents}
          selectedNeighborhood={filters.neighborhood}
          onNeighborhoodClick={handleNeighborhoodClick}
        />
      </div>
    </div>
  )
}
