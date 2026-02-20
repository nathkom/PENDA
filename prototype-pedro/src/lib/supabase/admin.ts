// IMPORT RESTRICTION: Only import this in Server Actions that require privilege
// escalation (e.g., approveOrganizerRequest). Never import in components/ or
// (public)/ routes.

import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
