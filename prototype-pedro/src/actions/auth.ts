"use server"

import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import {
  SignUpSchema,
  SignInSchema,
  type SignUpFormValues,
  type SignInFormValues,
} from "@/lib/validations/auth"

export async function signUp(data: SignUpFormValues) {
  const parsed = SignUpSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerClient()

  const { data: authData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.display_name,
      },
    },
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: authData, error: null }
}

export async function signIn(data: SignInFormValues) {
  const parsed = SignInSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerClient()

  const { data: authData, error } =
    await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

  if (error) {
    return { data: null, error: "Invalid email or password" }
  }

  return { data: authData, error: null }
}

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function signInWithGoogle() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { url: null, error: error.message }
  }

  return { url: data.url, error: null }
}

export async function requestMagicLink(email: string) {
  const supabase = await createServerClient()

  // Fire and forget — always return success to prevent email enumeration
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  return { error: null }
}

export async function updateProfile(data: { display_name: string }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any)
    .update({ display_name: data.display_name })
    .eq("id", user.id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: { display_name: data.display_name }, error: null }
}
