"use client"

import "mapbox-gl/dist/mapbox-gl.css"
import Map, { Marker } from "react-map-gl"
import { MAPBOX_TOKEN } from "@/lib/mapbox"
import { MapPin } from "@/components/map/MapPin"

interface PlaceMapSnippetProps {
  lat: number
  lng: number
  name?: string
}

export function PlaceMapSnippet({ lat, lng, name }: PlaceMapSnippetProps) {
  return (
    <div className="h-48 overflow-hidden rounded-lg border">
      <Map
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 15,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        scrollZoom={false}
        dragPan={false}
        dragRotate={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        aria-label={name ? `Map showing location of ${name}` : "Location map"}
      >
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <MapPin />
        </Marker>
      </Map>
    </div>
  )
}
