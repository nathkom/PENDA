import { z } from "zod"

export const ReviewSchema = z.object({
  target_type: z.enum(["place", "event"]),
  target_id: z.string().uuid({ message: "Invalid target ID" }),
  rating: z
    .number()
    .int()
    .min(1, { message: "Rating must be at least 1" })
    .max(5, { message: "Rating must be at most 5" }),
  body: z
    .string()
    .max(1000, { message: "Review body must be 1000 characters or fewer" })
    .optional(),
})

export type ReviewFormValues = z.infer<typeof ReviewSchema>
