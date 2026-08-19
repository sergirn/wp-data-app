import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getTranslations } from "next-intl/server"

import { getCurrentProfile } from "@/lib/auth"

function getCreateUserSchema(selectClubMessage: string) {
  return z.object({
    email: z.string().trim().email().max(320),
    password: z.string().min(8).max(128),
    fullName: z.string().trim().max(120).optional().default(""),
    role: z.enum(["admin", "coach", "viewer"]),
    clubId: z.number().int().positive().nullable(),
    isSuperAdmin: z.boolean().default(false),
  }).superRefine((value, ctx) => {
    if (!value.isSuperAdmin && value.clubId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clubId"],
        message: selectClubMessage,
      })
    }
  })
}

export async function POST(request: Request) {
  const t = await getTranslations("Api")
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: t("unauthenticated") }, { status: 401 })
  if (!profile.is_super_admin) return NextResponse.json({ error: t("unauthorized") }, { status: 403 })

  const parsed = getCreateUserSchema(t("selectClub")).safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? t("invalidData") }, { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: t("serviceNotConfigured") }, { status: 503 })
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { email, password, fullName, role, clubId, isSuperAdmin } = parsed.data

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email, role },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: t("userCreationFailed") }, { status: 400 })
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: authData.user.id,
    email,
    full_name: fullName || email,
    role,
    club_id: isSuperAdmin ? null : clubId,
    is_super_admin: isSuperAdmin,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    console.error("Failed to create user profile", profileError)
    return NextResponse.json({ error: t("userProfileCreationFailed") }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: authData.user.id }, { status: 201 })
}
