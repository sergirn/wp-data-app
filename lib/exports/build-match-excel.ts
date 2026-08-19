import ExcelJS from "exceljs";
import { getPlayerDerived, getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";
import { getGoalkeeperDerived, getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig";
import { getLocale, getTranslations } from "next-intl/server";

type ReportTranslator = (key: string, values?: Record<string, string | number>) => string;

type MatchReportData = Awaited<ReturnType<typeof import("@/lib/matches/get-match-report-data").getMatchReportData>>;

function formatDate(date: string | Date | null | undefined, locale: string) {
	if (!date) return "-";
	const parsed = date instanceof Date ? date : new Date(date);
	return parsed.toLocaleDateString(locale, {
		year: "numeric",
		month: "long",
		day: "numeric"
	});
}

function sanitizeSheetName(value: string, fallback: string) {
	return (
		value
			.replace(/[:\\/?*\[\]]/g, "")
			.slice(0, 31)
			.trim() || fallback
	);
}

function autoFitColumns(worksheet: ExcelJS.Worksheet, minWidth = 14) {
	worksheet.columns.forEach((column) => {
		let maxLength = minWidth;

		column.eachCell?.({ includeEmpty: true }, (cell) => {
			const raw = cell.value;
			const text =
				raw == null ? "" : typeof raw === "object" && "richText" in raw ? raw.richText.map((t: any) => t.text).join("") : String(raw);

			maxLength = Math.max(maxLength, text.length + 2);
		});

		column.width = Math.min(maxLength, 50);
	});
}

function applyBorders(cell: ExcelJS.Cell) {
	cell.border = {
		top: { style: "thin", color: { argb: "E2E8F0" } },
		left: { style: "thin", color: { argb: "E2E8F0" } },
		bottom: { style: "thin", color: { argb: "E2E8F0" } },
		right: { style: "thin", color: { argb: "E2E8F0" } }
	};
}

function styleTitleRow(row: ExcelJS.Row) {
	row.font = { bold: true, size: 16 };
	row.alignment = { vertical: "middle" };
	row.height = 24;
}

function styleSectionHeader(cell: ExcelJS.Cell) {
	cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
	cell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "2F5597" }
	};
	cell.alignment = { vertical: "middle", horizontal: "left" };
	applyBorders(cell);
}

function styleLabelValueRow(labelCell: ExcelJS.Cell, valueCell: ExcelJS.Cell) {
	labelCell.font = { bold: true };
	labelCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "F8FAFC" }
	};

	labelCell.alignment = { vertical: "middle", horizontal: "left" };
	valueCell.alignment = { vertical: "middle", horizontal: "left" };

	applyBorders(labelCell);
	applyBorders(valueCell);
}

function styleSimpleTableHeader(row: ExcelJS.Row) {
	row.font = { bold: true, color: { argb: "FFFFFFFF" } };
	row.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "2F5597" }
	};

	row.eachCell((cell) => {
		cell.alignment = { vertical: "middle", horizontal: "left" };
		applyBorders(cell);
	});
}

function styleSimpleTableBody(row: ExcelJS.Row) {
	row.eachCell((cell) => {
		cell.alignment = { vertical: "middle", horizontal: "left" };
		applyBorders(cell);
	});
}

function addKeyValueBlock(ws: ExcelJS.Worksheet, startRow: number, title: string, rows: Array<{ label: string; value: string | number }>) {
	ws.getCell(`A${startRow}`).value = title;
	ws.mergeCells(`A${startRow}:B${startRow}`);
	styleSectionHeader(ws.getCell(`A${startRow}`));
	ws.getRow(startRow).height = 22;

	let rowIndex = startRow + 1;

	for (const row of rows) {
		const labelCell = ws.getCell(`A${rowIndex}`);
		const valueCell = ws.getCell(`B${rowIndex}`);

		labelCell.value = row.label;
		valueCell.value = row.value;

		styleLabelValueRow(labelCell, valueCell);
		rowIndex++;
	}

	return rowIndex + 1;
}

function addTableBlock(ws: ExcelJS.Worksheet, startRow: number, title: string, headers: string[], rows: Array<Array<string | number>>) {
	ws.getCell(`A${startRow}`).value = title;
	ws.mergeCells(startRow, 1, startRow, Math.max(headers.length, 2));
	styleSectionHeader(ws.getCell(`A${startRow}`));

	const headerRowIndex = startRow + 1;
	const headerRow = ws.getRow(headerRowIndex);
	headers.forEach((header, index) => {
		ws.getCell(headerRowIndex, index + 1).value = header;
	});
	styleSimpleTableHeader(headerRow);

	let rowIndex = headerRowIndex + 1;

	for (const rowValues of rows) {
		const row = ws.getRow(rowIndex);
		rowValues.forEach((value, index) => {
			ws.getCell(rowIndex, index + 1).value = value;
		});
		styleSimpleTableBody(row);
		rowIndex++;
	}

	return rowIndex + 1;
}

function addCategoryBlocks(ws: ExcelJS.Worksheet, startRow: number, cards: Array<{ title: string; rows: Array<{ label: string; value: string }> }>) {
	let rowIndex = startRow;

	for (const card of cards) {
		rowIndex = addKeyValueBlock(ws, rowIndex, card.title, card.rows);
	}

	return rowIndex;
}

function buildPlayerCategoryRows(category: PlayerStatCategory, stats: Record<string, any>, hiddenStats: string[] | Set<string> | undefined, tStat: ReportTranslator) {
	return getPlayerStatsByCategory(category, hiddenStats).map((def) => ({
		label: tStat(def.key),
		value: String(stats?.[def.key] ?? 0)
	}));
}

function buildGoalkeeperCategoryRows(category: GoalkeeperStatCategory, stats: Record<string, any>, hiddenStats: string[] | Set<string> | undefined, tStat: ReportTranslator) {
	return getGoalkeeperStatsByCategory(category, hiddenStats).map((def) => ({
		label: tStat(def.key),
		value: String(stats?.[def.key] ?? 0)
	}));
}

function buildMergedGoalkeeperActionRows(stats: Record<string, any>, hiddenStats: string[] | Set<string> | undefined, tStat: ReportTranslator) {
	const actionRows = getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
		label: tStat(def.key),
		value: String(stats?.[def.key] ?? 0)
	}));

	const attackRows = getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
		label: tStat(def.key),
		value: String(stats?.[def.key] ?? 0)
	}));

	return [...actionRows, ...attackRows];
}

function buildAttackCards(data: MatchReportData, t: ReportTranslator, tStat: ReportTranslator) {
	const { attackTotals, hiddenStats } = data;

	return [
		{
			title: t("categories.playerGoals"),
			rows: buildPlayerCategoryRows("goles", attackTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.playerMisses"),
			rows: buildPlayerCategoryRows("fallos", attackTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.fouls"),
			rows: buildPlayerCategoryRows("faltas", attackTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.actions"),
			rows: buildPlayerCategoryRows("acciones", attackTotals, hiddenStats, tStat)
		}
	].filter((card) => card.rows.length > 0);
}

function buildDefenseCards(data: MatchReportData, t: ReportTranslator, tStat: ReportTranslator) {
	const { defenseTotals, hiddenStats } = data;

	return [
		{
			title: t("categories.fouls"),
			rows: buildPlayerCategoryRows("faltas", defenseTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.actions"),
			rows: buildPlayerCategoryRows("acciones", defenseTotals, hiddenStats, tStat)
		}
	].filter((card) => card.rows.length > 0);
}

function buildGoalkeeperCards(data: MatchReportData, t: ReportTranslator, tStat: ReportTranslator) {
	const { goalkeeperTotals, hiddenStats } = data;

	return [
		{
			title: t("categories.goalkeeperGoals"),
			rows: buildGoalkeeperCategoryRows("goles", goalkeeperTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.saves"),
			rows: buildGoalkeeperCategoryRows("paradas", goalkeeperTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.penalties"),
			rows: buildGoalkeeperCategoryRows("paradas_penalti", goalkeeperTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.otherShots"),
			rows: buildGoalkeeperCategoryRows("otros_tiros", goalkeeperTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.inferiority"),
			rows: buildGoalkeeperCategoryRows("inferioridad", goalkeeperTotals, hiddenStats, tStat)
		},
		{
			title: t("categories.actions"),
			rows: buildMergedGoalkeeperActionRows(goalkeeperTotals, hiddenStats, tStat)
		}
	].filter((card) => card.rows.length > 0);
}

function createMatchTotalsSheet(workbook: ExcelJS.Workbook, data: MatchReportData, t: ReportTranslator, tStat: ReportTranslator, locale: string) {
	const ws = workbook.addWorksheet(t("summarySheet"), {
		views: [{ state: "frozen", ySplit: 1 }]
	});

	ws.properties.defaultRowHeight = 20;

	const {
		match,
		clubName,
		matchDate,
		result,
		hasPenalties,
		periods,
		homePenaltyShooters,
		rivalPenaltyShots,
		attackSummary,
		defenseSummary,
		goalkeeperSummary
	} = data;

	ws.getCell("A1").value = t("matchReportTitle");
	ws.mergeCells("A1:F1");
	styleTitleRow(ws.getRow(1));

	let row = 3;

	const localizedClubName = clubName === "Nuestro Equipo" ? t("ourTeam") : clubName;
	const localizedResult = hasPenalties
		? (match.penalty_home_score ?? 0) > (match.penalty_away_score ?? 0) ? t("winPenalties") : t("lossPenalties")
		: match.home_score > match.away_score ? t("win") : match.home_score < match.away_score ? t("loss") : t("draw");
	row = addKeyValueBlock(ws, row, t("generalInformation"), [
		{ label: t("match"), value: t("versus", { team: localizedClubName, opponent: match.opponent }) },
		{ label: t("score"), value: `${match.home_score} - ${match.away_score}` },
		{ label: t("result"), value: localizedResult },
		{ label: t("competition"), value: match.competitions?.name ?? "-" },
		{ label: t("date"), value: formatDate(matchDate, locale) },
		{ label: t("location"), value: match.location ?? "-" },
		{ label: t("season"), value: match.season ?? "-" },
		{ label: t("round"), value: String(match.jornada ?? "-") },
		{
			label: t("penalties"),
			value: hasPenalties ? `${match.penalty_home_score ?? 0} - ${match.penalty_away_score ?? 0}` : t("no")
		}
	]);

	row = addTableBlock(
		ws,
		row,
		t("periods"),
		[t("period"), t("us"), t("opponent"), t("sprintWinner")],
		periods.map((period) => [t("quarter", { number: period.q }), period.home, period.away, period.winner ? `#${period.winner.number} ${period.winner.name}` : "-"])
	);

	if (hasPenalties) {
		row = addTableBlock(
			ws,
			row,
			t("homeShooters"),
			[t("order"), t("player"), t("result"), t("type")],
			homePenaltyShooters.map((shot) => [
				shot.shot_order,
				shot.players ? `#${shot.players.number} ${shot.players.name}` : t("unknown"),
				shot.scored ? t("goal") : t("missed"),
				shot.result_type ?? "-"
			])
		);

		row = addTableBlock(
			ws,
			row,
			t("opponentShots"),
			[t("order"), t("goalkeeper"), t("result"), t("type")],
			rivalPenaltyShots.map((shot) => [
				shot.shot_order,
				shot.goalkeeper ? `#${shot.goalkeeper.number} ${shot.goalkeeper.name}` : t("unknown"),
				shot.scored ? t("goal") : t("savedOrMissed"),
				shot.result_type ?? "-"
			])
		);
	}

	if (match.notes) {
		row = addKeyValueBlock(ws, row, t("notes"), [{ label: t("observations"), value: match.notes }]);
	}

	row = addKeyValueBlock(ws, row, t("attackKpis"), [
		{ label: t("goals"), value: attackSummary.topBar.goals },
		{ label: t("shots"), value: attackSummary.topBar.shots },
		{ label: t("efficiency"), value: `${attackSummary.topBar.efficiency}%` },
		{ label: t("assists"), value: attackSummary.topBar.assists }
	]);

	row = addCategoryBlocks(ws, row, buildAttackCards(data, t, tStat));

	row = addKeyValueBlock(ws, row, t("defenseKpis"), [
		{ label: t("fouls"), value: defenseSummary.defense.fouls },
		{ label: t("blocks"), value: defenseSummary.defense.blocks },
		{ label: t("recoveries"), value: defenseSummary.defense.recoveries },
		{ label: t("rebounds"), value: defenseSummary.defense.rebounds }
	]);

	row = addCategoryBlocks(ws, row, buildDefenseCards(data, t, tStat));

	row = addKeyValueBlock(ws, row, t("goalkeeperKpis"), [
		{ label: t("saves"), value: goalkeeperSummary.topBar.saves },
		{ label: t("goalsConceded"), value: goalkeeperSummary.topBar.goalsConceded },
		{ label: t("shotsReceived"), value: goalkeeperSummary.topBar.shotsReceived },
		{ label: t("savePercentage"), value: `${goalkeeperSummary.topBar.savePct}%` }
	]);

	row = addCategoryBlocks(ws, row, buildGoalkeeperCards(data, t, tStat));

	ws.columns = [
		{ key: "c1", width: 28 },
		{ key: "c2", width: 22 },
		{ key: "c3", width: 18 },
		{ key: "c4", width: 24 },
		{ key: "c5", width: 24 },
		{ key: "c6", width: 24 }
	];

	autoFitColumns(ws);
}

function createFieldPlayerSheet(workbook: ExcelJS.Workbook, stat: any, hiddenStats: string[], t: ReportTranslator, tStat: ReportTranslator) {
	const playerName = stat.players?.name ?? t("player");
	const sheetName = sanitizeSheetName(t("playerSheet", { player: playerName }), t("sheetFallback"));
	const ws = workbook.addWorksheet(sheetName);

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = playerName;
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	const derived = getPlayerDerived(stat, hiddenStats);

	let row = 3;

	row = addKeyValueBlock(ws, row, t("playerInformation"), [
		{ label: t("name"), value: playerName },
		{ label: t("number"), value: stat.players?.number ?? "-" },
		{ label: t("role"), value: t("fieldPlayer") }
	]);

	row = addKeyValueBlock(ws, row, t("kpis"), [
		{ label: t("goals"), value: derived.goals },
		{ label: t("shots"), value: derived.shots },
		{ label: t("efficiency"), value: `${derived.efficiency}%` },
		{ label: t("assists"), value: derived.assists }
	]);

	const cards = [
		{
			title: t("categories.playerGoals"),
			rows: buildPlayerCategoryRows("goles", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.playerMisses"),
			rows: buildPlayerCategoryRows("fallos", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.fouls"),
			rows: buildPlayerCategoryRows("faltas", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.actions"),
			rows: buildPlayerCategoryRows("acciones", stat, hiddenStats, tStat)
		}
	].filter((card) => card.rows.length > 0);

	row = addCategoryBlocks(ws, row, cards);

	ws.columns = [
		{ key: "c1", width: 28 },
		{ key: "c2", width: 18 },
		{ key: "c3", width: 4 },
		{ key: "c4", width: 4 }
	];

	autoFitColumns(ws);
}

function createGoalkeeperSheet(workbook: ExcelJS.Workbook, stat: any, hiddenStats: string[], t: ReportTranslator, tStat: ReportTranslator) {
	const playerName = stat.players?.name ?? t("goalkeeper");
	const sheetName = sanitizeSheetName(t("goalkeeperSheet", { player: playerName }), t("sheetFallback"));
	const ws = workbook.addWorksheet(sheetName);

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = playerName;
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	const derived = getGoalkeeperDerived(stat, hiddenStats);

	let row = 3;

	row = addKeyValueBlock(ws, row, t("goalkeeperInformation"), [
		{ label: t("name"), value: playerName },
		{ label: t("number"), value: stat.players?.number ?? "-" },
		{ label: t("role"), value: t("goalkeeper") }
	]);

	row = addKeyValueBlock(ws, row, t("kpis"), [
		{ label: t("saves"), value: derived.saves },
		{ label: t("goalsConceded"), value: derived.goalsConceded },
		{ label: t("savePercentage"), value: `${derived.savePct}%` },
		{ label: t("shotsReceived"), value: derived.shotsReceived }
	]);

	const cards = [
		{
			title: t("categories.goalkeeperGoals"),
			rows: buildGoalkeeperCategoryRows("goles", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.saves"),
			rows: buildGoalkeeperCategoryRows("paradas", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.penalties"),
			rows: buildGoalkeeperCategoryRows("paradas_penalti", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.otherShots"),
			rows: buildGoalkeeperCategoryRows("otros_tiros", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.inferiority"),
			rows: buildGoalkeeperCategoryRows("inferioridad", stat, hiddenStats, tStat)
		},
		{
			title: t("categories.actions"),
			rows: buildMergedGoalkeeperActionRows(stat, hiddenStats, tStat)
		}
	].filter((card) => card.rows.length > 0);

	row = addCategoryBlocks(ws, row, cards);

	ws.columns = [
		{ key: "c1", width: 28 },
		{ key: "c2", width: 18 },
		{ key: "c3", width: 4 },
		{ key: "c4", width: 4 }
	];

	autoFitColumns(ws);
}

export async function buildMatchExcel(data: MatchReportData) {
	const reportTranslations = await getTranslations("Reports");
	const statTranslations = await getTranslations("StatLabels");
	const locale = await getLocale();
	const t: ReportTranslator = (key, values) => reportTranslations(key as never, values as never);
	const tStat: ReportTranslator = (key) => statTranslations(key as never);
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Waterpolo Stats App";
	workbook.created = new Date();

	createMatchTotalsSheet(workbook, data, t, tStat, locale);

	for (const stat of data.fieldPlayersStats) {
		createFieldPlayerSheet(workbook, stat, data.hiddenStats, t, tStat);
	}

	for (const stat of data.goalkeepersStats) {
		createGoalkeeperSheet(workbook, stat, data.hiddenStats, t, tStat);
	}

	return await workbook.xlsx.writeBuffer();
}
