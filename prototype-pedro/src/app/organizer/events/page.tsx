import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import type { Event } from "@/types"

type EventWithPlace = Event & {
  places: { name: string } | null
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  pending: "outline",
  published: "default",
  hidden: "secondary",
  rejected: "destructive",
}

export default async function OrganizerEventsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("events")
    .select("*, places(name)")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false })

  const events = (data ?? []) as unknown as EventWithPlace[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Events</h2>
        <Button asChild size="sm">
          <Link href="/organizer/events/new">New Event</Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>You haven&apos;t created any events yet.</p>
            <Button asChild variant="link">
              <Link href="/organizer/events/new">Create your first event</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{event.title}</h3>
                    <Badge variant={statusVariant[event.status] ?? "secondary"}>
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.places?.name ?? "Unknown place"}
                    {" · "}
                    {formatDateTime(event.starts_at)}
                  </p>
                  {!event.primary_image_path && (
                    <p className="text-xs text-destructive">Missing image</p>
                  )}
                </div>
                <div className="ml-4 flex gap-2">
                  {["draft", "pending"].includes(event.status) ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/organizer/events/${event.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/organizer/events/${event.id}/edit`}>
                        View
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
