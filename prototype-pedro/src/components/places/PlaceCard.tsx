import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PlaceCardData } from "@/types"

interface PlaceCardProps {
  place: PlaceCardData
}

export function PlaceCard({ place }: PlaceCardProps) {
  const tags = place.place_tags?.map((pt) => pt.tags).slice(0, 3) ?? []

  return (
    <Link href={`/places/${place.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="line-clamp-1 text-lg">{place.name}</CardTitle>
          {place.neighborhood && (
            <p className="text-sm text-muted-foreground">
              {place.neighborhood}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {place.indoors && <Badge variant="secondary">Indoors</Badge>}
            {place.outdoors && <Badge variant="secondary">Outdoors</Badge>}
            {place.is_free && <Badge variant="outline">Free</Badge>}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag.id} variant="default" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {place.avg_rating != null && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="text-yellow-500">&#9733;</span>
              <span>{place.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
