"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { FilterPanel } from "@/components/search/FilterPanel"
import { Skeleton } from "@/components/ui/skeleton"
import type { Place, Tag } from "@/types"

const ExploreMap = dynamic(
  () => import("@/components/map/ExploreMap"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
)

interface ExploreContentProps {
  places: Place[]
  tags: Tag[]
  neighborhoods: string[]
}

export function ExploreContent({
  places,
  tags,
  neighborhoods,
}: ExploreContentProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Filter sidebar */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r bg-background p-4">
        <Suspense fallback={null}>
          <FilterPanel
            availableTags={tags}
            availableNeighborhoods={neighborhoods}
          />
        </Suspense>
        <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          {places.length} place{places.length !== 1 ? "s" : ""} shown
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1">
        <ExploreMap places={places} />
      </div>
    </div>
  )
}
