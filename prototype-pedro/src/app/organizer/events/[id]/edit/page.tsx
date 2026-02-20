import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { EventForm } from "@/components/events/EventForm"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDateTime } from "@/lib/utils"
import type { Event, Place, Tag } from "@/types"

type EventWithTags = Event & {
  event_tags: { tags: Tag }[]
  places: { name: string } | null
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  const { data, error } = await supabase
    .from("events")
    .select("*, event_tags(tags(*)), places(name)")
    .eq("id", id)
    .single()

  if (error || !data) notFound()

  const event = data as unknown as EventWithTags

  // Verify ownership
  if (event.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = (profile as { role: string } | null)?.role
    if (role !== "admin") notFound()
  }

  // If not draft/pending, show read-only view
  if (!["draft", "pending"].includes(event.status)) {
    const tags = event.event_tags?.map((et) => et.tags) ?? []

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{event.title}</h2>
          <Badge
            variant={
              event.status === "published"
                ? "default"
                : event.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {event.status}
          </Badge>
        </div>

        <Alert>
          <AlertTitle>Editing disabled</AlertTitle>
          <AlertDescription>
            This event has status &quot;{event.status}&quot; and cannot be
            edited. Only draft or pending events can be modified.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 rounded-lg border p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Place</p>
            <p>{event.places?.name ?? "Unknown"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Start Time
            </p>
            <p>{formatDateTime(event.starts_at)}</p>
          </div>
          {event.ends_at && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                End Time
              </p>
              <p>{formatDateTime(event.ends_at)}</p>
            </div>
          )}
          {event.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          )}
          <div className="flex gap-2">
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
      </div>
    )
  }

  // Fetch organizer's published places for the form dropdown
  const { data: placesData } = await supabase
    .from("places")
    .select("*")
    .eq("created_by", user.id)
    .eq("status", "published" as const)
    .order("name")

  const places = (placesData ?? []) as Place[]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Edit Event</h2>
      <EventForm initialData={event} availablePlaces={places} />
    </div>
  )
}
