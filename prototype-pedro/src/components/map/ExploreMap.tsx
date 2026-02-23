"use client"

import "mapbox-gl/dist/mapbox-gl.css"
import { useCallback, useEffect, useRef, useState } from "react"
import Map, {
  Layer,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl"
import {
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  DEFAULT_ZOOM,
  MAPBOX_TOKEN,
  SEATTLE_CENTER,
} from "@/lib/mapbox"
import type { Place, EventWithPlace } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

type PlacePopup = {
  kind: "place"
  id: string
  name: string
  neighborhood: string | null
  longitude: number
  latitude: number
}

type EventPopup = {
  kind: "event"
  id: string
  title: string
  starts_at: string
  placeName: string | null
  placeId: string
  longitude: number
  latitude: number
}

type PopupInfo = PlacePopup | EventPopup

// ─── GeoJSON helpers ──────────────────────────────────────────────────────────

function placesToGeoJSON(places: Place[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: {
        id: place.id,
        name: place.name,
        neighborhood: place.neighborhood,
      },
    })),
  }
}

function eventsToGeoJSON(
  events: EventWithPlace[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: events
      .filter((e) => e.places?.lat != null && e.places?.lng != null)
      .map((event) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [event.places!.lng, event.places!.lat],
        },
        properties: {
          id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          place_name: event.places?.name ?? null,
          place_id: event.place_id,
        },
      })),
  }
}

function getNeighborhoodBounds(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): [[number, number], [number, number]] {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity

  const processRing = (ring: number[][]) => {
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

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ExploreMapProps {
  places: Place[]
  events: EventWithPlace[]
  selectedNeighborhood?: string
  onNeighborhoodClick?: (neighborhood: string) => void
}

export default function ExploreMap({
  places,
  events,
  selectedNeighborhood = "",
  onNeighborhoodClick,
}: ExploreMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: SEATTLE_CENTER.lng,
    latitude: SEATTLE_CENTER.lat,
    zoom: DEFAULT_ZOOM,
  })
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)
  const [hoveredNeighborhoodId, setHoveredNeighborhoodId] = useState<
    number | string | null
  >(null)
  const [cursor, setCursor] = useState<string>("grab")

  // Geometry lookup built from the static GeoJSON file
  const [neighborhoodGeometries, setNeighborhoodGeometries] = useState<
    Record<string, GeoJSON.Polygon | GeoJSON.MultiPolygon>
  >({})

  // Tracks which neighborhood was zoomed to by a map click, so we skip the
  // effect-based zoom for that same selection (prevents double-zoom)
  const lastMapClickedNeighborhood = useRef<string>("")

  // Fetch the GeoJSON once and index it by name for fast bounds lookup
  useEffect(() => {
    fetch("/seattle-neighborhoods.geojson")
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        const geometries: Record<string, GeoJSON.Polygon | GeoJSON.MultiPolygon> = {}
        data.features.forEach((f) => {
          const name = f.properties?.name as string | undefined
          if (
            name &&
            (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
          ) {
            geometries[name] = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
          }
        })
        setNeighborhoodGeometries(geometries)
      })
      .catch(() => {
        // GeoJSON unavailable — zoom-on-filter-select won't fire, map still works
      })
  }, [])

  // When selectedNeighborhood changes from the filter sidebar, zoom + highlight
  useEffect(() => {
    if (!selectedNeighborhood) return

    // Was this selection caused by a map click? If so, the click handler already
    // zoomed — skip to avoid a duplicate animation
    if (selectedNeighborhood === lastMapClickedNeighborhood.current) {
      lastMapClickedNeighborhood.current = ""
      return
    }

    const geometry = neighborhoodGeometries[selectedNeighborhood]
    if (!geometry || !mapRef.current) return

    const bounds = getNeighborhoodBounds(geometry)
    mapRef.current.fitBounds(bounds, { padding: 48, duration: 800 })
  }, [selectedNeighborhood, neighborhoodGeometries])

  const placesGeoJSON = placesToGeoJSON(places)
  const eventsGeoJSON = eventsToGeoJSON(events)

  // ── Hover: highlight neighborhood borders ──────────────────────────────────
  const onMouseMove = useCallback(
    (evt: MapLayerMouseEvent) => {
      const features = evt.features
      const neighborhoodFeature = features?.find(
        (f) => f.layer?.id === "neighborhoods-fill",
      )

      if (neighborhoodFeature) {
        const id = neighborhoodFeature.id
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
        const hasPoint = features?.some((f) =>
          ["clusters", "unclustered-point", "event-clusters", "event-unclustered"].includes(
            f.layer?.id ?? "",
          ),
        )
        setCursor(hasPoint ? "pointer" : "grab")
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

  // ── Click: pins → popup, neighborhood → zoom + filter ─────────────────────
  const onClick = useCallback(
    (evt: MapLayerMouseEvent) => {
      const features = evt.features
      if (!features?.length) {
        setPopupInfo(null)
        return
      }

      // Priority 1: cluster zoom (place or event clusters)
      const clusterFeature = features.find(
        (f) =>
          (f.layer?.id === "clusters" || f.layer?.id === "event-clusters") &&
          f.properties?.cluster,
      )
      if (clusterFeature) {
        const coords = (clusterFeature.geometry as GeoJSON.Point).coordinates
        mapRef.current?.flyTo({
          center: [coords[0] as number, coords[1] as number],
          zoom: viewState.zoom + 2,
          duration: 500,
        })
        return
      }

      // Priority 2: individual place pin → popup
      const placeFeature = features.find((f) => f.layer?.id === "unclustered-point")
      if (placeFeature) {
        const props = placeFeature.properties
        if (!props) return
        const coords = (placeFeature.geometry as GeoJSON.Point).coordinates
        setPopupInfo({
          kind: "place",
          id: props.id as string,
          name: props.name as string,
          neighborhood: props.neighborhood as string | null,
          longitude: coords[0] as number,
          latitude: coords[1] as number,
        })
        return
      }

      // Priority 3: individual event pin → popup
      const eventFeature = features.find((f) => f.layer?.id === "event-unclustered")
      if (eventFeature) {
        const props = eventFeature.properties
        if (!props) return
        const coords = (eventFeature.geometry as GeoJSON.Point).coordinates
        setPopupInfo({
          kind: "event",
          id: props.id as string,
          title: props.title as string,
          starts_at: props.starts_at as string,
          placeName: props.place_name as string | null,
          placeId: props.place_id as string,
          longitude: coords[0] as number,
          latitude: coords[1] as number,
        })
        return
      }

      // Priority 4: neighborhood → zoom to bounds + update filter
      const neighborhoodFeature = features.find(
        (f) => f.layer?.id === "neighborhoods-fill",
      )
      if (neighborhoodFeature) {
        const geom = neighborhoodFeature.geometry
        if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
          const bounds = getNeighborhoodBounds(
            geom as GeoJSON.Polygon | GeoJSON.MultiPolygon,
          )
          mapRef.current?.fitBounds(bounds, { padding: 48, duration: 800 })
        }
        const name = neighborhoodFeature.properties?.name as string | undefined
        if (name) {
          // Record that this zoom was triggered by the map click, not the filter
          lastMapClickedNeighborhood.current = name
          onNeighborhoodClick?.(name)
        }
        setPopupInfo(null)
        return
      }

      setPopupInfo(null)
    },
    [viewState.zoom, onNeighborhoodClick],
  )

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={[
        "neighborhoods-fill",
        "clusters",
        "unclustered-point",
        "event-clusters",
        "event-unclustered",
      ]}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ width: "100%", height: "100%" }}
      cursor={cursor}
    >
      {/* ── Neighborhood boundary layer ──────────────────────────────────── */}
      <Source
        id="neighborhoods"
        type="geojson"
        data="/seattle-neighborhoods.geojson"
        promoteId="cartodb_id"
      >
        {/* Semi-transparent fill — highlighted on hover or when selected */}
        <Layer
          id="neighborhoods-fill"
          type="fill"
          paint={{
            "fill-color": [
              "case",
              ["==", ["get", "name"], selectedNeighborhood],
              "#3b82f6",
              "#94a3b8",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.3,
              ["==", ["get", "name"], selectedNeighborhood],
              0.2,
              0.04,
            ],
          }}
        />
        {/* Neighborhood borders */}
        <Layer
          id="neighborhoods-border"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["==", ["get", "name"], selectedNeighborhood],
              "#2563eb",
              "#64748b",
            ],
            "line-width": [
              "case",
              ["==", ["get", "name"], selectedNeighborhood],
              2,
              0.8,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              1,
              ["==", ["get", "name"], selectedNeighborhood],
              1,
              0.5,
            ],
          }}
        />
      </Source>

      {/* ── Place pins (blue) ────────────────────────────────────────────── */}
      <Source
        id="places"
        type="geojson"
        data={placesGeoJSON}
        cluster={true}
        clusterMaxZoom={CLUSTER_MAX_ZOOM}
        clusterRadius={CLUSTER_RADIUS}
      >
        <Layer
          id="clusters"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#2563eb",
              10,
              "#1d4ed8",
              25,
              "#1e40af",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              20,
              10,
              28,
              25,
              36,
            ],
            "circle-opacity": 0.9,
          }}
        />
        <Layer
          id="cluster-count"
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
          id="unclustered-point"
          type="circle"
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-color": "#2563eb",
            "circle-radius": 8,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
      </Source>

      {/* ── Event pins (amber) ───────────────────────────────────────────── */}
      <Source
        id="events"
        type="geojson"
        data={eventsGeoJSON}
        cluster={true}
        clusterMaxZoom={CLUSTER_MAX_ZOOM}
        clusterRadius={CLUSTER_RADIUS}
      >
        <Layer
          id="event-clusters"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#f59e0b",
              10,
              "#d97706",
              25,
              "#b45309",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              20,
              10,
              28,
              25,
              36,
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

      {/* ── Popup ────────────────────────────────────────────────────────── */}
      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeOnClick={false}
        >
          {popupInfo.kind === "place" ? (
            <div className="min-w-[160px] p-1">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-xs font-medium text-gray-500">Place</span>
              </div>
              <p className="text-sm font-semibold">{popupInfo.name}</p>
              {popupInfo.neighborhood && (
                <p className="mt-0.5 text-xs text-gray-500">{popupInfo.neighborhood}</p>
              )}
              <a
                href={`/places/${popupInfo.id}`}
                className="mt-2 inline-block text-xs text-blue-600 hover:underline"
              >
                View details →
              </a>
            </div>
          ) : (
            <div className="min-w-[160px] p-1">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-gray-500">Event</span>
              </div>
              <p className="text-sm font-semibold">{popupInfo.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {new Date(popupInfo.starts_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {popupInfo.placeName && (
                <p className="mt-0.5 text-xs text-gray-500">@ {popupInfo.placeName}</p>
              )}
              <a
                href={`/events/${popupInfo.id}`}
                className="mt-2 inline-block text-xs text-amber-600 hover:underline"
              >
                View event →
              </a>
            </div>
          )}
        </Popup>
      )}
    </Map>
  )
}
