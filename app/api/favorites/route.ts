import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // ajusta a tu path

async function getClubId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data?.club_id as number;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) return NextResponse.json({ keys: [] }, { status: 200 });

  const url = new URL(req.url);
  const playerId = Number(url.searchParams.get("playerId"));
  if (!playerId) return NextResponse.json({ keys: [] }, { status: 200 });

  const clubId = await getClubId(supabase, userId);

  const { data, error } = await supabase
    .from("user_player_stat_favorites")
    .select("stat_key")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("player_id", playerId);

  if (error) return NextResponse.json({ keys: [] }, { status: 200 });

  return NextResponse.json({ keys: data.map((x: any) => x.stat_key) });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const playerId = Number(body.playerId);
  const statKey = String(body.statKey || "");

  if (!playerId || !statKey) return NextResponse.json({ ok: false }, { status: 400 });

  const clubId = await getClubId(supabase, userId);

  // ¿Existe ya?
  const { data: existing } = await supabase
    .from("user_player_stat_favorites")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("player_id", playerId)
    .eq("stat_key", statKey)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("user_player_stat_favorites")
      .delete()
      .eq("id", existing.id);

    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true, active: false });
  }

  const { error } = await supabase.from("user_player_stat_favorites").insert({
    club_id: clubId,
    user_id: userId,
    player_id: playerId,
    stat_key: statKey,
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, active: true });
}
