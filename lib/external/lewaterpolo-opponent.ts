export type ExternalMetricKey =
	| "averageRating"
	| "goalsFor"
	| "goalsAgainst"
	| "attackEfficiency"
	| "goalkeeperSaves"
	| "powerPlay"
	| "evenStrength"
	| "exclusionsDrawn";

export type ExternalTeamMetric = {
	key: ExternalMetricKey;
	value: string;
	rank: string | null;
};

export type ExternalPlayerRanking = {
	id: string;
	name: string;
	photoUrl: string | null;
	matches: number;
	value: string;
	perMatch: string | null;
};

export type ExternalOpponentSnapshot = {
	team: {
		name: string;
		crestUrl: string | null;
		sourceUrl: string;
	};
	season: string;
	classification: {
		position: number;
		points: number;
		played: number;
		wins: number;
		draws: number;
		losses: number;
	};
	metrics: ExternalTeamMetric[];
	ranks: {
		attack: number | null;
		defense: number | null;
		efficiency: number | null;
		totalTeams: number | null;
	};
	form: Array<"W" | "D" | "L">;
	topScorers: ExternalPlayerRanking[];
	topRated: ExternalPlayerRanking[];
	mostUsed: ExternalPlayerRanking[];
};

export type ExternalTeamIndexEntry = {
	name: string;
	url: string;
	crestUrl: string | null;
};

const ENTITIES: Record<string, string> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	nbsp: " ",
	quot: '"',
	"#039": "'"
};

function decodeHtml(value: string) {
	return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, key: string) => {
		if (key.startsWith("#x") || key.startsWith("#X")) {
			const codePoint = Number.parseInt(key.slice(2), 16);
			return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
		}
		if (key.startsWith("#")) {
			const codePoint = Number.parseInt(key.slice(1), 10);
			return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
		}
		return ENTITIES[key.toLowerCase()] ?? entity;
	});
}

function textContent(value: string) {
	return decodeHtml(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

function attribute(value: string, name: string) {
	const match = value.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
	return match ? decodeHtml(match[1]).trim() : "";
}

function classContent(value: string, className: string) {
	const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = value.match(new RegExp(`<[^>]+class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"));
	return match ? textContent(match[1]) : "";
}

function safeImageUrl(value: string) {
	return /^https:\/\/storage\.lewaterpolo\.com\//i.test(value) ? value : null;
}

function integer(value: string) {
	const parsed = Number.parseInt(value.replace(/[^0-9-]/g, ""), 10);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function normalizeExternalTeamName(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\b(club natacio|club nautico|waterpolo)\b/g, "")
		.replace(/[^a-z0-9]/g, "");
}

export function parseExternalTeamIndex(html: string): ExternalTeamIndexEntry[] {
	if (html.length < 5_000 || html.length > 1_000_000) throw new Error("Unexpected team index size");

	const entries: ExternalTeamIndexEntry[] = [];
	const anchors = html.matchAll(/<a\b([^>]*class=["'][^"']*\bl26c-team\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi);
	for (const match of anchors) {
		const href = attribute(match[1], "href");
		if (!/^https:\/\/lewaterpolo\.com\/equipo\/[0-9]+-[a-z0-9-]+\/?$/i.test(href)) continue;

		const name = textContent(match[2].match(/<span\b[^>]*class=["'][^"']*l26c-team__txt[^"']*["'][^>]*>\s*<b>([\s\S]*?)<\/b>/i)?.[1] ?? "");
		const crestTag = match[2].match(/<img\b[^>]*class=["'][^"']*\bl26-crest\b[^"']*["'][^>]*>/i)?.[0] ?? "";
		if (!name) continue;

		entries.push({ name, url: href.replace(/\/$/, ""), crestUrl: safeImageUrl(attribute(crestTag, "src")) });
	}

	if (entries.length < 6 || entries.length > 30) throw new Error("Implausible number of external teams");
	return entries;
}

function matchScore(query: string, team: string) {
	if (!query || !team) return 0;
	if (query === team) return 1_000;
	if (query.length < 6 || team.length < 6) return 0;
	if (query.includes(team) || team.includes(query)) return 500 + Math.round((Math.min(query.length, team.length) / Math.max(query.length, team.length)) * 100);
	return 0;
}

export function resolveExternalTeam(entries: ExternalTeamIndexEntry[], names: string[]) {
	const queries = names.map(normalizeExternalTeamName).filter((name) => name.length >= 3);
	const ranked = entries
		.map((entry) => ({ entry, score: Math.max(0, ...queries.map((query) => matchScore(query, normalizeExternalTeamName(entry.name)))) }))
		.filter((candidate) => candidate.score > 0)
		.sort((a, b) => b.score - a.score);

	if (ranked.length === 0) return null;
	if (ranked[1] && ranked[0].score === ranked[1].score) return null;
	return ranked[0].entry;
}

const METRIC_KEYS: Record<string, ExternalMetricKey> = {
	"valoracion media": "averageRating",
	"goles a favor": "goalsFor",
	"goles en contra": "goalsAgainst",
	"efectividad en ataque": "attackEfficiency",
	"paradas de porteria": "goalkeeperSaves",
	"tiro en superioridad": "powerPlay",
	"tiro en igualdad": "evenStrength",
	"expulsiones provocadas": "exclusionsDrawn"
};

function normalizedLabel(value: string) {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function parseMetrics(html: string) {
	const metrics: ExternalTeamMetric[] = [];
	for (const match of html.matchAll(/<div\b[^>]*class=["'][^"']*\bl26t-tile\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
		const label = classContent(match[1], "l26t-tile__label");
		const key = METRIC_KEYS[normalizedLabel(label)];
		const value = classContent(match[1], "l26t-tile__value");
		if (!key || !value || metrics.some((metric) => metric.key === key)) continue;
		metrics.push({ key, value, rank: classContent(match[1], "l26t-tile__rank") || null });
	}
	return metrics;
}

function parseRanks(html: string) {
	const result = { attack: null, defense: null, efficiency: null, totalTeams: null } as ExternalOpponentSnapshot["ranks"];
	for (const match of html.matchAll(/<div\b[^>]*class=["'][^"']*\bl26t-rankbadge\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
		const position = integer(textContent(match[1].match(/<b[^>]*>([\s\S]*?)<\/b>/i)?.[1] ?? ""));
		const label = textContent(match[1].match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "");
		const total = label.match(/de\s+(\d+)/i)?.[1];
		if (total) result.totalTeams = Number(total);
		if (/ataque/i.test(label)) result.attack = position;
		else if (/defensa/i.test(label)) result.defense = position;
		else if (/eficiencia/i.test(label)) result.efficiency = position;
	}
	return result;
}

function panelHtml(html: string, panel: string) {
	const start = html.search(new RegExp(`data-l26-panel=["']${panel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i"));
	if (start < 0) return "";
	const tableStart = html.indexOf("<table", start);
	const tableEnd = html.indexOf("</table>", tableStart);
	return tableStart >= 0 && tableEnd >= 0 ? html.slice(tableStart, tableEnd + 8) : "";
}

function parsePlayerRanking(html: string, panel: string): ExternalPlayerRanking[] {
	const table = panelHtml(html, panel);
	const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
	const players: ExternalPlayerRanking[] = [];

	for (const row of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
		const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
		if (cells.length < 5) continue;
		const link = cells[1].match(/<a\b[^>]*class=["'][^"']*\bl26t-plink\b[^"']*["'][^>]*>/i)?.[0] ?? "";
		const href = attribute(link, "href");
		const image = cells[1].match(/<img\b[^>]*class=["'][^"']*\bl26-avatar\b[^"']*["'][^>]*>/i)?.[0] ?? "";
		const name = textContent(cells[1].match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? attribute(image, "alt"));
		const matches = integer(textContent(cells[2]));
		if (!name || !Number.isFinite(matches)) continue;
		players.push({
			id: href.match(/\/jugador\/(\d+)/i)?.[1] ?? `${panel}-${players.length}`,
			name,
			photoUrl: safeImageUrl(attribute(image, "src")),
			matches,
			value: textContent(cells[3]),
			perMatch: textContent(cells[4]) || null
		});
		if (players.length === 5) break;
	}
	return players;
}

function parseForm(html: string) {
	const start = html.indexOf("Racha de resultados");
	if (start < 0) return [];
	const end = html.indexOf("</section>", start);
	const section = html.slice(start, end > start ? end : start + 4_000);
	return [...section.matchAll(/class=["']([^"']*\bl26-form__pill[^"']*)["']/gi)].flatMap((match) => {
		const classes = match[1].toLowerCase();
		if (classes.includes("--w")) return ["W" as const];
		if (classes.includes("--d")) return ["D" as const];
		if (classes.includes("--l")) return ["L" as const];
		return [];
	}).slice(0, 5);
}

export function parseExternalOpponentSnapshot(html: string, season: string, entry: ExternalTeamIndexEntry): ExternalOpponentSnapshot {
	if (html.length < 15_000 || html.length > 2_000_000) throw new Error("Unexpected team statistics document size");
	const seasonStart = Number(season.slice(0, 4));
	const detectedStart = Number(html.match(/DHM\s+(\d{4})[/-]\d{2,4}/i)?.[1]);
	if (!Number.isFinite(detectedStart) || detectedStart !== seasonStart) throw new Error("Unexpected team statistics season");

	const teamName = textContent(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
	const position = integer(textContent(html.match(/<span\b[^>]*class=["'][^"']*\bl26t-side__num\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? ""));
	const pointsText = textContent(html.match(/<span\b[^>]*class=["'][^"']*\bl26t-side__pts\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "");
	const points = integer(pointsText.match(/(\d+)\s*PTS/i)?.[1] ?? "");
	const record = pointsText.match(/(\d+)V\s*·\s*(\d+)E\s*·\s*(\d+)D/i);
	const played = integer(pointsText.match(/(\d+)\s+partidos?/i)?.[1] ?? "");
	const metrics = parseMetrics(html);

	if (!teamName || !Number.isFinite(position) || !Number.isFinite(points) || !record || !Number.isFinite(played) || metrics.length < 5) {
		throw new Error("Incomplete team statistics document");
	}

	return {
		team: { name: teamName, crestUrl: entry.crestUrl, sourceUrl: `${entry.url}/estadisticas/` },
		season,
		classification: {
			position,
			points,
			played,
			wins: Number(record[1]),
			draws: Number(record[2]),
			losses: Number(record[3])
		},
		metrics,
		ranks: parseRanks(html),
		form: parseForm(html),
		topScorers: parsePlayerRanking(html, "team-players:goles"),
		topRated: parsePlayerRanking(html, "team-players:val"),
		mostUsed: parsePlayerRanking(html, "team-players:min")
	};
}

export function getExternalTeamsUrl(season: string) {
	return `https://lewaterpolo.com/${season}/division-de-honor-masculina/equipos/`;
}
