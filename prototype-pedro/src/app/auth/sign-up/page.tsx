import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { SignUpForm } from "@/components/auth/SignUpForm"

export default async function SignUpPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join Seattle Third Spaces
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  )
}
