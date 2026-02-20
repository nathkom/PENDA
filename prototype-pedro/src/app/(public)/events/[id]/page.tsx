import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ReviewList } from "@/components/reviews/ReviewList"
import { ReviewForm } from "@/components/reviews/ReviewForm"
import { formatDate, formatDateTime } from "@/lib/utils"
import type { Event, Tag } from "@/types"
import type { ReviewWithProfile } from "@/components/reviews/ReviewCard"

type EventWithTags = Event & {
  event_tags: { tags: Tag }[]
  places: { id: string; name: string; address: string } | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("events")
    .select("title, description")
    .eq("id", id)
    .eq("status", "published" as const)
    .single()

  const event = data as { title: string; description: string | null } | null

  if (!event) return { title: "Event Not Found" }

  return {
    title: `${event.title} — Seattle Third Spaces`,
    description: event.description ?? `Discover ${event.title} in Seattle.`,
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch event with tags and place info
  const { data: eventData, error } = await supabase
    .from("events")
    .select("*, event_tags(tags(*)), places(id, name, address)")
    .eq("id", id)
    .eq("status", "published" as const)
    .single()

  if (error || !eventData) notFound()

  const event = eventData as unknown as EventWithTags
  const tags = event.event_tags?.map((et) => et.tags) ?? []

  // Resolve image URL
  let imageUrl: string | null = null
  if (event.primary_image_path) {
    const { data: urlData } = supabase.storage
      .from("event-images")
      .getPublicUrl(event.primary_image_path)
    imageUrl = urlData.publicUrl
  }

  // Fetch reviews with author display_name
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, status, profiles(display_name)")
    .eq("event_id", id)
    .eq("status", "published" as const)
    .order("created_at", { ascending: false })

  const reviews = (reviewsData ?? []) as unknown as ReviewWithProfile[]

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  return (
    <div className="space-y-8">
      {/* Primary Image */}
      {imageUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
          />
        </div>
      )}

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{event.title}</h1>

        <p className="text-lg text-muted-foreground">
          {formatDateTime(event.starts_at)}
          {event.ends_at && ` — ${formatDateTime(event.ends_at)}`}
        </p>

        {event.places && (
          <p className="text-muted-foreground">
            at{" "}
            <Link
              href={`/places/${event.places.id}`}
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              {event.places.name}
            </Link>
            <span className="ml-1 text-sm">({event.places.address})</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {event.indoors && <Badge variant="secondary">Indoors</Badge>}
          {event.outdoors && <Badge variant="secondary">Outdoors</Badge>}
          {event.is_free && <Badge variant="outline">Free</Badge>}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag.id}>{tag.name}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div>
          <h2 className="text-xl font-semibold">About</h2>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">
            {event.description}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Added {formatDate(event.created_at)}
      </p>

      {/* Reviews */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <ReviewList reviews={reviews} averageRating={avgRating} />
        <ReviewForm targetType="event" targetId={id} />
      </div>
    </div>
  )
}
