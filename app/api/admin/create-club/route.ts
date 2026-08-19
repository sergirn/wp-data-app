import { NextResponse } from "next/server"
import { z } from "zod"
import { getTranslations } from "next-intl/server"

import { getCurrentProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const t = await getTranslations("Api")
  const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, t("invalidColor"))
  const clubSchema = z.object({
    name: z.string().trim().min(1).max(120),
    shortName: z.string().trim().min(1).max(30),
    logoUrl: z.string().url().max(2048).nullable().optional(),
    primaryColor: colorSchema.nullable().optional(),
    secondaryColor: colorSchema.nullable().optional(),
    competitionIds: z.array(z.number().int().positive()).max(100).default([]),
  })
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: t("unauthenticated") }, { status: 401 })
  if (!profile.is_super_admin) return NextResponse.json({ error: t("unauthorized") }, { status: 403 })

  const parsed = clubSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? t("invalidData") }, { status: 400 })
  }

  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: t("serviceNotConfigured") }, { status: 503 })

  const { name, shortName, logoUrl, primaryColor, secondaryColor, competitionIds } = parsed.data
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      name,
      short_name: shortName,
      logo_url: logoUrl || null,
      primary_color: primaryColor || "#1e40af",
      secondary_color: secondaryColor || "#dc2626",
    })
    .select()
    .single()

  if (clubError || !club) {
    console.error("Failed to create club", clubError)
    return NextResponse.json({ error: t("clubCreationFailed") }, { status: 500 })
  }

  if (competitionIds.length > 0) {
    const rows = [...new Set(competitionIds)].map((competitionId) => ({
      club_id: club.id,
      competition_id: competitionId,
    }))
    const { error: relationError } = await supabase.from("club_competitions").insert(rows)
    if (relationError) {
      await supabase.from("clubs").delete().eq("id", club.id)
      console.error("Failed to associate club competitions", relationError)
      return NextResponse.json({ error: t("clubCompetitionsFailed") }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, club }, { status: 201 })
}
