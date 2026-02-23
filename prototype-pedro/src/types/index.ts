import type { Database } from "@/lib/supabase/database.types"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Place = Database["public"]["Tables"]["places"]["Row"]
export type Event = Database["public"]["Tables"]["events"]["Row"]
export type Tag = Database["public"]["Tables"]["tags"]["Row"]
export type Review = Database["public"]["Tables"]["reviews"]["Row"]
export type Report = Database["public"]["Tables"]["reports"]["Row"]
export type ModerationQueueItem =
  Database["public"]["Tables"]["moderation_queue"]["Row"]
export type OrganizerRequest =
  Database["public"]["Tables"]["organizer_requests"]["Row"]

export type AppRole = Database["public"]["Enums"]["app_role"]
export type ContentStatus = Database["public"]["Enums"]["content_status"]

export type PlaceWithTags = Place & {
  place_tags: { tags: Tag }[]
}

export type PlaceCardData = Place & {
  place_tags: { tags: Tag }[]
  avg_rating?: number | null
}

export type EventCardData = Event & {
  event_tags: { tags: Tag }[]
  places: { name: string; neighborhood: string | null } | null
  imageUrl?: string | null
}

export type EventWithPlace = Event & {
  places: {
    id: string
    lat: number
    lng: number
    name: string
    neighborhood: string | null
  } | null
  event_tags: { tags: Tag }[]
}
