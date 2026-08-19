import ExcelJS from "exceljs";
import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { getLocale, getTranslations } from "next-intl/server";

type ReportTranslator = (key: string, values?: Record<string, string | number>) => string;

function formatDate(date: string | null | undefined, locale: string) {
	if (!date) return "-";
	return new Date(date).toLocaleDateString(locale, {
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

		column.width = Math.min(maxLength, 40);
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

function addCategoryBlocks(ws: ExcelJS.Worksheet, startRow: number, cards: Array<{ title: string; rows: Array<{ label: string; value: string }> }>) {
	let rowIndex = startRow;

	for (const card of cards) {
		rowIndex = addKeyValueBlock(ws, rowIndex, card.title, card.rows);
	}

	return rowIndex;
}

function buildFieldCategoryCards(stats: Record<string, any>, hiddenStats: string[] | undefined, t: ReportTranslator, tStat: ReportTranslator) {
	return [
		{
			title: t("categories.playerGoals"),
			rows: getPlayerStatsByCategory("goles", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.playerMisses"),
			rows: getPlayerStatsByCategory("fallos", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.fouls"),
			rows: getPlayerStatsByCategory("faltas", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.actions"),
			rows: getPlayerStatsByCategory("acciones", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		}
	].filter((card) => card.rows.length > 0);
}

function buildGoalkeeperCategoryCards(stats: Record<string, any>, hiddenStats: string[] | undefined, t: ReportTranslator, tStat: ReportTranslator) {
	return [
		{
			title: t("categories.goalkeeperGoals"),
			rows: getGoalkeeperStatsByCategory("goles", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.saves"),
			rows: getGoalkeeperStatsByCategory("paradas", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.penalties"),
			rows: getGoalkeeperStatsByCategory("paradas_penalti", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.otherShots"),
			rows: getGoalkeeperStatsByCategory("otros_tiros", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.inferiority"),
			rows: getGoalkeeperStatsByCategory("inferioridad", hiddenStats).map((def) => ({
				label: tStat(def.key),
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: t("categories.actions"),
			rows: [
				...getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
					label: tStat(def.key),
					value: String(stats?.[def.key] ?? 0)
				})),
				...getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
					label: tStat(def.key),
					value: String(stats?.[def.key] ?? 0)
				}))
			]
		}
	].filter((card) => card.rows.length > 0);
}

function createSummarySheet(workbook: ExcelJS.Workbook, data: any, t: ReportTranslator, tStat: ReportTranslator) {
	const ws = workbook.addWorksheet(t("summarySheet"), {
		views: [{ state: "frozen", ySplit: 1 }]
	});

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = t("playerReportTitle");
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	const roleLabel = data.kind === "goalkeeper" ? t("goalkeeper") : t("fieldPlayer");

	let row = 3;

	row = addKeyValueBlock(ws, row, t("generalInformation"), [
		{ label: t("player"), value: data.player?.name ?? "-" },
		{ label: t("number"), value: data.player?.number ?? "-" },
		{ label: t("role"), value: roleLabel },
		{ label: t("matches"), value: data.matchCount ?? 0 }
	]);

	if (data.kind === "goalkeeper") {
		row = addKeyValueBlock(ws, row, t("kpis"), [
			{ label: t("saves"), value: data.derived?.saves ?? 0 },
			{ label: t("goalsConceded"), value: data.derived?.goalsConceded ?? 0 },
			{ label: t("savePercentage"), value: `${data.derived?.savePct ?? 0}%` },
			{ label: t("shotsReceived"), value: data.derived?.shotsReceived ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildGoalkeeperCategoryCards(data.totals, data.hiddenStats, t, tStat));
	} else {
		row = addKeyValueBlock(ws, row, t("kpis"), [
			{ label: t("goals"), value: data.derived?.goals ?? 0 },
			{ label: t("shots"), value: data.derived?.shots ?? 0 },
			{ label: t("efficiency"), value: `${data.derived?.efficiency ?? 0}%` },
			{ label: t("assists"), value: data.derived?.assists ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildFieldCategoryCards(data.totals, data.hiddenStats, t, tStat));
	}

	ws.columns = [
		{ key: "label", width: 28 },
		{ key: "value", width: 18 },
		{ key: "spacer1", width: 4 },
		{ key: "spacer2", width: 4 }
	];

	autoFitColumns(ws);
}

function createMatchSheet(workbook: ExcelJS.Workbook, data: any, stat: any, matchIndex: number, t: ReportTranslator, tStat: ReportTranslator, locale: string) {
	const match = stat?.matches;
	if (!match) return;

	const opponent = match?.opponent ?? t("opponent");
	const safeSheetName = sanitizeSheetName(t("matchSheet", { number: matchIndex + 1, opponent }), t("sheetFallback"));
	const ws = workbook.addWorksheet(safeSheetName);

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = t("matchTitle", { number: matchIndex + 1 });
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	let row = 3;

	row = addKeyValueBlock(ws, row, t("matchContext"), [
		{ label: t("opponent"), value: opponent },
		{ label: t("date"), value: formatDate(match?.match_date, locale) },
		{ label: t("score"), value: `${match?.home_score ?? 0} - ${match?.away_score ?? 0}` },
		{ label: t("round"), value: String(match?.jornada ?? "-") },
		{ label: t("season"), value: String(match?.season ?? "-") },
		{ label: t("location"), value: String(match?.location ?? "-") }
	]);

	const derived =
		data.kind === "goalkeeper"
			? (data.getGoalkeeperDerived?.(stat) ?? stat.derived ?? {})
			: (data.getPlayerDerived?.(stat) ?? stat.derived ?? {});

	if (data.kind === "goalkeeper") {
		row = addKeyValueBlock(ws, row, t("kpis"), [
			{ label: t("saves"), value: derived?.saves ?? 0 },
			{ label: t("goalsConceded"), value: derived?.goalsConceded ?? 0 },
			{ label: t("savePercentage"), value: `${derived?.savePct ?? 0}%` },
			{ label: t("shotsReceived"), value: derived?.shotsReceived ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildGoalkeeperCategoryCards(stat, data.hiddenStats, t, tStat));
	} else {
		row = addKeyValueBlock(ws, row, t("kpis"), [
			{ label: t("goals"), value: derived?.goals ?? 0 },
			{ label: t("shots"), value: derived?.shots ?? 0 },
			{ label: t("efficiency"), value: `${derived?.efficiency ?? 0}%` },
			{ label: t("assists"), value: derived?.assists ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildFieldCategoryCards(stat, data.hiddenStats, t, tStat));
	}

	ws.columns = [
		{ key: "label", width: 28 },
		{ key: "value", width: 18 },
		{ key: "spacer1", width: 4 },
		{ key: "spacer2", width: 4 }
	];

	autoFitColumns(ws);
}

export async function buildPlayerTotalsExcel(data: any) {
	const reportTranslations = await getTranslations("Reports");
	const statTranslations = await getTranslations("StatLabels");
	const locale = await getLocale();
	const t: ReportTranslator = (key, values) => reportTranslations(key as never, values as never);
	const tStat: ReportTranslator = (key) => statTranslations(key as never);
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Waterpolo Stats App";
	workbook.created = new Date();

	createSummarySheet(workbook, data, t, tStat);

	for (let i = 0; i < (data.matchStats ?? []).length; i++) {
		const stat = data.matchStats[i];
		createMatchSheet(workbook, data, stat, i, t, tStat, locale);
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return buffer;
}
