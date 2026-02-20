"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { requestOrganizerRole } from "@/actions/organizer-requests"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function OrganizerRequestForm() {
  const { user, role, isLoading } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (isLoading) return null

  // Only show to authenticated members
  if (!user || role !== "member") return null

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
        <h3 className="text-sm font-semibold">Request submitted!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll review your request and notify you by email.
        </p>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const result = await requestOrganizerRole(
        message.trim() || undefined
      )

      if (result.error) {
        toast({ title: result.error, variant: "destructive" })
        return
      }

      setSubmitted(true)
      toast({ title: "Organizer request submitted!" })
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Become an Organizer</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Organizers can create and manage places and events. Submit a request
          and an admin will review it.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="organizer-message">
          Why would you like to become an organizer? (optional)
        </Label>
        <Textarea
          id="organizer-message"
          placeholder="Tell us about the spaces or events you'd like to share…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
        />
        <p className="text-right text-xs text-muted-foreground">
          {message.length}/500
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting…" : "Request Organizer Access"}
      </Button>
    </form>
  )
}
