import { NextResponse } from "next/server";

import {
	getLeWaterpoloStandingsUrl,
	parseLeWaterpoloStandings,
	type LeagueStandings
} from "@/lib/external/lewaterpolo-standings";

export const runtime = "nodejs";

const REVALIDATE_SECONDS = 60 * 60 * 24 * 2;
const memoryFallback = new Map<string, { data: LeagueStandings; fetchedAt: string }>();

function isSupportedSeason(value: string | null): value is string {
	if (!value || !/^\d{4}-\d{4}$/.test(value)) return false;
	const [start, end] = value.split("-").map(Number);
	return start >= 2020 && start <= 2035 && end === start + 1;
}

function responseHeaders() {
	return {
		"Cache-Control": "private, max-age=300",
		"X-Content-Type-Options": "nosniff"
	};
}

export async function GET(request: Request) {
	const season = new URL(request.url).searchParams.get("season");
	if (!isSupportedSeason(season)) {
		return NextResponse.json({ error: "INVALID_SEASON" }, { status: 400, headers: responseHeaders() });
	}

	const sourceUrl = getLeWaterpoloStandingsUrl(season);

	try {
		const response = await fetch(sourceUrl, {
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": "WaterpoloStats/1.0 (+private standings dashboard)"
			},
			next: { revalidate: REVALIDATE_SECONDS },
			signal: AbortSignal.timeout(8_000)
		});

		if (!response.ok) throw new Error(`Standings source returned ${response.status}`);
		const contentType = response.headers.get("content-type") ?? "";
		if (!contentType.toLowerCase().includes("text/html")) throw new Error("Standings source returned an unexpected content type");

		const data = parseLeWaterpoloStandings(await response.text(), season);
		const fetchedAt = new Date().toISOString();
		memoryFallback.set(season, { data, fetchedAt });

		return NextResponse.json(
			{ data, fetchedAt, sourceUrl, stale: false },
			{ headers: responseHeaders() }
		);
	} catch (error) {
		console.error("[standings] Unable to refresh external standings:", error);
		const fallback = memoryFallback.get(season);
		if (fallback) {
			return NextResponse.json(
				{ data: fallback.data, fetchedAt: fallback.fetchedAt, sourceUrl, stale: true },
				{ headers: responseHeaders() }
			);
		}

		return NextResponse.json(
			{ error: "STANDINGS_UNAVAILABLE", sourceUrl },
			{ status: 503, headers: { ...responseHeaders(), "Retry-After": "300" } }
		);
	}
}
