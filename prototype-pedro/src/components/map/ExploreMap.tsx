"use client"

import "mapbox-gl/dist/mapbox-gl.css"
import { useCallback, useRef, useState } from "react"
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
import type { Place } from "@/types"

type PopupInfo = {
  id: string
  name: string
  neighborhood: string | null
  longitude: number
  latitude: number
}

function placesToGeoJSON(
  places: Place[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [place.lng, place.lat],
      },
      properties: {
        id: place.id,
        name: place.name,
        neighborhood: place.neighborhood,
      },
    })),
  }
}

interface ExploreMapProps {
  places: Place[]
  onPlaceSelect?: (id: string) => void
}

export default function ExploreMap({ places, onPlaceSelect }: ExploreMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: SEATTLE_CENTER.lng,
    latitude: SEATTLE_CENTER.lat,
    zoom: DEFAULT_ZOOM,
  })
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)

  const geojson = placesToGeoJSON(places)

  const onClick = useCallback(
    (evt: MapLayerMouseEvent) => {
      const features = evt.features
      if (!features || features.length === 0) {
        setPopupInfo(null)
        return
      }

      const feature = features[0]
      const props = feature.properties
      if (!props) return

      // Cluster click → zoom in
      if (props.cluster) {
        const coords = (feature.geometry as GeoJSON.Point).coordinates
        mapRef.current?.flyTo({
          center: [coords[0] as number, coords[1] as number],
          zoom: viewState.zoom + 2,
          duration: 500,
        })
        return
      }

      // Individual point click → show popup
      const coords = (feature.geometry as GeoJSON.Point).coordinates
      setPopupInfo({
        id: props.id as string,
        name: props.name as string,
        neighborhood: props.neighborhood as string | null,
        longitude: coords[0] as number,
        latitude: coords[1] as number,
      })
      onPlaceSelect?.(props.id as string)
    },
    [viewState.zoom, onPlaceSelect],
  )

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={["clusters", "unclustered-point"]}
      onClick={onClick}
      style={{ width: "100%", height: "100%" }}
      cursor="auto"
    >
      <Source
        id="places"
        type="geojson"
        data={geojson}
        cluster={true}
        clusterMaxZoom={CLUSTER_MAX_ZOOM}
        clusterRadius={CLUSTER_RADIUS}
      >
        {/* Cluster circles */}
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

        {/* Cluster count label */}
        <Layer
          id="cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          }}
          paint={{
            "text-color": "#ffffff",
          }}
        />

        {/* Individual points */}
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

      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeOnClick={false}
        >
          <div className="min-w-[160px] p-1">
            <p className="text-sm font-semibold">{popupInfo.name}</p>
            {popupInfo.neighborhood && (
              <p className="mt-0.5 text-xs text-gray-500">
                {popupInfo.neighborhood}
              </p>
            )}
            <a
              href={`/places/${popupInfo.id}`}
              className="mt-2 inline-block text-xs text-blue-600 hover:underline"
            >
              View details →
            </a>
          </div>
        </Popup>
      )}
    </Map>
  )
}
