import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
	getLocale: async () => "es",
	getTranslations: async () => (key: string, values?: Record<string, string | number>) => {
		const readable = key
			.split(".")
			.at(-1)!
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (character) => character.toUpperCase());
		if (!values) return readable;
		return `${readable} · ${Object.values(values).join(" · ")}`;
	},
}));

vi.mock("@/lib/safe-image-fetch", () => ({
	fetchRemoteImage: async () => {
		throw new Error("Remote images are disabled in PDF visual tests");
	},
}));

import { buildMatchPdf } from "./build-match-pdf";
import { buildPlayerMatchPdf, buildPlayerTotalsPdf } from "./build-player-pdf";

const match = {
	id: 27,
	opponent: "CN Atlètic Barceloneta",
	match_date: "2026-08-19",
	location: "Piscina Sant Sebastià",
	season: "2026/27",
	jornada: 4,
	home_score: 11,
	away_score: 8,
	is_home: true,
	penalty_home_score: null,
	penalty_away_score: null,
	notes: "Partido de alta intensidad. Buen rendimiento defensivo y mejora progresiva en superioridad.",
	competitions: { name: "División de Honor" },
};

const player = { id: 9, name: "Marc Vidal", number: 7, is_goalkeeper: false, photo_url: null };
const playerStat = {
	player_id: player.id,
	players: player,
	matches: match,
	goles_totales: 4,
	tiros_totales: 7,
	acciones_asistencias: 3,
	acciones_recuperacion: 2,
	faltas_exp_20_1c1: 1,
};

const derived = { goals: 4, shots: 7, efficiency: 57, assists: 3 };

async function validateAndWrite(name: string, bytes: Uint8Array) {
	const document = await PDFDocument.load(bytes);
	expect(document.getPageCount()).toBeGreaterThan(0);
	expect(bytes.byteLength).toBeGreaterThan(10_000);
	if (process.env.WRITE_PDF_SAMPLES === "1") {
		const outputDirectory = path.join(process.cwd(), "output", "pdf");
		await mkdir(outputDirectory, { recursive: true });
		await writeFile(path.join(outputDirectory, name), bytes);
	}
}

describe("dark PDF templates", () => {
	it("renders match, player totals and player match reports", async () => {
		const totals = {
			goles_totales: 11,
			tiros_totales: 24,
			acciones_asistencias: 8,
			acciones_recuperacion: 9,
			acciones_bloqueo: 5,
			faltas_exp_20_1c1: 4,
		};

		const matchPdf = await buildMatchPdf({
			match,
			clubName: "CN Mediterrani",
			matchDate: new Date(match.match_date),
			hasPenalties: false,
			periods: [
				{ q: 1, home: 2, away: 2, winner: player },
				{ q: 2, home: 4, away: 1, winner: player },
				{ q: 3, home: 2, away: 3, winner: null },
				{ q: 4, home: 3, away: 2, winner: player },
			],
			homePenaltyShooters: [],
			rivalPenaltyShots: [],
			fieldPlayersStats: [playerStat],
			goalkeepersStats: [],
			hiddenStats: [],
			attackTotals: totals,
			attackSummary: { topBar: { goals: 11, shots: 24, efficiency: 46, assists: 8 } },
			defenseTotals: totals,
			defenseSummary: { defense: { fouls: 7, blocks: 5, recoveries: 9, rebounds: 4 } },
			goalkeeperTotals: {},
			goalkeeperSummary: { topBar: { saves: 12, goalsConceded: 8, shotsReceived: 20, savePct: 60 } },
		} as never);

		const playerTotalsPdf = await buildPlayerTotalsPdf({
			kind: "field",
			player,
			matchCount: 12,
			derived,
			totals,
			hiddenStats: [],
			matchStats: [playerStat],
			getPlayerDerived: () => derived,
		});

		const playerMatchPdf = await buildPlayerMatchPdf({
			kind: "field",
			player,
			match,
			stat: playerStat,
			derived,
			hiddenStats: [],
		});

		await validateAndWrite("sample-match-report.pdf", matchPdf);
		await validateAndWrite("sample-player-totals-report.pdf", playerTotalsPdf);
		await validateAndWrite("sample-player-match-report.pdf", playerMatchPdf);
	}, 30_000);
});
