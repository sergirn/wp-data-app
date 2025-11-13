import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Environment variables should be configured in the Connect section
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
