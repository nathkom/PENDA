"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tag } from "@/types"

export type ExploreFilters = {
  neighborhood: string
  is_free: boolean
  indoors: boolean
  outdoors: boolean
  tagIds: string[]
}

const SEATTLE_NEIGHBORHOODS = [
  "Ballard",
  "Capitol Hill",
  "Central District",
  "Columbia City",
  "Eastlake",
  "First Hill",
  "Fremont",
  "Georgetown",
  "Green Lake",
  "Greenwood",
  "Hillman City",
  "Leschi",
  "Madrona",
  "Maple Leaf",
  "Mount Baker",
  "Northgate",
  "Queen Anne",
  "Rainier Beach",
  "Ravenna",
  "Roosevelt",
  "SoDo",
  "South Lake Union",
  "University District",
  "Wallingford",
  "West Seattle",
]

interface MapFilterPanelProps {
  filters: ExploreFilters
  tags: Tag[]
  onChange: (filters: ExploreFilters) => void
}

export function MapFilterPanel({ filters, tags, onChange }: MapFilterPanelProps) {
  function update(partial: Partial<ExploreFilters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="space-y-5 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Filters
      </h2>

      {/* Neighborhood */}
      <div className="space-y-1.5">
        <Label>Neighborhood</Label>
        <Select
          value={filters.neighborhood || "_all"}
          onValueChange={(v) =>
            update({ neighborhood: v === "_all" ? "" : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All neighborhoods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All neighborhoods</SelectItem>
            {SEATTLE_NEIGHBORHOODS.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Indoor / Outdoor */}
      <div className="space-y-1.5">
        <Label>Setting</Label>
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.indoors}
              onChange={(e) => update({ indoors: e.target.checked })}
              className="rounded"
            />
            Indoors
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.outdoors}
              onChange={(e) => update({ outdoors: e.target.checked })}
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
            checked={filters.is_free}
            onChange={(e) => update({ is_free: e.target.checked })}
            className="rounded"
          />
          Free only
        </label>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selected = filters.tagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    const tagIds = selected
                      ? filters.tagIds.filter((id) => id !== tag.id)
                      : [...filters.tagIds, tag.id]
                    update({ tagIds })
                  }}
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
