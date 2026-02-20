"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/hooks/useUser"
import { createReview } from "@/actions/reviews"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ReviewFormProps {
  targetType: "place" | "event"
  targetId: string
}

export function ReviewForm({ targetType, targetId }: ReviewFormProps) {
  const { user, isLoading } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [body, setBody] = useState("")

  if (isLoading) return null

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link
          href="/auth/sign-in"
          className="font-medium underline underline-offset-4 hover:text-foreground"
        >
          Sign in
        </Link>{" "}
        to leave a review.
      </p>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" })
      return
    }

    startTransition(async () => {
      const result = await createReview({
        target_type: targetType,
        target_id: targetId,
        rating,
        body: body.trim() || undefined,
      })

      if (result.error) {
        toast({ title: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Review submitted!" })
      setRating(0)
      setBody("")
      router.refresh()
    })
  }

  const displayRating = hovered || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Write a review</h3>

      {/* Star rating selector */}
      <div className="space-y-1">
        <Label>Rating</Label>
        <div className="flex gap-1" role="group" aria-label="Select star rating">
          {Array.from({ length: 5 }, (_, i) => {
            const value = i + 1
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value !== 1 ? "s" : ""}`}
                className={`text-2xl transition-colors ${
                  value <= displayRating
                    ? "text-yellow-500"
                    : "text-muted-foreground/30 hover:text-yellow-400"
                }`}
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(value)}
              >
                &#9733;
              </button>
            )
          })}
        </div>
      </div>

      {/* Body textarea */}
      <div className="space-y-1">
        <Label htmlFor="review-body">Review (optional)</Label>
        <Textarea
          id="review-body"
          placeholder="Share your experience…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {body.length}/1000
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  )
}
