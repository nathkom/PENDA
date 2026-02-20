"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { X, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tag } from "@/types"

interface FilterPanelProps {
  availableTags: Tag[]
  availableNeighborhoods: string[]
}

/** Filter params that we manage — everything except `q`, `tab`, and `page` */
const FILTER_KEYS = ["tag", "neighborhood", "is_free", "indoors", "outdoors"]

export function FilterPanel({
  availableTags,
  availableNeighborhoods,
}: FilterPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read current filter state from URL
  const selectedTagIds = searchParams.getAll("tag")
  const neighborhood = searchParams.get("neighborhood") ?? ""
  const isFree = searchParams.get("is_free") === "true"
  const indoors = searchParams.get("indoors") === "true"
  const outdoors = searchParams.get("outdoors") === "true"

  // Count active filters
  const activeCount =
    selectedTagIds.length +
    (neighborhood ? 1 : 0) +
    (isFree ? 1 : 0) +
    (indoors ? 1 : 0) +
    (outdoors ? 1 : 0)

  const updateParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      // Always reset page when filters change
      params.delete("page")
      updater(params)
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  function toggleTag(tagId: string) {
    updateParams((params) => {
      const current = params.getAll("tag")
      params.delete("tag")
      if (current.includes(tagId)) {
        current
          .filter((id) => id !== tagId)
          .forEach((id) => params.append("tag", id))
      } else {
        ;[...current, tagId].forEach((id) => params.append("tag", id))
      }
    })
  }

  function setNeighborhood(value: string) {
    updateParams((params) => {
      if (value) {
        params.set("neighborhood", value)
      } else {
        params.delete("neighborhood")
      }
    })
  }

  function toggleBoolean(key: "is_free" | "indoors" | "outdoors") {
    updateParams((params) => {
      if (params.get(key) === "true") {
        params.delete(key)
      } else {
        params.set(key, "true")
      }
    })
  }

  function clearAllFilters() {
    updateParams((params) => {
      FILTER_KEYS.forEach((key) => params.delete(key))
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Filters
          </h2>
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-auto px-2 py-1 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Neighborhood */}
      {availableNeighborhoods.length > 0 && (
        <div className="space-y-1.5">
          <Label>Neighborhood</Label>
          <Select
            value={neighborhood || "_all"}
            onValueChange={(v) => setNeighborhood(v === "_all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All neighborhoods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All neighborhoods</SelectItem>
              {availableNeighborhoods.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Indoor / Outdoor */}
      <div className="space-y-1.5">
        <Label>Setting</Label>
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={indoors}
              onChange={() => toggleBoolean("indoors")}
              className="rounded"
            />
            Indoors
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={outdoors}
              onChange={() => toggleBoolean("outdoors")}
              className="rounded"
            />
            Outdoors
          </label>
        </div>
      </div>

      {/* Is Free */}
      <div className="space-y-1.5">
        <Label>Price</Label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFree}
            onChange={() => toggleBoolean("is_free")}
            className="rounded"
          />
          Free only
        </label>
      </div>

      {/* Tags */}
      {availableTags.length > 0 && (
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
