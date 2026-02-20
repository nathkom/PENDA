import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { PlaceForm } from "@/components/places/PlaceForm"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Place, Tag } from "@/types"

type PlaceWithTags = Place & {
  place_tags: { tags: Tag }[]
}

export default async function EditPlacePage({
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
    .from("places")
    .select("*, place_tags(tags(*))")
    .eq("id", id)
    .single()

  if (error || !data) notFound()

  const place = data as unknown as PlaceWithTags

  // Verify ownership
  if (place.created_by !== user.id) {
    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = (profile as { role: string } | null)?.role
    if (role !== "admin") notFound()
  }

  // If not draft/pending, show read-only view
  if (!["draft", "pending"].includes(place.status)) {
    const tags = place.place_tags?.map((pt) => pt.tags) ?? []

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{place.name}</h2>
          <Badge
            variant={
              place.status === "published"
                ? "default"
                : place.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {place.status}
          </Badge>
        </div>

        <Alert>
          <AlertTitle>Editing disabled</AlertTitle>
          <AlertDescription>
            This place has status &quot;{place.status}&quot; and cannot be
            edited. Only draft or pending places can be modified.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 rounded-lg border p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Address</p>
            <p>{place.address}</p>
          </div>
          {place.neighborhood && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Neighborhood
              </p>
              <p>{place.neighborhood}</p>
            </div>
          )}
          {place.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-line">{place.description}</p>
            </div>
          )}
          <div className="flex gap-2">
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
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Edit Place</h2>
      <PlaceForm initialData={place} />
    </div>
  )
}
