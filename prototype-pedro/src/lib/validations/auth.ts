import { z } from "zod"

export const SignUpSchema = z
  .object({
    display_name: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(50, "Display name must be at most 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

export const SignInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const MagicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

export type SignUpFormValues = z.infer<typeof SignUpSchema>
export type SignInFormValues = z.infer<typeof SignInSchema>
export type MagicLinkFormValues = z.infer<typeof MagicLinkSchema>
