import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getClubId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data?.club_id as number;
}

// GET: Retrieve all stat weights for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) return NextResponse.json({ weights: {} }, { status: 200 });

  const clubId = await getClubId(supabase, userId);

  const { data, error } = await supabase
    .from("user_stat_weights")
    .select("stat_key, weight")
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (error) return NextResponse.json({ weights: {} }, { status: 200 });

  // Convert array to a Record<stat_key, weight>
  const weights: Record<string, number> = {};
  for (const row of data ?? []) {
    weights[row.stat_key] = Number(row.weight);
  }

  return NextResponse.json({ weights });
}

// PUT: Upsert all stat weights for the current user (bulk save)
export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const weightsInput: Record<string, number> = body.weights;

  if (!weightsInput || typeof weightsInput !== "object") {
    return NextResponse.json(
      { ok: false, error: "weights object is required" },
      { status: 400 }
    );
  }

  const clubId = await getClubId(supabase, userId);

  // Build rows for upsert — filter out entries with weight === 0 (we delete those)
  const toUpsert: { user_id: string; club_id: number; stat_key: string; weight: number; updated_at: string }[] = [];
  const toDeleteKeys: string[] = [];

  for (const [stat_key, weight] of Object.entries(weightsInput)) {
    const numWeight = Number(weight);
    if (numWeight === 0) {
      toDeleteKeys.push(stat_key);
    } else {
      toUpsert.push({
        user_id: userId,
        club_id: clubId,
        stat_key,
        weight: numWeight,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Delete zero-weight entries
  if (toDeleteKeys.length > 0) {
    const { error: delErr } = await supabase
      .from("user_stat_weights")
      .delete()
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .in("stat_key", toDeleteKeys);

    if (delErr)
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  // Upsert non-zero entries
  if (toUpsert.length > 0) {
    const { error: upsErr } = await supabase
      .from("user_stat_weights")
      .upsert(toUpsert, {
        onConflict: "user_id,club_id,stat_key",
      });

    if (upsErr)
      return NextResponse.json({ ok: false, error: upsErr.message }, { status: 500 });
  }

  // Return final state
  const { data: finalData, error: finErr } = await supabase
    .from("user_stat_weights")
    .select("stat_key, weight")
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (finErr)
    return NextResponse.json({ ok: false, error: finErr.message }, { status: 500 });

  const finalWeights: Record<string, number> = {};
  for (const row of finalData ?? []) {
    finalWeights[row.stat_key] = Number(row.weight);
  }

  return NextResponse.json({ ok: true, weights: finalWeights });
}
