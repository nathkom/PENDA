import { NextResponse } from "next/server"
import sharp from "sharp"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { AppRole } from "@/types"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"])

export async function POST(request: Request) {
  try {
    // Step 1: Auth check
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Step 2: Role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = (profile as { role: AppRole } | null)?.role
    if (!role || !["organizer", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Step 3: Read form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const eventId = formData.get("eventId") as string | null

    if (!file || !eventId) {
      return NextResponse.json(
        { error: "Missing file or eventId" },
        { status: 400 },
      )
    }

    // Step 4: File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 413 },
      )
    }

    // Step 5: MIME validation via magic bytes
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { fileTypeFromBuffer } = await import("file-type")
    const fileTypeResult = await fileTypeFromBuffer(buffer)

    if (!fileTypeResult || !ALLOWED_MIMES.has(fileTypeResult.mime)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 400 },
      )
    }

    // Step 6: Process with sharp — resize + convert to WebP
    const processedBuffer = await sharp(buffer)
      .resize(1200, undefined, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()

    // Step 7: Generate storage path
    const storagePath = `${eventId}/${crypto.randomUUID()}.webp`

    // Step 8: Upload using admin client (bypasses RLS)
    const adminClient = createAdminClient()
    const { error: uploadError } = await adminClient.storage
      .from("event-images")
      .upload(storagePath, processedBuffer, {
        contentType: "image/webp",
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 },
      )
    }

    // Step 9: Return the storage path
    return NextResponse.json({ path: `event-images/${storagePath}` })
  } catch (error) {
    console.error("Image upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
