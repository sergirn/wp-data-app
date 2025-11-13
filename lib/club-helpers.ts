import { getCurrentProfile } from "./auth"

/**
 * Gets the club ID to use for filtering data.
 * Accepts an optional clubId parameter from client context.
 * For super admins with a selected club in context, returns that club ID.
 * For regular users, returns their assigned club ID.
 */
export async function getActiveClubId(contextClubId?: number | null): Promise<number | null> {
  const profile = await getCurrentProfile()
  if (!profile) return null

  console.log(
    "[v0] getActiveClubId - profile.club_id:",
    profile.club_id,
    "contextClubId:",
    contextClubId,
    "is_super_admin:",
    profile.is_super_admin,
  )

  // Super admins can switch clubs via context
  if (profile.is_super_admin && contextClubId) {
    return contextClubId
  }

  // Regular users always see their assigned club
  return profile.club_id
}

/**
 * Filters a Supabase query by club_id based on the current user's permissions
 */
export async function applyClubFilter<T>(query: any, contextClubId?: number | null): Promise<any> {
  const clubId = await getActiveClubId(contextClubId)
  if (!clubId) return query

  console.log("[v0] applyClubFilter - filtering by club_id:", clubId)
  return query.eq("club_id", clubId)
}
