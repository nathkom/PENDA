// SERVER ONLY — never import this file in client components.
// Used exclusively in Server Actions for transactional email.

import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)
