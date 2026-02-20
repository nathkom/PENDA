"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import type { AppRole, Tag } from "@/types"

async function getAuthenticatedAdmin(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role: AppRole } | null)?.role
  if (role !== "admin") return null
  return { user, role }
}

export async function createTag(data: { name: string; kind: "theme" | "category" }) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedAdmin(supabase)

  if (!auth) {
    return { data: null, error: "Admin access required" }
  }

  if (!data.name || data.name.trim().length === 0) {
    return { data: null, error: "Tag name is required" }
  }

  if (!["theme", "category"].includes(data.kind)) {
    return { data: null, error: "Tag kind must be 'theme' or 'category'" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tag, error } = await (supabase.from("tags") as any)
    .insert({
      name: data.name.trim(),
      kind: data.kind,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "A tag with this name already exists" }
    }
    return { data: null, error: error.message }
  }

  revalidatePath("/admin/tags")
  return { data: tag as Tag, error: null }
}

export async function deleteTag(tagId: string) {
  const supabase = await createServerClient()
  const auth = await getAuthenticatedAdmin(supabase)

  if (!auth) {
    return { data: null, error: "Admin access required" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("tags") as any)
    .delete()
    .eq("id", tagId)

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath("/admin/tags")
  return { data: { id: tagId }, error: null }
}
