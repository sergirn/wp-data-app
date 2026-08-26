import { NextResponse } from "next/server";
import { z } from "zod";

import { validateMatchData } from "@/lib/analysis/performance-insights";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
	status: z.enum(["pending_review", "reviewed", "locked"])
});

export async function PATCH(request: Request, context: RouteContext<"/api/matches/[id]/review">) {
	const [{ id }, profile, supabase, body] = await Promise.all([
		context.params,
		getCurrentProfile(),
		createClient(),
		request.json().catch(() => null)
	]);
	const matchId = Number(id);
	const parsed = bodySchema.safeParse(body);
	if (!Number.isInteger(matchId) || matchId <= 0 || !parsed.success) {
		return NextResponse.json({ error: "invalid_data" }, { status: 400 });
	}
	if (!profile || !supabase) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
	if (!profile.is_super_admin && !["admin", "coach"].includes(profile.role)) {
		return NextResponse.json({ error: "forbidden" }, { status: 403 });
	}

	let matchQuery = supabase.from("matches").select("*").eq("id", matchId);
	if (!profile.is_super_admin) {
		if (!profile.club_id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
		matchQuery = matchQuery.eq("club_id", profile.club_id);
	}
	const { data: match, error: matchError } = await matchQuery.maybeSingle();
	if (matchError) return NextResponse.json({ error: "request_failed" }, { status: 500 });
	if (!match) return NextResponse.json({ error: "not_found" }, { status: 404 });

	if (parsed.data.status !== "pending_review") {
		const [statsResult, actionsResult] = await Promise.all([
			supabase.from("match_stats").select("*, players:player_id(is_goalkeeper)").eq("match_id", matchId),
			supabase.from("match_actions").select("id", { count: "exact", head: true }).eq("match_id", matchId)
		]);
		if (statsResult.error || actionsResult.error) return NextResponse.json({ error: "request_failed" }, { status: 500 });
		const issues = validateMatchData(match, statsResult.data ?? [], actionsResult.count ?? 0);
		const blockers = issues.filter((issue) => issue.severity === "error");
		if (blockers.length > 0) {
			return NextResponse.json({ error: "review_blocked", issues: blockers }, { status: 409 });
		}
	}

	const now = new Date().toISOString();
	const update = parsed.data.status === "pending_review"
		? { review_status: "pending_review", reviewed_at: null, reviewed_by: null, locked_at: null, locked_by: null }
		: parsed.data.status === "reviewed"
			? { review_status: "reviewed", reviewed_at: now, reviewed_by: profile.id, locked_at: null, locked_by: null }
			: { review_status: "locked", reviewed_at: match.reviewed_at ?? now, reviewed_by: match.reviewed_by ?? profile.id, locked_at: now, locked_by: profile.id };

	const { data: updated, error: updateError } = await supabase
		.from("matches")
		.update(update)
		.eq("id", matchId)
		.select("review_status, reviewed_at, reviewed_by, locked_at, locked_by")
		.single();
	if (updateError) return NextResponse.json({ error: "request_failed" }, { status: 500 });
	return NextResponse.json({ match: updated });
}

