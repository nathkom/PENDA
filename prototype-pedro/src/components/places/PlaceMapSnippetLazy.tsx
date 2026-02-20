"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const PlaceMapSnippet = dynamic(
  () =>
    import("@/components/places/PlaceMapSnippet").then(
      (m) => m.PlaceMapSnippet,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-lg" />,
  },
)

interface PlaceMapSnippetLazyProps {
  lat: number
  lng: number
  name?: string
}

export function PlaceMapSnippetLazy(props: PlaceMapSnippetLazyProps) {
  return <PlaceMapSnippet {...props} />
}
