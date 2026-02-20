"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { createTag, deleteTag } from "@/actions/tags"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Tag } from "@/types"

export default function TagsPage() {
  const { toast } = useToast()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newKind, setNewKind] = useState<"theme" | "category">("category")
  const [creating, setCreating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchTags() {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from("tags")
        .select("*")
        .order("kind")
        .order("name")
      setTags((data as Tag[] | null) ?? [])
      setLoading(false)
    }
    fetchTags()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    setCreating(true)
    const result = (await createTag({ name: newName.trim(), kind: newKind })) as {
      data: Tag | null
      error: string | null
    }
    setCreating(false)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else if (result.data) {
      toast({ title: "Created", description: `Tag "${result.data.name}" created.` })
      setTags((prev) => [...prev, result.data!].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
        return a.name.localeCompare(b.name)
      }))
      setNewName("")
    }
  }

  function openDeleteDialog(tag: Tag) {
    setDeletingTag(tag)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!deletingTag) return

    setDeleting(true)
    const result = (await deleteTag(deletingTag.id)) as {
      data: { id: string } | null
      error: string | null
    }
    setDeleting(false)
    setDeleteDialogOpen(false)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Deleted", description: `Tag "${deletingTag.name}" deleted.` })
      setTags((prev) => prev.filter((t) => t.id !== deletingTag.id))
    }
  }

  const categoryTags = tags.filter((t) => t.kind === "category")
  const themeTags = tags.filter((t) => t.kind === "theme")

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tags...</p>
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Tag Management</h2>

      <form onSubmit={handleCreate} className="mb-8 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="tag-name" className="mb-1 block text-sm font-medium">
            Tag Name
          </label>
          <Input
            id="tag-name"
            placeholder="Enter tag name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="tag-kind" className="mb-1 block text-sm font-medium">
            Kind
          </label>
          <Select value={newKind} onValueChange={(v) => setNewKind(v as "theme" | "category")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="theme">Theme</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={creating || !newName.trim()}>
          {creating ? "Creating..." : "Create Tag"}
        </Button>
      </form>

      <div className="space-y-8">
        <div>
          <h3 className="mb-3 text-lg font-medium">Categories ({categoryTags.length})</h3>
          {categoryTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No category tags yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categoryTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="cursor-pointer gap-1 pr-1"
                >
                  {tag.name}
                  <button
                    onClick={() => openDeleteDialog(tag)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                    aria-label={`Delete tag ${tag.name}`}
                  >
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-lg font-medium">Themes ({themeTags.length})</h3>
          {themeTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No theme tags yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {themeTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer gap-1 pr-1"
                >
                  {tag.name}
                  <button
                    onClick={() => openDeleteDialog(tag)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                    aria-label={`Delete tag ${tag.name}`}
                  >
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Deleting this tag will remove it from all places and events that
              currently use it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            Are you sure you want to delete <strong>&quot;{deletingTag?.name}&quot;</strong>?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
