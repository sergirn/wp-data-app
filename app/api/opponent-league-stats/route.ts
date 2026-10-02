import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import {
	getExternalTeamsUrl,
	parseExternalOpponentSnapshot,
	parseExternalTeamIndex,
	normalizeExternalTeamName,
	resolveExternalTeam,
	type ExternalOpponentSnapshot,
	type ExternalTeamIndexEntry
} from "@/lib/external/lewaterpolo-opponent";

export const runtime = "nodejs";

const WEEK_CACHE_SECONDS = 60 * 60 * 24 * 8;
const lastKnown = new Map<string, { data: ExternalOpponentSnapshot; fetchedAt: string; weekOf: string }>();
const lastKnownByRequest = new Map<string, { data: ExternalOpponentSnapshot; fetchedAt: string; weekOf: string }>();
const lastKnownTeamIndexes = new Map<string, { teams: Array<Pick<ExternalTeamIndexEntry, "name" | "crestUrl">>; fetchedAt: string; weekOf: string }>();

function isSupportedSeason(value: string | null): value is string {
	if (!value || !/^\d{4}-\d{4}$/.test(value)) return false;
	const [start, end] = value.split("-").map(Number);
	return start >= 2020 && start <= 2035 && end === start + 1;
}

function mondayInMadrid(date = new Date()) {
	const values = Object.fromEntries(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: "Europe/Madrid",
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		}).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
	);
	const localDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12));
	const daysSinceMonday = (localDate.getUTCDay() + 6) % 7;
	localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);
	return localDate.toISOString().slice(0, 10);
}

async function fetchHtml(url: string) {
	const response = await fetch(url, {
		cache: "no-store",
		headers: {
			Accept: "text/html,application/xhtml+xml",
			"User-Agent": "WaterpoloStats/1.0 (+private opponent scouting dashboard)"
		},
		signal: AbortSignal.timeout(8_000)
	});
	if (!response.ok) throw new Error(`External source returned ${response.status}`);
	if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) throw new Error("External source returned an unexpected content type");
	return response.text();
}

const getWeeklyTeamIndex = unstable_cache(
	async (season: string, weekOf: string) => {
		void weekOf;
		return parseExternalTeamIndex(await fetchHtml(getExternalTeamsUrl(season)));
	},
	["lewaterpolo-opponent-team-index-v1"],
	{ revalidate: WEEK_CACHE_SECONDS }
);

const getWeeklyOpponentSnapshot = unstable_cache(
	async (season: string, weekOf: string, entry: ExternalTeamIndexEntry) => {
		void weekOf;
		const fetchedAt = new Date().toISOString();
		const data = parseExternalOpponentSnapshot(await fetchHtml(`${entry.url}/estadisticas/`), season, entry);
		return { data, fetchedAt };
	},
	["lewaterpolo-opponent-detail-v1"],
	{ revalidate: WEEK_CACHE_SECONDS }
);

function headers() {
	return {
		"Cache-Control": "private, max-age=300",
		"X-Content-Type-Options": "nosniff"
	};
}

export async function GET(request: Request) {
	const searchParams = new URL(request.url).searchParams;
	const season = searchParams.get("season");
	const listOnly = searchParams.get("list") === "1";
	const name = searchParams.get("name")?.trim() ?? "";
	const aliases = searchParams.getAll("alias").map((alias) => alias.trim()).filter(Boolean).slice(0, 12);

	if (!isSupportedSeason(season) || (!listOnly && (name.length < 2 || name.length > 120 || aliases.some((alias) => alias.length > 120)))) {
		return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: headers() });
	}

	const weekOf = mondayInMadrid();
	if (listOnly) {
		try {
			const teams = (await getWeeklyTeamIndex(season, weekOf)).map(({ name: teamName, crestUrl }) => ({ name: teamName, crestUrl }));
			const result = { teams, fetchedAt: new Date().toISOString(), weekOf };
			lastKnownTeamIndexes.set(season, result);
			return NextResponse.json({ ...result, stale: false }, { headers: headers() });
		} catch (error) {
			console.error("[opponent-league-stats] External team index unavailable:", error);
			const cached = lastKnownTeamIndexes.get(season);
			if (cached) return NextResponse.json({ ...cached, stale: true }, { headers: headers() });
			return NextResponse.json({ error: "EXTERNAL_DATA_UNAVAILABLE" }, { status: 503, headers: { ...headers(), "Retry-After": "300" } });
		}
	}

	const requestKey = `${season}:${normalizeExternalTeamName(name)}`;
	let fallbackKey: string | null = null;
	try {
		const teams = await getWeeklyTeamIndex(season, weekOf);
		// A club-managed alias is the most intentional identity signal. The
		// opponent name remains a fallback for existing rivals without aliases.
		const entry = (aliases.length > 0 ? resolveExternalTeam(teams, aliases) : null) ?? resolveExternalTeam(teams, [name]);
		if (!entry) return NextResponse.json({ error: "TEAM_NOT_FOUND" }, { status: 404, headers: headers() });

		fallbackKey = `${season}:${entry.url}`;
		const result = await getWeeklyOpponentSnapshot(season, weekOf, entry);
		lastKnown.set(fallbackKey, { ...result, weekOf });
		lastKnownByRequest.set(requestKey, { ...result, weekOf });
		return NextResponse.json({ ...result, weekOf, stale: false }, { headers: headers() });
	} catch (error) {
		console.error("[opponent-league-stats] External data unavailable:", error);
		const cached = (fallbackKey ? lastKnown.get(fallbackKey) : null) ?? lastKnownByRequest.get(requestKey);
		if (cached) return NextResponse.json({ ...cached, stale: true }, { headers: headers() });
		return NextResponse.json({ error: "EXTERNAL_DATA_UNAVAILABLE" }, { status: 503, headers: { ...headers(), "Retry-After": "300" } });
	}
}
