import { createServerClient } from "@/lib/supabase/server"
import OrganizerRequestsList from "./OrganizerRequestsList"

export type OrganizerRequestItem = {
  id: string
  user_id: string
  display_name: string
  email: string
  message: string | null
  created_at: string
}

export default async function OrganizerRequestsPage() {
  const supabase = await createServerClient()

  const { data: requestsData } = await supabase
    .from("organizer_requests")
    .select("*, profiles!organizer_requests_user_id_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  const raw = (requestsData ?? []) as Array<{
    id: string
    user_id: string
    message: string | null
    created_at: string
    profiles: { display_name: string } | null
  }>

  // Fetch user emails via auth admin — but we can't do that from client.
  // Instead, we'll show user_id or profile display name. Email can be fetched
  // only with the admin client, which we don't want in a page component.
  // For simplicity, we show display name and user_id.
  const items: OrganizerRequestItem[] = raw.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    display_name: r.profiles?.display_name ?? "Unknown",
    email: "", // emails are fetched by the server action if needed
    message: r.message,
    created_at: r.created_at,
  }))

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Organizer Requests</h2>
      <OrganizerRequestsList items={items} />
    </div>
  )
}
