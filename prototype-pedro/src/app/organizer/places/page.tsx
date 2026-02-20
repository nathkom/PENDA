import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { Place } from "@/types"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  pending: "outline",
  published: "default",
  hidden: "secondary",
  rejected: "destructive",
}

export default async function OrganizerPlacesPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("places")
    .select("*")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false })

  const places = (data ?? []) as Place[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Places</h2>
        <Button asChild size="sm">
          <Link href="/organizer/places/new">New Place</Link>
        </Button>
      </div>

      {places.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>You haven&apos;t created any places yet.</p>
            <Button asChild variant="link">
              <Link href="/organizer/places/new">Create your first place</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {places.map((place) => (
            <Card key={place.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{place.name}</h3>
                    <Badge variant={statusVariant[place.status] ?? "secondary"}>
                      {place.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {place.address}
                    {place.neighborhood && ` · ${place.neighborhood}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(place.updated_at)}
                  </p>
                </div>
                <div className="ml-4 flex gap-2">
                  {["draft", "pending"].includes(place.status) ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/organizer/places/${place.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/organizer/places/${place.id}/edit`}>
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
