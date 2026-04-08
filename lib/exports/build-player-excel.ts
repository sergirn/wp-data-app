import ExcelJS from "exceljs";
import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { PLAYER_CATEGORY_TITLES } from "@/lib/stats/playerStatsConfig";
import { getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { GOALKEEPER_CATEGORY_TITLES } from "@/lib/stats/goalkeeperStatsConfig";

function formatDate(date?: string | null) {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("es-ES", {
		year: "numeric",
		month: "long",
		day: "numeric"
	});
}

function sanitizeSheetName(value: string) {
	return (
		value
			.replace(/[:\\/?*\[\]]/g, "")
			.slice(0, 31)
			.trim() || "Hoja"
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

function buildFieldCategoryCards(stats: Record<string, any>, hiddenStats?: string[]) {
	return [
		{
			title: PLAYER_CATEGORY_TITLES.goles,
			rows: getPlayerStatsByCategory("goles", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: PLAYER_CATEGORY_TITLES.fallos,
			rows: getPlayerStatsByCategory("fallos", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: PLAYER_CATEGORY_TITLES.faltas,
			rows: getPlayerStatsByCategory("faltas", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: PLAYER_CATEGORY_TITLES.acciones,
			rows: getPlayerStatsByCategory("acciones", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		}
	].filter((card) => card.rows.length > 0);
}

function buildGoalkeeperCategoryCards(stats: Record<string, any>, hiddenStats?: string[]) {
	return [
		{
			title: GOALKEEPER_CATEGORY_TITLES.goles,
			rows: getGoalkeeperStatsByCategory("goles", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.paradas,
			rows: getGoalkeeperStatsByCategory("paradas", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.paradas_penalti,
			rows: getGoalkeeperStatsByCategory("paradas_penalti", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.otros_tiros,
			rows: getGoalkeeperStatsByCategory("otros_tiros", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.inferioridad,
			rows: getGoalkeeperStatsByCategory("inferioridad", hiddenStats).map((def) => ({
				label: def.label,
				value: String(stats?.[def.key] ?? 0)
			}))
		},
		{
			title: "Acciones",
			rows: [
				...getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
					label: def.label,
					value: String(stats?.[def.key] ?? 0)
				})),
				...getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
					label: def.label,
					value: String(stats?.[def.key] ?? 0)
				}))
			]
		}
	].filter((card) => card.rows.length > 0);
}

function createSummarySheet(workbook: ExcelJS.Workbook, data: any) {
	const ws = workbook.addWorksheet("Resumen", {
		views: [{ state: "frozen", ySplit: 1 }]
	});

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = "REPORTE DE JUGADOR";
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	const roleLabel = data.kind === "goalkeeper" ? "Portero" : "Jugador de Campo";

	let row = 3;

	row = addKeyValueBlock(ws, row, "Información general", [
		{ label: "Jugador", value: data.player?.name ?? "-" },
		{ label: "Número", value: data.player?.number ?? "-" },
		{ label: "Rol", value: roleLabel },
		{ label: "Partidos", value: data.matchCount ?? 0 }
	]);

	if (data.kind === "goalkeeper") {
		row = addKeyValueBlock(ws, row, "KPIs", [
			{ label: "Paradas", value: data.derived?.saves ?? 0 },
			{ label: "Goles recibidos", value: data.derived?.goalsConceded ?? 0 },
			{ label: "Save %", value: `${data.derived?.savePct ?? 0}%` },
			{ label: "Tiros recibidos", value: data.derived?.shotsReceived ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildGoalkeeperCategoryCards(data.totals, data.hiddenStats));
	} else {
		row = addKeyValueBlock(ws, row, "KPIs", [
			{ label: "Goles", value: data.derived?.goals ?? 0 },
			{ label: "Tiros", value: data.derived?.shots ?? 0 },
			{ label: "Eficiencia", value: `${data.derived?.efficiency ?? 0}%` },
			{ label: "Asistencias", value: data.derived?.assists ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildFieldCategoryCards(data.totals, data.hiddenStats));
	}

	ws.columns = [
		{ key: "label", width: 28 },
		{ key: "value", width: 18 },
		{ key: "spacer1", width: 4 },
		{ key: "spacer2", width: 4 }
	];

	autoFitColumns(ws);
}

function createMatchSheet(workbook: ExcelJS.Workbook, data: any, stat: any, matchIndex: number) {
	const match = stat?.matches;
	if (!match) return;

	const opponent = match?.opponent ?? "Rival";
	const safeSheetName = sanitizeSheetName(`Partido ${matchIndex + 1} - ${opponent}`);
	const ws = workbook.addWorksheet(safeSheetName);

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = `PARTIDO ${matchIndex + 1}`;
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	let row = 3;

	row = addKeyValueBlock(ws, row, "Contexto del partido", [
		{ label: "Rival", value: opponent },
		{ label: "Fecha", value: formatDate(match?.match_date) },
		{ label: "Marcador", value: `${match?.home_score ?? 0} - ${match?.away_score ?? 0}` },
		{ label: "Jornada", value: String(match?.jornada ?? "-") },
		{ label: "Temporada", value: String(match?.season ?? "-") },
		{ label: "Ubicación", value: String(match?.location ?? "-") }
	]);

	const derived =
		data.kind === "goalkeeper"
			? (data.getGoalkeeperDerived?.(stat) ?? stat.derived ?? {})
			: (data.getPlayerDerived?.(stat) ?? stat.derived ?? {});

	if (data.kind === "goalkeeper") {
		row = addKeyValueBlock(ws, row, "KPIs", [
			{ label: "Paradas", value: derived?.saves ?? 0 },
			{ label: "Goles recibidos", value: derived?.goalsConceded ?? 0 },
			{ label: "Save %", value: `${derived?.savePct ?? 0}%` },
			{ label: "Tiros recibidos", value: derived?.shotsReceived ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildGoalkeeperCategoryCards(stat, data.hiddenStats));
	} else {
		row = addKeyValueBlock(ws, row, "KPIs", [
			{ label: "Goles", value: derived?.goals ?? 0 },
			{ label: "Tiros", value: derived?.shots ?? 0 },
			{ label: "Eficiencia", value: `${derived?.efficiency ?? 0}%` },
			{ label: "Asistencias", value: derived?.assists ?? 0 }
		]);

		row = addCategoryBlocks(ws, row, buildFieldCategoryCards(stat, data.hiddenStats));
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
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Waterpolo Stats App";
	workbook.created = new Date();

	createSummarySheet(workbook, data);

	for (let i = 0; i < (data.matchStats ?? []).length; i++) {
		const stat = data.matchStats[i];
		createMatchSheet(workbook, data, stat, i);
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return buffer;
}
