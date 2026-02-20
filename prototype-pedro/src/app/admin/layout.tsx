import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import type { AppRole } from "@/types"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role: AppRole } | null)?.role
  if (role !== "admin") {
    redirect("/")
  }

  const navItems = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/moderation", label: "Moderation" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/tags", label: "Tags" },
    { href: "/admin/organizer-requests", label: "Organizer Requests" },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
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
        </nav>
      </div>
      {children}
    </div>
  )
}
