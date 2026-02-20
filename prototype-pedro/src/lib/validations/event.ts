import { z } from "zod"

export const EventSchema = z
  .object({
    place_id: z.string().uuid("A valid place must be selected"),
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title must be at most 150 characters"),
    description: z
      .string()
      .max(2000, "Description must be at most 2000 characters")
      .optional()
      .or(z.literal("")),
    starts_at: z.string().min(1, "Start date/time is required"),
    ends_at: z.string().optional().or(z.literal("")),
    is_free: z.boolean().optional(),
    indoors: z.boolean().default(false),
    outdoors: z.boolean().default(false),
    primary_image_path: z.string().optional().or(z.literal("")),
    tags: z.array(z.string().uuid()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.indoors && !data.outdoors) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of indoors or outdoors must be selected",
        path: ["indoors"],
      })
    }

    if (data.ends_at && data.starts_at && data.ends_at <= data.starts_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["ends_at"],
      })
    }
  })

export const SubmitEventSchema = z
  .object({
    place_id: z.string().uuid("A valid place must be selected"),
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title must be at most 150 characters"),
    description: z
      .string()
      .max(2000, "Description must be at most 2000 characters")
      .optional()
      .or(z.literal("")),
    starts_at: z.string().min(1, "Start date/time is required"),
    ends_at: z.string().optional().or(z.literal("")),
    is_free: z.boolean().optional(),
    indoors: z.boolean().default(false),
    outdoors: z.boolean().default(false),
    primary_image_path: z
      .string()
      .min(1, "An image is required before submitting for review"),
    tags: z.array(z.string().uuid()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.indoors && !data.outdoors) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of indoors or outdoors must be selected",
        path: ["indoors"],
      })
    }

    if (data.ends_at && data.starts_at && data.ends_at <= data.starts_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["ends_at"],
      })
    }
  })

export type EventFormValues = z.infer<typeof EventSchema>
export type SubmitEventFormValues = z.infer<typeof SubmitEventSchema>
