// TODO: Before production launch, restrict NEXT_PUBLIC_MAPBOX_TOKEN to your domain
// in the Mapbox dashboard: https://account.mapbox.com/access-tokens/
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

export const SEATTLE_CENTER = { lat: 47.6062, lng: -122.3321 }

export const DEFAULT_ZOOM = 12

export const CLUSTER_MAX_ZOOM = 14

export const CLUSTER_RADIUS = 50
