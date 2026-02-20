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
import { useToast } from "@/hooks/use-toast"
import {
  approveOrganizerRequest,
  rejectOrganizerRequest,
} from "@/actions/organizer-requests"
import { formatRelativeTime } from "@/lib/utils"
import type { OrganizerRequestItem } from "./page"

export default function OrganizerRequestsList({
  items,
}: {
  items: OrganizerRequestItem[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleApprove(item: OrganizerRequestItem) {
    setLoading(item.id)
    const result = (await approveOrganizerRequest(item.id)) as {
      data: unknown
      error: string | null
    }
    setLoading(null)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({
        title: "Approved",
        description: `${item.display_name} is now an organizer.`,
      })
      router.refresh()
    }
  }

  async function handleReject(item: OrganizerRequestItem) {
    setLoading(item.id)
    const result = (await rejectOrganizerRequest(item.id)) as {
      data: unknown
      error: string | null
    }
    setLoading(null)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({
        title: "Rejected",
        description: `Request from ${item.display_name} has been rejected.`,
      })
      router.refresh()
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending organizer requests.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Requester</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.display_name}</TableCell>
            <TableCell className="max-w-[300px] text-muted-foreground">
              {item.message || "No message provided"}
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
                  onClick={() => handleReject(item)}
                  disabled={loading === item.id}
                >
                  {loading === item.id ? "..." : "Reject"}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
