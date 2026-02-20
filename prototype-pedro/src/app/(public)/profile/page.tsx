import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OrganizerRequestForm } from "@/components/auth/OrganizerRequestForm"
import type { AppRole, OrganizerRequest } from "@/types"

// Placement: OrganizerRequestForm is shown here for members.
// Members see the request form; organizers see a link to /organizer; admins see links to both.

export default async function ProfilePage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const role = (profile as { role: AppRole } | null)?.role ?? "member"

  // Check for existing organizer request
  const { data: pendingRequest } = await supabase
    .from("organizer_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const request = pendingRequest as OrganizerRequest | null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Display Name</span>
            <span className="font-medium">
              {(profile as { display_name: string } | null)?.display_name ??
                "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">{role}</span>
          </div>
        </CardContent>
      </Card>

      {role === "member" && (
        <div className="space-y-4">
          {request?.status === "pending" ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Your organizer request is pending review. We&apos;ll notify
                  you by email once a decision is made.
                </p>
              </CardContent>
            </Card>
          ) : request?.status === "rejected" ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Your previous organizer request was not approved. You may
                    submit a new request.
                  </p>
                </CardContent>
              </Card>
              <OrganizerRequestForm />
            </div>
          ) : (
            <OrganizerRequestForm />
          )}
        </div>
      )}

      {(role === "organizer" || role === "admin") && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Button asChild>
              <Link href="/organizer">Organizer Dashboard</Link>
            </Button>
            {role === "admin" && (
              <Button asChild variant="outline">
                <Link href="/admin">Admin Panel</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
