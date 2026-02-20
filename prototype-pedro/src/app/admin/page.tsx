import { createServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function AdminOverviewPage() {
  const supabase = await createServerClient()

  // Fetch counts in parallel
  const [moderationRes, reportsRes, requestsRes] = await Promise.all([
    supabase
      .from("moderation_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("organizer_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ])

  const pendingModeration = moderationRes.count ?? 0
  const openReports = reportsRes.count ?? 0
  const pendingRequests = requestsRes.count ?? 0

  const stats = [
    {
      title: "Pending Moderation",
      value: pendingModeration,
      href: "/admin/moderation",
    },
    {
      title: "Open Reports",
      value: openReports,
      href: "/admin/reports",
    },
    {
      title: "Organizer Requests",
      value: pendingRequests,
      href: "/admin/organizer-requests",
    },
  ]

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Overview</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
