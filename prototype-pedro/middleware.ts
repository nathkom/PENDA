import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/database.types"

type AppRole = Database["public"]["Enums"]["app_role"]

async function getUserRole(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<AppRole | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  return (data as { role: AppRole } | null)?.role ?? null
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options: CookieOptions
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not use getSession() alone on the server — it reads the
  // cookie without re-validating the JWT. getUser() verifies the token with
  // the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // --- Route protection ---

  // /organizer/* → requires role IN ('organizer', 'admin')
  if (pathname.startsWith("/organizer")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/sign-in"
      return NextResponse.redirect(url)
    }

    const role = await getUserRole(supabase, user.id)

    if (!role || !["organizer", "admin"].includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/sign-in"
      return NextResponse.redirect(url)
    }
  }

  // /admin/* → requires role = 'admin'
  // Redirect to '/' (NOT /auth/sign-in) to avoid revealing that an admin area exists
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    const role = await getUserRole(supabase, user.id)

    if (role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/organizer/:path*",
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
