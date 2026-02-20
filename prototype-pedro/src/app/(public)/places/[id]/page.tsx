import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ReviewList } from "@/components/reviews/ReviewList"
import { ReviewForm } from "@/components/reviews/ReviewForm"
import { formatDate } from "@/lib/utils"
import { PlaceMapSnippetLazy } from "@/components/places/PlaceMapSnippetLazy"
import type { Place, Tag, Event } from "@/types"
import type { ReviewWithProfile } from "@/components/reviews/ReviewCard"

type PlaceWithTags = Place & {
  place_tags: { tags: Tag }[]
}

type UpcomingEvent = Pick<
  Event,
  "id" | "title" | "starts_at" | "ends_at" | "is_free"
>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("places")
    .select("name, description")
    .eq("id", id)
    .eq("status", "published" as const)
    .single()

  const place = data as { name: string; description: string | null } | null

  if (!place) return { title: "Place Not Found" }

  return {
    title: `${place.name} — Seattle Third Spaces`,
    description: place.description ?? `Discover ${place.name} in Seattle.`,
  }
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch place with tags
  const { data: placeData, error } = await supabase
    .from("places")
    .select("*, place_tags(tags(*))")
    .eq("id", id)
    .eq("status", "published" as const)
    .single()

  if (error || !placeData) notFound()

  const place = placeData as unknown as PlaceWithTags
  const tags = place.place_tags?.map((pt) => pt.tags) ?? []

  // Fetch upcoming events at this place
  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, is_free")
    .eq("place_id", id)
    .eq("status", "published" as const)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(5)

  const upcomingEvents = (eventsData ?? []) as unknown as UpcomingEvent[]

  // Fetch reviews with author display_name
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, status, profiles(display_name)")
    .eq("place_id", id)
    .eq("status", "published" as const)
    .order("created_at", { ascending: false })

  const reviews = (reviewsData ?? []) as unknown as ReviewWithProfile[]

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{place.name}</h1>
        {place.neighborhood && (
          <p className="text-lg text-muted-foreground">
            {place.neighborhood}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {place.indoors && <Badge variant="secondary">Indoors</Badge>}
          {place.outdoors && <Badge variant="secondary">Outdoors</Badge>}
          {place.is_free && <Badge variant="outline">Free</Badge>}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag.id}>{tag.name}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-4">
        {place.description && (
          <div>
            <h2 className="text-xl font-semibold">About</h2>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">
              {place.description}
            </p>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold">Address</h2>
          <p className="mt-1 text-muted-foreground">
            {place.address}
            {place.zip && `, ${place.zip}`}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Added {formatDate(place.created_at)}
        </p>
      </div>

      {/* Map snippet */}
      <PlaceMapSnippetLazy lat={place.lat} lng={place.lng} name={place.name} />

      {/* Upcoming Events */}
      <div>
        <h2 className="text-xl font-semibold">Upcoming Events</h2>
        {upcomingEvents.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <a
                  href={`/events/${event.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.starts_at)}
                    {event.is_free && " · Free"}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No upcoming events at this place.
          </p>
        )}
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <ReviewList reviews={reviews} averageRating={avgRating} />
        <ReviewForm targetType="place" targetId={id} />
      </div>
    </div>
  )
}
