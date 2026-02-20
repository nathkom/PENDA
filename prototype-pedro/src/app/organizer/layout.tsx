import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import type { AppRole } from "@/types"

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role: AppRole } | null)?.role
  if (!role || !["organizer", "admin"].includes(role)) {
    redirect("/")
  }

  const navItems = [
    { href: "/organizer", label: "Dashboard" },
    { href: "/organizer/places", label: "My Places" },
    { href: "/organizer/events", label: "My Events" },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Organizer Portal</h1>
        <nav className="mt-4 flex gap-4 border-b pb-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {role === "admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin Panel
            </Link>
          )}
        </nav>
      </div>
      {children}
    </div>
  )
}
