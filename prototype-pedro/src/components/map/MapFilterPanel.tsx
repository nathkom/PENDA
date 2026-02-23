"use client"

import { useEffect, useRef, useState } from "react"
import { X, SlidersHorizontal, ChevronsUpDown, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Tag } from "@/types"

// ─── All Seattle neighborhoods (from public GeoJSON) ─────────────────────────

const SEATTLE_NEIGHBORHOODS = [
  "Adams",
  "Alki",
  "Arbor Heights",
  "Atlantic",
  "Belltown",
  "Bitter Lake",
  "Briarcliff",
  "Brighton",
  "Broadview",
  "Broadway",
  "Bryant",
  "Cedar Park",
  "Central Business District",
  "Columbia City",
  "Crown Hill",
  "Dunlap",
  "East Queen Anne",
  "Eastlake",
  "Fairmount Park",
  "Fauntleroy",
  "First Hill",
  "Fremont",
  "Gatewood",
  "Genesee",
  "Georgetown",
  "Green Lake",
  "Greenwood",
  "Haller Lake",
  "Harbor Island",
  "Harrison/Denny-Blaine",
  "High Point",
  "Highland Park",
  "Holly Park",
  "Industrial District",
  "Interbay",
  "International District",
  "Laurelhurst",
  "Lawton Park",
  "Leschi",
  "Lower Queen Anne",
  "Loyal Heights",
  "Madison Park",
  "Madrona",
  "Mann",
  "Maple Leaf",
  "Matthews Beach",
  "Meadowbrook",
  "Mid-Beacon Hill",
  "Minor",
  "Montlake",
  "Mount Baker",
  "North Admiral",
  "North Beach/Blue Ridge",
  "North Beacon Hill",
  "North College Park",
  "North Delridge",
  "North Queen Anne",
  "Olympic Hills",
  "Phinney Ridge",
  "Pike-Market",
  "Pinehurst",
  "Pioneer Square",
  "Portage Bay",
  "Rainier Beach",
  "Rainier View",
  "Ravenna",
  "Riverview",
  "Roosevelt",
  "Roxhill",
  "Sand Point",
  "Seaview",
  "Seward Park",
  "South Beacon Hill",
  "South Delridge",
  "South Lake Union",
  "South Park",
  "Southeast Magnolia",
  "Stevens",
  "Sunset Hill",
  "University District",
  "Victory Heights",
  "View Ridge",
  "Wallingford",
  "Wedgwood",
  "West Queen Anne",
  "West Woodland",
  "Westlake",
  "Whittier Heights",
  "Windermere",
  "Yesler Terrace",
]

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExploreFilters = {
  neighborhood: string
  is_free: boolean
  indoors: boolean
  outdoors: boolean
  tagIds: string[]
  contentType: "all" | "places" | "events"
}

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
  neighborhood: "",
  is_free: false,
  indoors: false,
  outdoors: false,
  tagIds: [],
  contentType: "all",
}

// ─── Searchable neighborhood combobox ─────────────────────────────────────────

interface NeighborhoodComboboxProps {
  value: string
  onChange: (value: string) => void
  /** Neighborhoods that have at least one place/event in the DB */
  withData?: string[]
}

function NeighborhoodCombobox({ value, onChange, withData = [] }: NeighborhoodComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = SEATTLE_NEIGHBORHOODS.filter((n) =>
    n.toLowerCase().includes(query.toLowerCase()),
  )

  function select(neighborhood: string) {
    onChange(neighborhood === value ? "" : neighborhood)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "All neighborhoods"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search input */}
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search neighborhoods…"
              className="h-8 text-sm"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {/* "All neighborhoods" option */}
            <li>
              <button
                type="button"
                onClick={() => select("")}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Check
                  className={`h-3.5 w-3.5 shrink-0 ${value === "" ? "opacity-100" : "opacity-0"}`}
                />
                <span className="text-muted-foreground">All neighborhoods</span>
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-muted-foreground">
                No neighborhoods found
              </li>
            ) : (
              filtered.map((n) => {
                const hasData = withData.includes(n)
                const selected = value === n
                return (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => select(n)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent ${
                        selected ? "bg-accent" : ""
                      }`}
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className="flex-1 text-left">{n}</span>
                      {hasData && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Main filter panel ─────────────────────────────────────────────────────────

interface MapFilterPanelProps {
  filters: ExploreFilters
  tags: Tag[]
  /** Neighborhoods that have at least one place in the DB — shown with a dot indicator */
  availableNeighborhoods?: string[]
  onChange: (filters: ExploreFilters) => void
}

export function MapFilterPanel({
  filters,
  tags,
  availableNeighborhoods = [],
  onChange,
}: MapFilterPanelProps) {
  function update(partial: Partial<ExploreFilters>) {
    onChange({ ...filters, ...partial })
  }

  const activeCount =
    filters.tagIds.length +
    (filters.neighborhood ? 1 : 0) +
    (filters.is_free ? 1 : 0) +
    (filters.indoors ? 1 : 0) +
    (filters.outdoors ? 1 : 0) +
    (filters.contentType !== "all" ? 1 : 0)

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
            onClick={() => onChange(DEFAULT_EXPLORE_FILTERS)}
            className="h-auto px-2 py-1 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Content type */}
      <div className="space-y-1.5">
        <Label>Show</Label>
        <div className="flex gap-1.5">
          {(["all", "places", "events"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update({ contentType: type })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                filters.contentType === type
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {type === "all" ? "All" : type === "places" ? "Places" : "Events"}
            </button>
          ))}
        </div>
      </div>

      {/* Neighborhood — searchable combobox */}
      <div className="space-y-1.5">
        <Label>Neighborhood</Label>
        <NeighborhoodCombobox
          value={filters.neighborhood}
          onChange={(n) => update({ neighborhood: n })}
          withData={availableNeighborhoods}
        />
        {availableNeighborhoods.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            Neighborhoods with places
          </p>
        )}
      </div>

      {/* Setting */}
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

      {/* Price */}
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
