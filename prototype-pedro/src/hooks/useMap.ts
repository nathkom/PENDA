"use client"

import { useRef, useState } from "react"
import type { MapRef } from "react-map-gl"
import { DEFAULT_ZOOM, SEATTLE_CENTER } from "@/lib/mapbox"

export type ViewportState = {
  longitude: number
  latitude: number
  zoom: number
}

export function useMap() {
  const mapRef = useRef<MapRef>(null)
  const [viewport, setViewport] = useState<ViewportState>({
    longitude: SEATTLE_CENTER.lng,
    latitude: SEATTLE_CENTER.lat,
    zoom: DEFAULT_ZOOM,
  })

  return { mapRef, viewport, setViewport }
}
