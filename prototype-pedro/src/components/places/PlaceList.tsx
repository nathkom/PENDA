import { PlaceCard } from "@/components/places/PlaceCard"
import type { PlaceCardData } from "@/types"

interface PlaceListProps {
  places: PlaceCardData[]
}

export function PlaceList({ places }: PlaceListProps) {
  if (places.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-muted-foreground">No places found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((place) => (
        <PlaceCard key={place.id} place={place} />
      ))}
    </div>
  )
}
