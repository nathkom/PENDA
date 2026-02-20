"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { approveSubmission, rejectSubmission } from "@/actions/moderation"
import { formatRelativeTime } from "@/lib/utils"

export type ModerationItem = {
  id: string
  item_type: string
  item_id: string
  action: string
  status: string
  created_at: string
  submitted_by: string
  item_name: string
  submitter_name: string
}

export default function ModerationQueueTable({
  items,
}: {
  items: ModerationItem[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingItem, setRejectingItem] = useState<ModerationItem | null>(null)
  const [rejectNote, setRejectNote] = useState("")

  async function handleApprove(item: ModerationItem) {
    setLoading(item.id)
    const result = (await approveSubmission(item.id)) as {
      data: unknown
      error: string | null
    }
    setLoading(null)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Approved", description: `${item.item_name} has been published.` })
      router.refresh()
    }
  }

  function openRejectDialog(item: ModerationItem) {
    setRejectingItem(item)
    setRejectNote("")
    setRejectDialogOpen(true)
  }

  async function handleReject() {
    if (!rejectingItem || !rejectNote.trim()) return

    setLoading(rejectingItem.id)
    const result = (await rejectSubmission(rejectingItem.id, rejectNote.trim())) as {
      data: unknown
      error: string | null
    }
    setLoading(null)
    setRejectDialogOpen(false)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({
        title: "Rejected",
        description: `${rejectingItem.item_name} has been rejected.`,
      })
      router.refresh()
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending submissions.</p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Submitted By</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Badge variant="outline">{item.item_type}</Badge>
              </TableCell>
              <TableCell className="font-medium">{item.item_name}</TableCell>
              <TableCell>{item.submitter_name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.action}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatRelativeTime(item.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(item)}
                    disabled={loading === item.id}
                  >
                    {loading === item.id ? "..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openRejectDialog(item)}
                    disabled={loading === item.id}
                  >
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting &quot;{rejectingItem?.item_name}&quot;.
              This note will be sent to the organizer via email.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectNote.trim() || loading === rejectingItem?.id}
            >
              {loading === rejectingItem?.id ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
