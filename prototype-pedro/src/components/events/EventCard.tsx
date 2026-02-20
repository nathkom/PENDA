import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import type { EventCardData } from "@/types"

interface EventCardProps {
  event: EventCardData
}

export function EventCard({ event }: EventCardProps) {
  const tags = event.event_tags?.map((et) => et.tags).slice(0, 3) ?? []
  const placeName = event.places?.name ?? null

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        {event.imageUrl && (
          <div className="relative aspect-[16/9] w-full">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        )}
        <CardHeader className="pb-3">
          <CardTitle className="line-clamp-1 text-lg">{event.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(event.starts_at)}
          </p>
          {placeName && (
            <p className="text-sm text-muted-foreground">{placeName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {event.indoors && <Badge variant="secondary">Indoors</Badge>}
            {event.outdoors && <Badge variant="secondary">Outdoors</Badge>}
            {event.is_free && <Badge variant="outline">Free</Badge>}
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
        </CardContent>
      </Card>
    </Link>
  )
}
