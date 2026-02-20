import { z } from "zod"

export const PlaceSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name must be at most 100 characters"),
    description: z
      .string()
      .max(1000, "Description must be at most 1000 characters")
      .optional()
      .or(z.literal("")),
    address: z.string().min(1, "Address is required"),
    neighborhood: z.string().optional().or(z.literal("")),
    zip: z
      .string()
      .regex(/^\d{5}$/, "ZIP must be exactly 5 digits")
      .optional()
      .or(z.literal("")),
    lat: z.number({ required_error: "Latitude is required" }),
    lng: z.number({ required_error: "Longitude is required" }),
    indoors: z.boolean().default(false),
    outdoors: z.boolean().default(false),
    is_free: z.boolean().optional(),
    accessibility: z.record(z.unknown()).optional(),
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
  })

export type PlaceFormValues = z.infer<typeof PlaceSchema>
