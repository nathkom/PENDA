import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function OrganizerDashboard() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch place counts by status
  const { data: placesData } = await supabase
    .from("places")
    .select("status")
    .eq("created_by", user.id)

  const places = (placesData ?? []) as { status: string }[]
  const placeCounts = {
    draft: places.filter((p) => p.status === "draft").length,
    pending: places.filter((p) => p.status === "pending").length,
    published: places.filter((p) => p.status === "published").length,
    rejected: places.filter((p) => p.status === "rejected").length,
  }

  // Fetch event counts
  const { data: eventsData } = await supabase
    .from("events")
    .select("status, starts_at")
    .eq("created_by", user.id)

  const events = (eventsData ?? []) as { status: string; starts_at: string }[]
  const upcomingEvents = events.filter(
    (e) => e.status === "published" && new Date(e.starts_at) > new Date(),
  ).length

  const eventCounts = {
    draft: events.filter((e) => e.status === "draft").length,
    pending: events.filter((e) => e.status === "pending").length,
    published: events.filter((e) => e.status === "published").length,
  }

  // Fetch pending moderation queue entries for this user
  const { data: queueData } = await supabase
    .from("moderation_queue")
    .select("id")
    .eq("submitted_by", user.id)
    .eq("status", "pending")

  const pendingQueueCount = queueData?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/organizer/places/new">New Place</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/organizer/events/new">New Event</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft Places
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{placeCounts.draft}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingQueueCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published Places
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{placeCounts.published}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcomingEvents}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Places Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-medium">{placeCounts.draft}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium">{placeCounts.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Published</span>
              <span className="font-medium">{placeCounts.published}</span>
            </div>
            {placeCounts.rejected > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rejected</span>
                <span className="font-medium text-destructive">
                  {placeCounts.rejected}
                </span>
              </div>
            )}
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href="/organizer/places">View all places</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-medium">{eventCounts.draft}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium">{eventCounts.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Published</span>
              <span className="font-medium">{eventCounts.published}</span>
            </div>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href="/organizer/events">View all events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
