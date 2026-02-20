"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"

import {
  SignInSchema,
  MagicLinkSchema,
  type SignInFormValues,
  type MagicLinkFormValues,
} from "@/lib/validations/auth"
import { signIn, signInWithGoogle, requestMagicLink } from "@/actions/auth"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function SignInForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const passwordForm = useForm<SignInFormValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" },
  })

  const magicLinkForm = useForm<MagicLinkFormValues>({
    resolver: zodResolver(MagicLinkSchema),
    defaultValues: { email: "" },
  })

  async function onPasswordSubmit(values: SignInFormValues) {
    const result = await signIn(values)
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: result.error,
      })
      return
    }
    router.push("/")
    router.refresh()
  }

  async function onMagicLinkSubmit(values: MagicLinkFormValues) {
    await requestMagicLink(values.email)
    setMagicLinkSent(true)
  }

  async function handleGoogleSignIn() {
    const result = await signInWithGoogle()
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Google sign in failed",
        description: result.error,
      })
      return
    }
    if (result.url) {
      router.push(result.url)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Email & Password</TabsTrigger>
          <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4">
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting
                  ? "Signing in..."
                  : "Sign in"}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="magic-link" className="space-y-4">
          {magicLinkSent ? (
            <div className="rounded-md border border-border bg-muted/50 p-4 text-center text-sm">
              <p className="font-medium">Check your email</p>
              <p className="mt-1 text-muted-foreground">
                We sent a magic link to your email address. Click the link to
                sign in.
              </p>
            </div>
          ) : (
            <Form {...magicLinkForm}>
              <form
                onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={magicLinkForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={magicLinkForm.formState.isSubmitting}
                >
                  {magicLinkForm.formState.isSubmitting
                    ? "Sending..."
                    : "Send magic link"}
                </Button>
              </form>
            </Form>
          )}
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
