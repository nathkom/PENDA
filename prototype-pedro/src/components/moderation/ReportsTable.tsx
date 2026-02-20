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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { triageReport, closeReport } from "@/actions/moderation"
import { formatRelativeTime } from "@/lib/utils"

export type ReportItem = {
  id: string
  target_type: string
  target_name: string
  reporter_name: string
  reason: string
  details: string | null
  status: string
  created_at: string
}

export default function ReportsTable({
  reports,
}: {
  reports: ReportItem[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closingReport, setClosingReport] = useState<ReportItem | null>(null)
  const [hideContent, setHideContent] = useState(false)

  async function handleTriage(report: ReportItem) {
    setLoading(report.id)
    const result = (await triageReport(report.id)) as {
      data: unknown
      error: string | null
    }
    setLoading(null)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Triaged", description: "Report has been triaged." })
      router.refresh()
    }
  }

  function openCloseDialog(report: ReportItem) {
    setClosingReport(report)
    setHideContent(false)
    setCloseDialogOpen(true)
  }

  async function handleClose() {
    if (!closingReport) return

    setLoading(closingReport.id)
    const result = (await closeReport(closingReport.id, hideContent)) as {
      data: unknown
      error: string | null
    }
    setLoading(null)
    setCloseDialogOpen(false)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({
        title: "Closed",
        description: hideContent
          ? "Report closed and content hidden."
          : "Report closed.",
      })
      router.refresh()
    }
  }

  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No open reports.</p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Target</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Reporter</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Reported</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>
                <Badge variant="outline">{report.target_type}</Badge>
              </TableCell>
              <TableCell className="font-medium">{report.target_name}</TableCell>
              <TableCell>{report.reporter_name}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {report.reason.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {report.details || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatRelativeTime(report.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {report.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTriage(report)}
                      disabled={loading === report.id}
                    >
                      {loading === report.id ? "..." : "Triage"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openCloseDialog(report)}
                    disabled={loading === report.id}
                  >
                    Close
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Report</DialogTitle>
            <DialogDescription>
              Close the report for &quot;{closingReport?.target_name}&quot;.
              You can optionally hide the reported content.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hide-content"
              checked={hideContent}
              onCheckedChange={(checked) => setHideContent(checked === true)}
            />
            <label
              htmlFor="hide-content"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Also hide the reported {closingReport?.target_type}
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={loading === closingReport?.id}
            >
              {loading === closingReport?.id ? "Closing..." : "Close Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
