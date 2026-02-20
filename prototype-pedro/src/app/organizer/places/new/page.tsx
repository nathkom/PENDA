import { PlaceForm } from "@/components/places/PlaceForm"

export default function NewPlacePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Create New Place</h2>
      <PlaceForm />
    </div>
  )
}
