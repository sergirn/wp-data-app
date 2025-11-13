import { createClient as createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Profile, Club } from "./types"

export async function getCurrentUser() {
  const supabase = await createServerClient()
  if (!supabase) return null

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      // Only log unexpected errors, not missing session errors
      if (!error.message.includes("session") && !error.message.includes("Session")) {
        console.error("[v0] Auth error:", error.message)
      }
      return null
    }

    return user
  } catch (error) {
    console.error("[v0] Error getting user:", error)
    return null
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerClient()
  if (!supabase) return null

  const user = await getCurrentUser()
  if (!user) return null

  try {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    return profile
  } catch (error) {
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/login")
  }
  return user
}

export async function requireRole(allowedRoles: Array<"admin" | "coach" | "viewer">) {
  const profile = await getCurrentProfile()
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/")
  }
  return profile
}

export function canEdit(role: string | undefined): boolean {
  return role === "admin" || role === "coach"
}

export function isAdmin(role: string | undefined): boolean {
  return role === "admin"
}

export async function getCurrentClub(): Promise<Club | null> {
  const supabase = await createServerClient()
  if (!supabase) return null

  const profile = await getCurrentProfile()
  if (!profile || !profile.club_id) return null

  try {
    const { data: club } = await supabase.from("clubs").select("*").eq("id", profile.club_id).single()
    return club
  } catch (error) {
    return null
  }
}

export async function getAllClubs(): Promise<Club[]> {
  const supabase = await createServerClient()
  if (!supabase) return []

  const profile = await getCurrentProfile()
  if (!profile) return []

  try {
    // Super admins can see all clubs
    if (profile.is_super_admin) {
      const { data: clubs } = await supabase.from("clubs").select("*").order("name")
      return clubs || []
    }

    // Regular users only see their assigned club
    if (profile.club_id) {
      const { data: club } = await supabase.from("clubs").select("*").eq("id", profile.club_id).single()
      return club ? [club] : []
    }

    return []
  } catch (error) {
    return []
  }
}

export async function getCurrentClubId(): Promise<number | null> {
  const profile = await getCurrentProfile()
  return profile?.club_id || null
}
