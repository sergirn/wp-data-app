import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const draftQuerySchema = z.object({
	draftKey: z.string().trim().min(1).max(160).optional(),
	clubId: z.coerce.number().int().positive()
});

const draftDeleteQuerySchema = draftQuerySchema.extend({
	draftKey: z.string().trim().min(1).max(160)
});

const draftBodySchema = z.object({
	draftKey: z.string().trim().min(1).max(160),
	clubId: z.number().int().positive(),
	matchId: z.number().int().positive().nullable(),
	payload: z.record(z.string(), z.unknown()),
	revision: z.number().int().nonnegative()
});

function canManageClub(profile: Awaited<ReturnType<typeof getCurrentProfile>>, clubId: number) {
	return Boolean(profile && (profile.is_super_admin || (profile.club_id === clubId && (profile.role === "admin" || profile.role === "coach"))));
}

async function getContext(clubId: number) {
	const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
	if (!profile || !supabase) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
	if (!canManageClub(profile, clubId)) return { error: NextResponse.json({ error: "unauthorized" }, { status: 403 }) };
	return { profile, supabase };
}

async function deleteExpiredDrafts(context: Exclude<Awaited<ReturnType<typeof getContext>>, { error: NextResponse }>, clubId: number) {
	await context.supabase
		.from("match_drafts")
		.delete()
		.eq("user_id", context.profile.id)
		.eq("club_id", clubId)
		.lte("expires_at", new Date().toISOString());
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const parsed = draftQuerySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });

	const context = await getContext(parsed.data.clubId);
	if ("error" in context) return context.error;
	await deleteExpiredDrafts(context, parsed.data.clubId);
	if (!parsed.data.draftKey) {
		const { data, error } = await context.supabase
			.from("match_drafts")
			.select("draft_key, club_id, user_id, match_id, payload, revision, created_at, updated_at, expires_at")
			.eq("user_id", context.profile.id)
			.eq("club_id", parsed.data.clubId)
			.gt("expires_at", new Date().toISOString())
			.order("updated_at", { ascending: false });

		if (error) return NextResponse.json({ error: "request_failed" }, { status: 500 });
		return NextResponse.json({ drafts: data ?? [] });
	}

	const { data, error } = await context.supabase
		.from("match_drafts")
		.select("draft_key, club_id, user_id, match_id, payload, revision, created_at, updated_at, expires_at")
		.eq("user_id", context.profile.id)
		.eq("club_id", parsed.data.clubId)
		.eq("draft_key", parsed.data.draftKey)
		.gt("expires_at", new Date().toISOString())
		.maybeSingle();

	if (error) return NextResponse.json({ error: "request_failed" }, { status: 500 });
	if (!data) return NextResponse.json({ draft: null }, { status: 404 });
	return NextResponse.json({ draft: data });
}

export async function PUT(request: Request) {
	const body = await request.json().catch(() => null);
	const parsed = draftBodySchema.safeParse(body);
	if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
	if (JSON.stringify(parsed.data.payload).length > 1_000_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

	const context = await getContext(parsed.data.clubId);
	if ("error" in context) return context.error;
	await deleteExpiredDrafts(context, parsed.data.clubId);

	const { data: current } = await context.supabase
		.from("match_drafts")
		.select("revision")
		.eq("user_id", context.profile.id)
		.eq("draft_key", parsed.data.draftKey)
		.maybeSingle();

	if (current && Number(current.revision) > parsed.data.revision) {
		return NextResponse.json({ error: "stale_revision" }, { status: 409 });
	}

	const { data, error } = await context.supabase
		.from("match_drafts")
		.upsert(
			{
				club_id: parsed.data.clubId,
				user_id: context.profile.id,
				match_id: parsed.data.matchId,
				draft_key: parsed.data.draftKey,
				payload: parsed.data.payload,
				revision: parsed.data.revision
			},
			{ onConflict: "user_id,draft_key" }
		)
		.select("draft_key, club_id, user_id, match_id, payload, revision, created_at, updated_at, expires_at")
		.single();

	if (error) return NextResponse.json({ error: "request_failed" }, { status: 500 });
	return NextResponse.json({ draft: data });
}

export async function DELETE(request: Request) {
	const url = new URL(request.url);
	const parsed = draftDeleteQuerySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });

	const context = await getContext(parsed.data.clubId);
	if ("error" in context) return context.error;

	const { error } = await context.supabase
		.from("match_drafts")
		.delete()
		.eq("user_id", context.profile.id)
		.eq("club_id", parsed.data.clubId)
		.eq("draft_key", parsed.data.draftKey);

	if (error) return NextResponse.json({ error: "request_failed" }, { status: 500 });
	return NextResponse.json({ success: true });
}
