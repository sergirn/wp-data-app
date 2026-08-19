import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

// GET: devuelve los campos ocultos del usuario actual
export async function GET() {
	const t = await getTranslations("Api");
	const supabase = await createClient();
	if (!supabase) return NextResponse.json({ error: t("serviceNotConfigured") }, { status: 503 });
	const { data: auth } = await supabase.auth.getUser();
	const userId = auth?.user?.id;

	if (!userId) {
		return NextResponse.json({ hiddenStats: [] }, { status: 200 });
	}

	const { data, error } = await supabase.from("profile_hidden_stats").select("stat_key").eq("profile_id", userId);

	if (error) {
		return NextResponse.json({ hiddenStats: [], error: t("requestFailed") }, { status: 200 });
	}

	const hiddenStats = (data ?? []).map((row) => row.stat_key);

	return NextResponse.json({ hiddenStats });
}

// PUT: reemplaza todos los campos ocultos del usuario actual
export async function PUT(req: Request) {
	const t = await getTranslations("Api");
	const supabase = await createClient();
	if (!supabase) return NextResponse.json({ error: t("serviceNotConfigured") }, { status: 503 });
	const { data: auth } = await supabase.auth.getUser();
	const userId = auth?.user?.id;

	if (!userId) {
		return NextResponse.json({ ok: false, error: t("unauthenticated") }, { status: 401 });
	}

	const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", userId).single();

	if (profileError) {
		return NextResponse.json({ ok: false, error: t("requestFailed") }, { status: 500 });
	}

	if (!profile || (profile.role !== "admin" && profile.role !== "coach")) {
		return NextResponse.json({ ok: false, error: t("unauthorized") }, { status: 403 });
	}

	const body = await req.json();
	const hiddenStatsInput: string[] = Array.isArray(body.hiddenStats) ? body.hiddenStats : [];

	const hiddenStats = [...new Set(hiddenStatsInput)].filter((key) => typeof key === "string" && key.trim() !== "");

	// Borra todos los ocultos actuales del usuario
	const { error: deleteError } = await supabase.from("profile_hidden_stats").delete().eq("profile_id", userId);

	if (deleteError) {
		return NextResponse.json({ ok: false, error: t("requestFailed") }, { status: 500 });
	}

	// Inserta los nuevos
	if (hiddenStats.length > 0) {
		const rowsToInsert = hiddenStats.map((stat_key) => ({
			profile_id: userId,
			stat_key,
			updated_by: userId
		}));

		const { error: insertError } = await supabase.from("profile_hidden_stats").insert(rowsToInsert);

		if (insertError) {
			return NextResponse.json({ ok: false, error: t("requestFailed") }, { status: 500 });
		}
	}

	// Devuelve estado final
	const { data: finalData, error: finalError } = await supabase.from("profile_hidden_stats").select("stat_key").eq("profile_id", userId);

	if (finalError) {
		return NextResponse.json({ ok: false, error: t("requestFailed") }, { status: 500 });
	}

	const finalHiddenStats = (finalData ?? []).map((row) => row.stat_key);

	return NextResponse.json({ ok: true, hiddenStats: finalHiddenStats });
}
