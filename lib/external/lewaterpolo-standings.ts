export type LeagueFormResult = "W" | "D" | "L";

export type LeagueStanding = {
	position: number;
	team: string;
	shortName: string;
	crestUrl: string | null;
	played: number;
	won: number;
	lost: number;
	penaltyWins: number;
	penaltyLosses: number;
	goalsFor: number;
	goalsAgainst: number;
	goalDifference: number;
	points: number;
	form: LeagueFormResult[];
};

export type LeagueStandings = {
	season: string;
	round: number | null;
	teams: LeagueStanding[];
};

const NAMED_ENTITIES: Record<string, string> = {
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

		return NAMED_ENTITIES[key.toLowerCase()] ?? entity;
	});
}

function textContent(value: string) {
	return decodeHtml(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

function classContent(value: string, className: string) {
	const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = value.match(new RegExp(`<[^>]+class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"));
	return match ? textContent(match[1]) : "";
}

function attribute(value: string, name: string) {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = value.match(new RegExp(`\\b${escaped}=["']([^"']*)["']`, "i"));
	return match ? decodeHtml(match[1]).trim() : "";
}

function integer(value: string) {
	const parsed = Number.parseInt(textContent(value).replace(/[^0-9-]/g, ""), 10);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseForm(value: string): LeagueFormResult[] {
	const pillClasses = [...value.matchAll(/class=["']([^"']*l26-form__pill[^"']*)["']/gi)];
	if (pillClasses.length > 0) {
		return pillClasses.flatMap((match) => {
			const classes = match[1].toLowerCase();
			if (classes.includes("--w")) return ["W" as const];
			if (classes.includes("--d")) return ["D" as const];
			if (classes.includes("--l")) return ["L" as const];
			return [];
		});
	}

	return textContent(value)
		.toUpperCase()
		.split(/\s+/)
		.flatMap((result) => {
			if (result === "V" || result === "W") return ["W" as const];
			if (result === "E" || result === "D") return ["D" as const];
			if (result === "P" || result === "L") return ["L" as const];
			return [];
		})
		.slice(0, 5);
}

export function parseLeWaterpoloStandings(html: string, expectedSeason: string): LeagueStandings {
	if (html.length < 1_000 || html.length > 2_000_000) throw new Error("Unexpected standings document size");

	const panelStart = html.search(/data-l26-panel=["']l26c-clas:general["']/i);
	if (panelStart < 0) throw new Error("General standings panel not found");

	const tableStart = html.indexOf("<table", panelStart);
	const tableEnd = html.indexOf("</table>", tableStart);
	if (tableStart < 0 || tableEnd < 0) throw new Error("General standings table not found");

	const table = html.slice(tableStart, tableEnd + 8);
	if (!/l26c-standings/i.test(table.slice(0, 300))) throw new Error("Unexpected standings table");

	const tbody = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? table;
	const rows = [...tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
	const teams: LeagueStanding[] = [];

	for (const row of rows) {
		const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
		if (cells.length < 11) continue;

		const team = classContent(cells[1], "l26c-nfull") || textContent(cells[1]);
		const shortName = classContent(cells[1], "l26c-nshort");
		const imageTag = cells[1].match(/<img\b[^>]*>/i)?.[0] ?? "";
		const crestCandidate = attribute(imageTag, "src");
		const crestUrl = /^https:\/\//i.test(crestCandidate) ? crestCandidate : null;
		const values = [cells[0], ...cells.slice(2, 11)].map(integer);

		if (!team || values.some((value) => !Number.isFinite(value))) continue;

		teams.push({
			position: values[0],
			team,
			shortName,
			crestUrl,
			played: values[1],
			won: values[2],
			lost: values[3],
			penaltyWins: values[4],
			penaltyLosses: values[5],
			goalsFor: values[6],
			goalsAgainst: values[7],
			goalDifference: values[8],
			points: values[9],
			form: cells[11] ? parseForm(cells[11]) : []
		});
	}

	if (teams.length < 6 || teams.length > 24) throw new Error("Implausible number of teams");
	if (new Set(teams.map((team) => team.position)).size !== teams.length) throw new Error("Duplicated standings positions");
	if (teams.some((team) => team.played < 0 || team.points < 0 || team.goalsFor < 0 || team.goalsAgainst < 0)) {
		throw new Error("Invalid standings values");
	}

	const detectedSeason = textContent(html).match(/Temporada\s+(\d{4}-\d{4})/i)?.[1] ?? expectedSeason;
	if (detectedSeason !== expectedSeason) throw new Error("Unexpected standings season");

	const roundMatch = textContent(html).match(/tras la jornada\s+(\d+)/i);
	return {
		season: detectedSeason,
		round: roundMatch ? Number.parseInt(roundMatch[1], 10) : null,
		teams: teams.sort((a, b) => a.position - b.position)
	};
}

export function getLeWaterpoloStandingsUrl(season: string) {
	return `https://lewaterpolo.com/${season}/division-de-honor-masculina/clasificacion/`;
}
