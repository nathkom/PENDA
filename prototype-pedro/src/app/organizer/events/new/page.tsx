import { createServerClient } from "@/lib/supabase/server"
import { EventForm } from "@/components/events/EventForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Place } from "@/types"

export default async function NewEventPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch organizer's published places
  const { data } = await supabase
    .from("places")
    .select("*")
    .eq("created_by", user.id)
    .eq("status", "published" as const)
    .order("name")

  const places = (data ?? []) as Place[]

  if (places.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="text-xl font-semibold">Create New Event</h2>
        <Alert>
          <AlertDescription>
            You need at least one published place before creating an event.
            Events are always tied to a place.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Create New Event</h2>
      <EventForm availablePlaces={places} />
    </div>
  )
}
