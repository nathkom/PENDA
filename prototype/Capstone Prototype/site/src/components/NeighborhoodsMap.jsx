import "mapbox-gl/dist/mapbox-gl.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Map, { Layer, Popup, Source } from "react-map-gl/mapbox"
import { Link } from "react-router-dom"
import { SlidersHorizontal, X } from "lucide-react"

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const SEATTLE_CENTER = { lng: -122.3321, lat: 47.6062 }
const DEFAULT_ZOOM = 11

const CATEGORIES = [
  { value: "social", label: "Social" },
  { value: "arts", label: "Arts" },
  { value: "outdoors", label: "Outdoors" },
  { value: "food", label: "Food" },
  { value: "sports", label: "Sports" },
  { value: "educational", label: "Educational" },
]

// Approximate geographic centers for each neighborhood
const NEIGHBORHOOD_CENTERS = {
  "Capitol Hill":       { lat: 47.6253, lng: -122.3222 },
  "Ballard":            { lat: 47.6681, lng: -122.3838 },
  "Fremont":            { lat: 47.6512, lng: -122.3517 },
  "Columbia City":      { lat: 47.5596, lng: -122.2916 },
  "Rainier Valley":     { lat: 47.5502, lng: -122.2791 },
  "University District":{ lat: 47.6597, lng: -122.3134 },
  "West Seattle":       { lat: 47.5609, lng: -122.3867 },
  "South Lake Union":   { lat: 47.6257, lng: -122.3364 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Deterministic integer hash of a string — used to spread event pins within a neighborhood
function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h
}

function getNeighborhoodBounds(geometry) {
  let minLng = Infinity, minLat = Infinity
  let maxLng = -Infinity, maxLat = -Infinity

  function processRing(ring) {
    ring.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng
      if (lat < minLat) minLat = lat
      if (lng > maxLng) maxLng = lng
      if (lat > maxLat) maxLat = lat
    })
  }

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(processRing)
  } else {
    geometry.coordinates.forEach((polygon) => polygon.forEach(processRing))
  }
  return [[minLng, minLat], [maxLng, maxLat]]
}

// Build a GeoJSON FeatureCollection from events, placing each pin at an
// approximate location within its neighborhood using a hash-based offset.
function eventsToGeoJSON(events) {
  return {
    type: "FeatureCollection",
    features: events
      .map((event) => {
        const center = NEIGHBORHOOD_CENTERS[event.neighborhood]
        if (!center) return null
        const h = hashString(event.id)
        // Normalise to [-1, 1] then scale to ±0.003° lat / ±0.004° lng ≈ ±330 m
        const lat = center.lat + (((h & 0xff) - 128) / 128) * 0.003
        const lng = center.lng + ((((h >> 8) & 0xff) - 128) / 128) * 0.004
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: {
            id: event.id,
            title: event.title,
            space_name: event.space_name,
            date: event.date,
            time: event.time,
            cost: event.cost,
          },
        }
      })
      .filter(Boolean),
  }
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

function MapFilterPanel({
  filters,
  onChange,
  eventCounts,
  selectedNeighborhood,
  onNeighborhoodSelect,
}) {
  function update(partial) {
    onChange({ ...filters, ...partial })
  }

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.cost !== "all" ? 1 : 0) +
    (selectedNeighborhood ? 1 : 0)

  const sortedCounts = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Filters
          </h2>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-700">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => {
              onChange({ category: "", cost: "all" })
              if (selectedNeighborhood) onNeighborhoodSelect(selectedNeighborhood)
            }}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={10} />
            Clear all
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() =>
                update({ category: filters.category === value ? "" : value })
              }
              className={`rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors ${
                filters.category === value
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cost */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Cost</p>
        <div className="flex gap-1.5">
          {[
            { value: "all", label: "All" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => update({ cost: value })}
              className={`flex-1 rounded-md border py-1 text-xs transition-colors ${
                filters.cost === value
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Neighborhoods — clickable, bidirectional with map */}
      {sortedCounts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700">Neighborhood</p>
          <ul className="space-y-0.5">
            {sortedCounts.map(([name, count]) => {
              const isSelected = selectedNeighborhood === name
              return (
                <li key={name}>
                  <button
                    onClick={() => onNeighborhoodSelect(name)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-[#00A6CB]/10 font-semibold text-[#00A6CB]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    <span
                      className={`ml-2 shrink-0 rounded-full px-2 py-0.5 font-medium ${
                        isSelected
                          ? "bg-[#00A6CB]/15 text-[#00A6CB]"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Legend */}
      <div className="space-y-1.5 border-t pt-3">
        <p className="text-xs font-medium text-gray-700">Legend</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-400 opacity-70" />
          Has matching events
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#00A6CB", opacity: 0.8 }} />
          Selected neighborhood
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          Event pin
        </div>
      </div>
    </div>
  )
}

// ─── Main map component ───────────────────────────────────────────────────────

export default function NeighborhoodsMap({
  events,
  selectedNeighborhood,
  onNeighborhoodClick,
  height = 392,
}) {
  const mapRef = useRef(null)
  const [mapHeight, setMapHeight] = useState(height)

  // ── Resize handle ─────────────────────────────────────────────────────────
  const resizeStartY = useRef(0)
  const resizeStartH = useRef(0)

  function onResizeMouseDown(e) {
    resizeStartY.current = e.clientY
    resizeStartH.current = mapHeight

    function onMouseMove(ev) {
      const delta = ev.clientY - resizeStartY.current
      setMapHeight(Math.max(200, resizeStartH.current + delta))
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }
  const [viewState, setViewState] = useState({
    longitude: SEATTLE_CENTER.lng,
    latitude: SEATTLE_CENTER.lat,
    zoom: DEFAULT_ZOOM,
  })
  const [popupInfo, setPopupInfo] = useState(null)
  const [hoveredNeighborhoodId, setHoveredNeighborhoodId] = useState(null)
  const [cursor, setCursor] = useState("grab")
  const [neighborhoodGeometries, setNeighborhoodGeometries] = useState({})

  // Always-current view state for snapshot-before-zoom
  const viewStateRef = useRef({ longitude: SEATTLE_CENTER.lng, latitude: SEATTLE_CENTER.lat, zoom: DEFAULT_ZOOM })
  // Saved view state to restore when deselecting a neighborhood
  const savedViewStateRef = useRef(null)
  // Name of the neighborhood last selected via a map click (so effect doesn't double-zoom)
  const lastMapClickedNeighborhood = useRef("")
  // True when a map click triggered a deselect (so effect skips the zoom-out)
  const mapDeselectedRef = useRef(false)

  const [filters, setFilters] = useState({ category: "", cost: "all" })
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ── GeoJSON fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}seattle-neighborhoods.geojson`)
      .then((r) => r.json())
      .then((data) => {
        const geometries = {}
        data.features.forEach((f) => {
          const name = f.properties?.name
          if (
            name &&
            (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
          ) {
            geometries[name] = f.geometry
          }
        })
        setNeighborhoodGeometries(geometries)
      })
      .catch(() => {})
  }, [])

  // ── Zoom effect for externally-triggered (sidebar) selection changes ──────

  useEffect(() => {
    if (!selectedNeighborhood) {
      // selectedNeighborhood became empty
      if (mapDeselectedRef.current) {
        // Map click already zoomed out — just clear the flag
        mapDeselectedRef.current = false
        return
      }
      // Sidebar-triggered deselect — zoom back out
      if (savedViewStateRef.current && mapRef.current) {
        mapRef.current.flyTo({
          center: [savedViewStateRef.current.longitude, savedViewStateRef.current.latitude],
          zoom: savedViewStateRef.current.zoom,
          duration: 800,
        })
        savedViewStateRef.current = null
      }
      return
    }

    if (selectedNeighborhood === lastMapClickedNeighborhood.current) {
      // Map click already zoomed in — skip
      lastMapClickedNeighborhood.current = ""
      return
    }

    // Sidebar-triggered selection — save view and zoom in
    if (!savedViewStateRef.current) {
      savedViewStateRef.current = { ...viewStateRef.current }
    }
    const geometry = neighborhoodGeometries[selectedNeighborhood]
    if (!geometry || !mapRef.current) return
    const bounds = getNeighborhoodBounds(geometry)
    mapRef.current.fitBounds(bounds, { padding: 48, duration: 800 })
  }, [selectedNeighborhood, neighborhoodGeometries])

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.category && event.category !== filters.category) return false
      if (filters.cost === "free" && event.cost !== "free") return false
      if (filters.cost === "paid" && event.cost === "free") return false
      return true
    })
  }, [events, filters])

  const activeNeighborhoods = useMemo(
    () => [...new Set(filteredEvents.map((e) => e.neighborhood))],
    [filteredEvents],
  )

  const eventCounts = useMemo(() => {
    const counts = {}
    filteredEvents.forEach((e) => {
      counts[e.neighborhood] = (counts[e.neighborhood] || 0) + 1
    })
    return counts
  }, [filteredEvents])

  // Events outside the selected neighborhood — shown clustered
  const otherEventsGeoJSON = useMemo(() => {
    const subset = selectedNeighborhood
      ? filteredEvents.filter((e) => e.neighborhood !== selectedNeighborhood)
      : filteredEvents
    return eventsToGeoJSON(subset)
  }, [filteredEvents, selectedNeighborhood])

  // Selected neighborhood events — shown unclustered so individual pins are visible
  const selectedEventsGeoJSON = useMemo(() => {
    if (!selectedNeighborhood) return { type: "FeatureCollection", features: [] }
    return eventsToGeoJSON(filteredEvents.filter((e) => e.neighborhood === selectedNeighborhood))
  }, [filteredEvents, selectedNeighborhood])

  // Helper: compute a pin's map coordinates from an event (mirrors eventsToGeoJSON)
  function getEventCoords(event) {
    const center = NEIGHBORHOOD_CENTERS[event.neighborhood]
    if (!center) return null
    const h = hashString(event.id)
    return {
      lng: center.lng + ((((h >> 8) & 0xff) - 128) / 128) * 0.004,
      lat: center.lat + (((h & 0xff) - 128) / 128) * 0.003,
    }
  }

  // ── Mapbox paint expressions ──────────────────────────────────────────────

  const fillColor = useMemo(() => {
    if (activeNeighborhoods.length === 0) {
      return [
        "case",
        ["==", ["get", "name"], selectedNeighborhood || ""], "#00A6CB",
        "#94a3b8",
      ]
    }
    return [
      "case",
      ["==", ["get", "name"], selectedNeighborhood || ""], "#00A6CB",
      ["match", ["get", "name"], activeNeighborhoods, "#4ade80", "#94a3b8"],
    ]
  }, [selectedNeighborhood, activeNeighborhoods])

  const fillOpacity = useMemo(() => {
    if (activeNeighborhoods.length === 0) {
      return [
        "case",
        ["boolean", ["feature-state", "hover"], false], 0.35,
        ["==", ["get", "name"], selectedNeighborhood || ""], 0.3,
        0.06,
      ]
    }
    return [
      "case",
      ["boolean", ["feature-state", "hover"], false], 0.35,
      ["==", ["get", "name"], selectedNeighborhood || ""], 0.3,
      ["match", ["get", "name"], activeNeighborhoods, 0.22, 0.06],
    ]
  }, [selectedNeighborhood, activeNeighborhoods])

  const borderColor = [
    "case",
    ["==", ["get", "name"], selectedNeighborhood || ""], "#00A6CB",
    "#64748b",
  ]
  const borderWidth = [
    "case",
    ["==", ["get", "name"], selectedNeighborhood || ""], 2.5,
    0.8,
  ]
  const borderOpacity = [
    "case",
    ["boolean", ["feature-state", "hover"], false], 1,
    ["==", ["get", "name"], selectedNeighborhood || ""], 1,
    0.4,
  ]

  // ── Hover ─────────────────────────────────────────────────────────────────

  const onMouseMove = useCallback(
    (evt) => {
      const features = evt.features

      // Pointer cursor for event pins
      const hasEventPin = features?.some((f) =>
        ["event-clusters", "event-unclustered"].includes(f.layer?.id ?? ""),
      )

      const nf = features?.find((f) => f.layer?.id === "neighborhoods-fill")
      if (nf) {
        const id = nf.id
        if (id !== hoveredNeighborhoodId) {
          if (hoveredNeighborhoodId !== null) {
            mapRef.current?.setFeatureState(
              { source: "neighborhoods", id: hoveredNeighborhoodId },
              { hover: false },
            )
          }
          if (id !== undefined) {
            mapRef.current?.setFeatureState(
              { source: "neighborhoods", id },
              { hover: true },
            )
          }
          setHoveredNeighborhoodId(id ?? null)
        }
        setCursor("pointer")
      } else {
        if (hoveredNeighborhoodId !== null) {
          mapRef.current?.setFeatureState(
            { source: "neighborhoods", id: hoveredNeighborhoodId },
            { hover: false },
          )
          setHoveredNeighborhoodId(null)
        }
        setCursor(hasEventPin ? "pointer" : "grab")
      }
    },
    [hoveredNeighborhoodId],
  )

  const onMouseLeave = useCallback(() => {
    if (hoveredNeighborhoodId !== null) {
      mapRef.current?.setFeatureState(
        { source: "neighborhoods", id: hoveredNeighborhoodId },
        { hover: false },
      )
      setHoveredNeighborhoodId(null)
    }
    setCursor("grab")
  }, [hoveredNeighborhoodId])

  // ── Click ─────────────────────────────────────────────────────────────────

  const onClick = useCallback(
    (evt) => {
      const features = evt.features

      // Priority 1: event cluster → zoom in
      const clusterFeature = features?.find(
        (f) => f.layer?.id === "event-clusters" && f.properties?.cluster,
      )
      if (clusterFeature) {
        const coords = clusterFeature.geometry.coordinates
        mapRef.current?.flyTo({
          center: [coords[0], coords[1]],
          zoom: viewStateRef.current.zoom + 2,
          duration: 500,
        })
        return
      }

      // Priority 2: individual event pin → popup
      const eventFeature = features?.find(
        (f) => f.layer?.id === "event-unclustered" || f.layer?.id === "event-selected-pin",
      )
      if (eventFeature) {
        const props = eventFeature.properties
        const coords = eventFeature.geometry.coordinates
        setPopupInfo({
          kind: "event",
          id: props.id,
          title: props.title,
          spaceName: props.space_name,
          date: props.date,
          time: props.time,
          longitude: coords[0],
          latitude: coords[1],
        })
        return
      }

      // Priority 3: neighborhood boundary
      const nf = features?.find((f) => f.layer?.id === "neighborhoods-fill")
      if (!nf) {
        setPopupInfo(null)
        return
      }

      const name = nf.properties?.name
      if (!name) return

      if (selectedNeighborhood === name) {
        // Deselecting: zoom back out to saved view
        mapDeselectedRef.current = true
        if (savedViewStateRef.current && mapRef.current) {
          mapRef.current.flyTo({
            center: [savedViewStateRef.current.longitude, savedViewStateRef.current.latitude],
            zoom: savedViewStateRef.current.zoom,
            duration: 800,
          })
          savedViewStateRef.current = null
        }
        onNeighborhoodClick?.(name) // toggles parent state to ""
        setPopupInfo(null)
        return
      }

      // Selecting: save current view state, zoom in
      if (!savedViewStateRef.current) {
        savedViewStateRef.current = { ...viewStateRef.current }
      }
      const geom = nf.geometry
      if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
        mapRef.current?.fitBounds(getNeighborhoodBounds(geom), {
          padding: 48,
          duration: 800,
        })
      }
      lastMapClickedNeighborhood.current = name
      onNeighborhoodClick?.(name)
      const nhCenter = NEIGHBORHOOD_CENTERS[name]
      setPopupInfo({
        kind: "neighborhood",
        name,
        longitude: nhCenter?.lng ?? evt.lngLat.lng,
        latitude: nhCenter?.lat ?? evt.lngLat.lat,
        neighborhoodEvents: filteredEvents.filter((e) => e.neighborhood === name),
      })
    },
    [selectedNeighborhood, onNeighborhoodClick, eventCounts, filteredEvents],
  )

  // ── Sidebar neighborhood toggle (bidirectional with map) ──────────────────

  function handleNeighborhoodSelect(name) {
    onNeighborhoodClick?.(name) // parent toggles mapSelectedNeighborhood
    setPopupInfo(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const filterPanel = (
    <MapFilterPanel
      filters={filters}
      onChange={setFilters}
      eventCounts={eventCounts}
      selectedNeighborhood={selectedNeighborhood}
      onNeighborhoodSelect={handleNeighborhoodSelect}
    />
  )

  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Mobile: filter toggle bar */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2 md:hidden">
        <span className="text-sm font-medium text-gray-700">Map filters</span>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={12} />
          {filtersOpen ? "Hide" : "Show"} filters
        </button>
      </div>

      {/* Mobile: collapsible filter panel */}
      {filtersOpen && (
        <div className="border-b bg-white p-4 md:hidden">{filterPanel}</div>
      )}

      {/* Map + desktop sidebar */}
      <div className="flex" style={{ height: mapHeight }}>
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r bg-white p-4 md:block">
          {filterPanel}
        </aside>

        {/* Map */}
        <div className="min-h-[350px] flex-1 md:min-h-0">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => {
              setViewState(evt.viewState)
              viewStateRef.current = evt.viewState
            }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
            interactiveLayerIds={[
              "neighborhoods-fill",
              "event-clusters",
              "event-unclustered",
              "event-selected-pin",
            ]}
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={{ width: "100%", height: "100%" }}
            cursor={cursor}
          >
            {/* ── Neighborhood boundary layer ───────────────────────────── */}
            <Source
              id="neighborhoods"
              type="geojson"
              data={`${import.meta.env.BASE_URL}seattle-neighborhoods.geojson`}
              promoteId="cartodb_id"
            >
              <Layer
                id="neighborhoods-fill"
                type="fill"
                paint={{ "fill-color": fillColor, "fill-opacity": fillOpacity }}
              />
              <Layer
                id="neighborhoods-border"
                type="line"
                paint={{
                  "line-color": borderColor,
                  "line-width": borderWidth,
                  "line-opacity": borderOpacity,
                }}
              />
            </Source>

            {/* ── Event pins — clustered (events outside selected neighborhood) ── */}
            <Source
              id="events"
              type="geojson"
              data={otherEventsGeoJSON}
              cluster={true}
              clusterMaxZoom={14}
              clusterRadius={40}
            >
              <Layer
                id="event-clusters"
                type="circle"
                filter={["has", "point_count"]}
                paint={{
                  "circle-color": [
                    "step", ["get", "point_count"],
                    "#f59e0b", 10, "#d97706", 25, "#b45309",
                  ],
                  "circle-radius": [
                    "step", ["get", "point_count"],
                    20, 10, 28, 25, 36,
                  ],
                  "circle-opacity": 0.9,
                }}
              />
              <Layer
                id="event-cluster-count"
                type="symbol"
                filter={["has", "point_count"]}
                layout={{
                  "text-field": "{point_count_abbreviated}",
                  "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                  "text-size": 12,
                }}
                paint={{ "text-color": "#ffffff" }}
              />
              <Layer
                id="event-unclustered"
                type="circle"
                filter={["!", ["has", "point_count"]]}
                paint={{
                  "circle-color": "#f59e0b",
                  "circle-radius": 8,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff",
                }}
              />
            </Source>

            {/* ── Event pins — unclustered (selected neighborhood only) ──── */}
            <Source id="events-selected" type="geojson" data={selectedEventsGeoJSON}>
              <Layer
                id="event-selected-pin"
                type="circle"
                paint={{
                  "circle-color": "#f59e0b",
                  "circle-radius": 8,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff",
                }}
              />
              <Layer
                id="event-selected-label"
                type="symbol"
                layout={{
                  "text-field": ["get", "title"],
                  "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                  "text-size": 11,
                  "text-offset": [0, 1.4],
                  "text-anchor": "top",
                  "text-max-width": 10,
                }}
                paint={{
                  "text-color": "#1f2937",
                  "text-halo-color": "#ffffff",
                  "text-halo-width": 1.5,
                }}
              />
            </Source>

            {/* ── Popup ─────────────────────────────────────────────────── */}
            {popupInfo && (
              <Popup
                longitude={popupInfo.longitude}
                latitude={popupInfo.latitude}
                anchor="bottom"
                onClose={() => setPopupInfo(null)}
                closeOnClick={false}
              >
                {popupInfo.kind === "neighborhood" ? (
                  <div className="w-[220px] p-2">
                    <p className="text-sm font-semibold text-gray-900">{popupInfo.name}</p>
                    {popupInfo.neighborhoodEvents.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-400">No events match current filters</p>
                    ) : (
                      <>
                        <p className="mt-0.5 mb-1.5 text-xs text-gray-400">
                          {popupInfo.neighborhoodEvents.length} event
                          {popupInfo.neighborhoodEvents.length !== 1 ? "s" : ""} here
                        </p>
                        <ul className="max-h-[160px] overflow-y-auto space-y-0.5">
                          {popupInfo.neighborhoodEvents.map((ev) => (
                            <li key={ev.id}>
                              <button
                                onClick={() => {
                                  const coords = getEventCoords(ev)
                                  if (!coords || !mapRef.current) return
                                  mapRef.current.flyTo({
                                    center: [coords.lng, coords.lat],
                                    zoom: 15,
                                    duration: 600,
                                  })
                                  setPopupInfo({
                                    kind: "event",
                                    id: ev.id,
                                    title: ev.title,
                                    spaceName: ev.space_name,
                                    date: ev.date,
                                    time: ev.time,
                                    longitude: coords.lng,
                                    latitude: coords.lat,
                                  })
                                }}
                                className="flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left hover:bg-amber-50 transition-colors"
                              >
                                <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                                <span className="text-xs text-gray-700 leading-snug">{ev.title}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="min-w-[160px] p-1.5">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-medium text-gray-400">Event</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{popupInfo.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{popupInfo.spaceName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{popupInfo.date} · {popupInfo.time}</p>
                    <Link
                      to={`/events/${popupInfo.id}`}
                      className="mt-2 inline-block text-xs text-amber-600 hover:underline"
                    >
                      View event →
                    </Link>
                  </div>
                )}
              </Popup>
            )}
          </Map>
        </div>
      </div>

      {/* ── Resize handle ─────────────────────────────────────────────────── */}
      <div
        onMouseDown={onResizeMouseDown}
        className="flex h-3 cursor-ns-resize items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors select-none"
        title="Drag to resize"
      >
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>
    </div>
  )
}
