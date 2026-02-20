"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createBrowserClient } from "@/lib/supabase/client"
import { EventSchema, type EventFormValues } from "@/lib/validations/event"
import { createEvent, updateEvent, submitEventForReview } from "@/actions/events"
import { useToast } from "@/hooks/use-toast"
import EventImageUpload from "@/components/events/EventImageUpload"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { Event, Place, Tag } from "@/types"

type ActionResult = { data: Event | null; error: string | null }

interface EventFormProps {
  initialData?: Event & { event_tags: { tags: Tag }[] }
  availablePlaces: Place[]
  onSuccess?: (event: Event) => void
}

export function EventForm({ initialData, availablePlaces, onSuccess }: EventFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [savedEventId, setSavedEventId] = useState<string | null>(initialData?.id ?? null)

  const isEditing = !!initialData

  function toLocalDateTimeString(isoString: string) {
    const d = new Date(isoString)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const form = useForm<EventFormValues>({
    resolver: zodResolver(EventSchema),
    defaultValues: {
      place_id: initialData?.place_id ?? "",
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      starts_at: initialData?.starts_at ? toLocalDateTimeString(initialData.starts_at) : "",
      ends_at: initialData?.ends_at ? toLocalDateTimeString(initialData.ends_at) : "",
      is_free: initialData?.is_free ?? undefined,
      indoors: initialData?.indoors ?? false,
      outdoors: initialData?.outdoors ?? false,
      primary_image_path: initialData?.primary_image_path ?? "",
      tags: initialData?.event_tags?.map((et) => et.tags.id) ?? [],
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
        // Convert local datetime to ISO
        const payload = {
          ...data,
          starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : data.starts_at,
          ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : data.ends_at,
        }

        if (isEditing) {
          const result = (await updateEvent(initialData.id, payload)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
          toast({ title: "Event updated" })
          if (result.data && onSuccess) onSuccess(result.data)
          router.refresh()
        } else {
          const result = (await createEvent(payload)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
          toast({ title: "Event saved as draft" })
          if (result.data) {
            setSavedEventId(result.data.id)
            if (onSuccess) onSuccess(result.data)
            else router.push(`/organizer/events/${result.data.id}/edit`)
          }
        }
      })
    })()
  }

  function handleSubmitForReview() {
    form.handleSubmit((data) => {
      startTransition(async () => {
        const imagePath = data.primary_image_path
        if (!imagePath) {
          toast({
            title: "An image is required before submitting for review",
            variant: "destructive",
          })
          return
        }

        const payload = {
          ...data,
          starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : data.starts_at,
          ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : data.ends_at,
        }

        let eventId = savedEventId

        if (isEditing) {
          const result = (await updateEvent(initialData.id, payload)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
          eventId = initialData.id
        } else {
          const result = (await createEvent(payload)) as ActionResult
          if (result.error) {
            toast({ title: result.error, variant: "destructive" })
            return
          }
          eventId = result.data?.id ?? null
        }

        if (!eventId) {
          toast({ title: "Failed to get event ID", variant: "destructive" })
          return
        }

        const submitResult = await submitEventForReview(eventId)
        if (submitResult.error) {
          toast({ title: submitResult.error, variant: "destructive" })
          return
        }

        toast({ title: "Event submitted for review!" })
        router.push("/organizer/events")
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

  const eventIdForUpload = savedEventId ?? "temp"

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="place_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Place *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a place" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availablePlaces.map((place) => (
                    <SelectItem key={place.id} value={place.id}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Open Mic Night" {...field} />
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
                  placeholder="What's this event about?"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="starts_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date/Time *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ends_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date/Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
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
              <FormLabel className="font-normal">Free event</FormLabel>
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Event Image *</FormLabel>
          <EventImageUpload
            eventId={eventIdForUpload}
            currentPath={initialData?.primary_image_path ?? null}
            onUploadComplete={(path) => {
              form.setValue("primary_image_path", path)
            }}
          />
          {form.formState.errors.primary_image_path && (
            <p className="text-[0.8rem] font-medium text-destructive">
              {form.formState.errors.primary_image_path.message}
            </p>
          )}
        </div>

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
