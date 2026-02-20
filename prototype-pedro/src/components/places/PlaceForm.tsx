"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createBrowserClient } from "@/lib/supabase/client"
import { PlaceSchema, type PlaceFormValues } from "@/lib/validations/place"
import { createPlace, updatePlace, submitPlaceForReview } from "@/actions/places"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Loader2 } from "lucide-react"
import type { Place, Tag } from "@/types"

type ActionResult = { data: Place | null; error: string | null }

interface PlaceFormProps {
  initialData?: Place & { place_tags: { tags: Tag }[] }
  onSuccess?: (place: Place) => void
}

export function PlaceForm({ initialData, onSuccess }: PlaceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])

  const isEditing = !!initialData

  const form = useForm<PlaceFormValues>({
    resolver: zodResolver(PlaceSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      address: initialData?.address ?? "",
      neighborhood: initialData?.neighborhood ?? "",
      zip: initialData?.zip ?? "",
      lat: initialData?.lat ?? 47.6062,
      lng: initialData?.lng ?? -122.3321,
      indoors: initialData?.indoors ?? false,
      outdoors: initialData?.outdoors ?? false,
      is_free: initialData?.is_free ?? undefined,
      tags: initialData?.place_tags?.map((pt) => pt.tags.id) ?? [],
    },
  })

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase
      .from("tags")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setAvailableTags(data)
      })
  }, [])

  function handleSaveDraft() {
    form.handleSubmit((data) => {
      startTransition(async () => {
        if (isEditing) {
          const result = (await updatePlace(initialData.id, data)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
          toast({ title: "Place updated" })
          if (result.data && onSuccess) onSuccess(result.data)
          router.refresh()
        } else {
          const result = (await createPlace(data)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
          toast({ title: "Place saved as draft" })
          if (result.data && onSuccess) onSuccess(result.data)
          else if (result.data) router.push(`/organizer/places/${result.data.id}/edit`)
        }
      })
    })()
  }

  function handleSubmitForReview() {
    form.handleSubmit((data) => {
      startTransition(async () => {
        let placeId = initialData?.id

        if (isEditing) {
          const result = (await updatePlace(initialData.id, data)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
        } else {
          const result = (await createPlace(data)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
          placeId = result.data?.id
        }

        if (!placeId) {
          toast({ title: "Failed to get place ID", variant: "destructive" })
          return
        }

        const submitResult = await submitPlaceForReview(placeId)
        if (submitResult.error) {
          toast({ title: submitResult.error, variant: "destructive" })
          return
        }

        toast({ title: "Place submitted for review!" })
        router.push("/organizer/places")
      })
    })()
  }

  const selectedTags = form.watch("tags") ?? []

  function toggleTag(tagId: string) {
    const current = form.getValues("tags") ?? []
    if (current.includes(tagId)) {
      form.setValue(
        "tags",
        current.filter((t) => t !== tagId),
      )
    } else {
      form.setValue("tags", [...current, tagId])
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Café Allegro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell people about this place..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, Seattle, WA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Neighborhood</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Capitol Hill" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code</FormLabel>
                <FormControl>
                  <Input placeholder="98101" maxLength={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lng"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormLabel>Setting *</FormLabel>
          <div className="flex gap-6">
            <FormField
              control={form.control}
              name="indoors"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Indoors</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outdoors"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Outdoors</FormLabel>
                </FormItem>
              )}
            />
          </div>
          {form.formState.errors.indoors && (
            <p className="text-[0.8rem] font-medium text-destructive">
              {form.formState.errors.indoors.message}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="is_free"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">Free to visit</FormLabel>
            </FormItem>
          )}
        />

        {availableTags.length > 0 && (
          <div className="space-y-2">
            <FormLabel>Tags</FormLabel>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleSaveDraft}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isEditing ? "Save Changes" : "Save as Draft"}
          </Button>

          <Button
            type="button"
            disabled={isPending}
            onClick={handleSubmitForReview}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Submit for Review
          </Button>
        </div>
      </form>
    </Form>
  )
}
