"use client"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp"

interface EventImageUploadProps {
  eventId: string
  currentPath: string | null
  onUploadComplete: (path: string) => void
}

export default function EventImageUpload({
  eventId,
  currentPath,
  onUploadComplete,
}: EventImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  const getImageUrl = useCallback(
    (path: string) => {
      return `${supabaseUrl}/storage/v1/object/public/${path}`
    },
    [supabaseUrl],
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Client-side size check
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 5 MB.")
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("eventId", eventId)

      const res = await fetch("/api/upload/event-image", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Upload failed")
        return
      }

      setPreviewUrl(getImageUrl(json.path))
      onUploadComplete(json.path)
    } catch {
      setError("Upload failed. Please try again.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleRemove() {
    setPreviewUrl(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const displayUrl = previewUrl || (currentPath ? getImageUrl(currentPath) : null)

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed",
          error ? "border-destructive" : "border-muted-foreground/25",
          !displayUrl && "cursor-pointer hover:border-muted-foreground/50",
        )}
        onClick={() => !displayUrl && !uploading && inputRef.current?.click()}
      >
        {displayUrl ? (
          <>
            <Image
              src={displayUrl}
              alt="Event image preview"
              width={600}
              height={400}
              className="max-h-[300px] w-auto rounded-lg object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <p className="text-sm">Click to upload an image</p>
            <p className="text-xs">JPEG, PNG, or WebP (max 5 MB)</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {!displayUrl && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Choose image
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
