import ExcelJS from "exceljs";
import { getPlayerDerived, getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { PLAYER_CATEGORY_TITLES, type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";
import { getGoalkeeperDerived, getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { GOALKEEPER_CATEGORY_TITLES, type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig";

type MatchReportData = Awaited<ReturnType<typeof import("@/lib/matches/get-match-report-data").getMatchReportData>>;

function formatDate(date?: string | Date | null) {
	if (!date) return "-";
	const parsed = date instanceof Date ? date : new Date(date);
	return parsed.toLocaleDateString("es-ES", {
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

function buildPlayerCategoryRows(category: PlayerStatCategory, stats: Record<string, any>, hiddenStats?: string[] | Set<string>) {
	return getPlayerStatsByCategory(category, hiddenStats).map((def) => ({
		label: def.label,
		value: String(stats?.[def.key] ?? 0)
	}));
}

function buildGoalkeeperCategoryRows(category: GoalkeeperStatCategory, stats: Record<string, any>, hiddenStats?: string[] | Set<string>) {
	return getGoalkeeperStatsByCategory(category, hiddenStats).map((def) => ({
		label: def.label,
		value: String(stats?.[def.key] ?? 0)
	}));
}

function buildMergedGoalkeeperActionRows(stats: Record<string, any>, hiddenStats?: string[] | Set<string>) {
	const actionRows = getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
		label: def.label,
		value: String(stats?.[def.key] ?? 0)
	}));

	const attackRows = getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
		label: def.label,
		value: String(stats?.[def.key] ?? 0)
	}));

	return [...actionRows, ...attackRows];
}

function buildAttackCards(data: MatchReportData) {
	const { attackTotals, hiddenStats } = data;

	return [
		{
			title: PLAYER_CATEGORY_TITLES.goles,
			rows: buildPlayerCategoryRows("goles", attackTotals, hiddenStats)
		},
		{
			title: PLAYER_CATEGORY_TITLES.fallos,
			rows: buildPlayerCategoryRows("fallos", attackTotals, hiddenStats)
		},
		{
			title: PLAYER_CATEGORY_TITLES.faltas,
			rows: buildPlayerCategoryRows("faltas", attackTotals, hiddenStats)
		},
		{
			title: PLAYER_CATEGORY_TITLES.acciones,
			rows: buildPlayerCategoryRows("acciones", attackTotals, hiddenStats)
		}
	].filter((card) => card.rows.length > 0);
}

function buildDefenseCards(data: MatchReportData) {
	const { defenseTotals, hiddenStats } = data;

	return [
		{
			title: PLAYER_CATEGORY_TITLES.faltas,
			rows: buildPlayerCategoryRows("faltas", defenseTotals, hiddenStats)
		},
		{
			title: PLAYER_CATEGORY_TITLES.acciones,
			rows: buildPlayerCategoryRows("acciones", defenseTotals, hiddenStats)
		}
	].filter((card) => card.rows.length > 0);
}

function buildGoalkeeperCards(data: MatchReportData) {
	const { goalkeeperTotals, hiddenStats } = data;

	return [
		{
			title: GOALKEEPER_CATEGORY_TITLES.goles,
			rows: buildGoalkeeperCategoryRows("goles", goalkeeperTotals, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.paradas,
			rows: buildGoalkeeperCategoryRows("paradas", goalkeeperTotals, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.paradas_penalti,
			rows: buildGoalkeeperCategoryRows("paradas_penalti", goalkeeperTotals, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.otros_tiros,
			rows: buildGoalkeeperCategoryRows("otros_tiros", goalkeeperTotals, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.inferioridad,
			rows: buildGoalkeeperCategoryRows("inferioridad", goalkeeperTotals, hiddenStats)
		},
		{
			title: "Acciones",
			rows: buildMergedGoalkeeperActionRows(goalkeeperTotals, hiddenStats)
		}
	].filter((card) => card.rows.length > 0);
}

function createMatchTotalsSheet(workbook: ExcelJS.Workbook, data: MatchReportData) {
	const ws = workbook.addWorksheet("Resumen", {
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

	ws.getCell("A1").value = "REPORTE DE PARTIDO";
	ws.mergeCells("A1:F1");
	styleTitleRow(ws.getRow(1));

	let row = 3;

	row = addKeyValueBlock(ws, row, "Información general", [
		{ label: "Partido", value: `${clubName} vs ${match.opponent}` },
		{ label: "Marcador", value: `${match.home_score} - ${match.away_score}` },
		{ label: "Resultado", value: result },
		{ label: "Competición", value: match.competitions?.name ?? "-" },
		{ label: "Fecha", value: formatDate(matchDate) },
		{ label: "Ubicación", value: match.location ?? "-" },
		{ label: "Temporada", value: match.season ?? "-" },
		{ label: "Jornada", value: String(match.jornada ?? "-") },
		{
			label: "Penaltis",
			value: hasPenalties ? `${match.penalty_home_score ?? 0} - ${match.penalty_away_score ?? 0}` : "No"
		}
	]);

	row = addTableBlock(
		ws,
		row,
		"Parciales",
		["Periodo", "Nosotros", "Rival", "Ganador sprint"],
		periods.map((period) => [`Q${period.q}`, period.home, period.away, period.winner ? `#${period.winner.number} ${period.winner.name}` : "-"])
	);

	if (hasPenalties) {
		row = addTableBlock(
			ws,
			row,
			"Lanzadores propios",
			["Orden", "Jugador", "Resultado", "Tipo"],
			homePenaltyShooters.map((shot) => [
				shot.shot_order,
				shot.players ? `#${shot.players.number} ${shot.players.name}` : "Unknown",
				shot.scored ? "Gol" : "Fallado",
				shot.result_type ?? "-"
			])
		);

		row = addTableBlock(
			ws,
			row,
			"Lanzamientos rival",
			["Orden", "Portero", "Resultado", "Tipo"],
			rivalPenaltyShots.map((shot) => [
				shot.shot_order,
				shot.goalkeeper ? `#${shot.goalkeeper.number} ${shot.goalkeeper.name}` : "Unknown",
				shot.scored ? "Gol" : "Parado/Fallado",
				shot.result_type ?? "-"
			])
		);
	}

	if (match.notes) {
		row = addKeyValueBlock(ws, row, "Notas", [{ label: "Observaciones", value: match.notes }]);
	}

	row = addKeyValueBlock(ws, row, "KPIs ataque", [
		{ label: "Goles", value: attackSummary.topBar.goals },
		{ label: "Tiros", value: attackSummary.topBar.shots },
		{ label: "Eficiencia", value: `${attackSummary.topBar.efficiency}%` },
		{ label: "Asistencias", value: attackSummary.topBar.assists }
	]);

	row = addCategoryBlocks(ws, row, buildAttackCards(data));

	row = addKeyValueBlock(ws, row, "KPIs defensa", [
		{ label: "Faltas", value: defenseSummary.defense.fouls },
		{ label: "Bloqueos", value: defenseSummary.defense.blocks },
		{ label: "Recuperaciones", value: defenseSummary.defense.recoveries },
		{ label: "Rebotes", value: defenseSummary.defense.rebounds }
	]);

	row = addCategoryBlocks(ws, row, buildDefenseCards(data));

	row = addKeyValueBlock(ws, row, "KPIs portería", [
		{ label: "Paradas", value: goalkeeperSummary.topBar.saves },
		{ label: "Goles encajados", value: goalkeeperSummary.topBar.goalsConceded },
		{ label: "Tiros recibidos", value: goalkeeperSummary.topBar.shotsReceived },
		{ label: "Save %", value: `${goalkeeperSummary.topBar.savePct}%` }
	]);

	row = addCategoryBlocks(ws, row, buildGoalkeeperCards(data));

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

function createFieldPlayerSheet(workbook: ExcelJS.Workbook, stat: any, hiddenStats: string[]) {
	const playerName = stat.players?.name ?? "Jugador";
	const sheetName = sanitizeSheetName(`Jugador - ${playerName}`);
	const ws = workbook.addWorksheet(sheetName);

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = playerName;
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	const derived = getPlayerDerived(stat, hiddenStats);

	let row = 3;

	row = addKeyValueBlock(ws, row, "Información jugador", [
		{ label: "Nombre", value: playerName },
		{ label: "Número", value: stat.players?.number ?? "-" },
		{ label: "Rol", value: "Jugador" }
	]);

	row = addKeyValueBlock(ws, row, "KPIs", [
		{ label: "Goles", value: derived.goals },
		{ label: "Tiros", value: derived.shots },
		{ label: "Eficiencia", value: `${derived.efficiency}%` },
		{ label: "Asistencias", value: derived.assists }
	]);

	const cards = [
		{
			title: PLAYER_CATEGORY_TITLES.goles,
			rows: buildPlayerCategoryRows("goles", stat, hiddenStats)
		},
		{
			title: PLAYER_CATEGORY_TITLES.fallos,
			rows: buildPlayerCategoryRows("fallos", stat, hiddenStats)
		},
		{
			title: PLAYER_CATEGORY_TITLES.faltas,
			rows: buildPlayerCategoryRows("faltas", stat, hiddenStats)
		},
		{
			title: PLAYER_CATEGORY_TITLES.acciones,
			rows: buildPlayerCategoryRows("acciones", stat, hiddenStats)
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

function createGoalkeeperSheet(workbook: ExcelJS.Workbook, stat: any, hiddenStats: string[]) {
	const playerName = stat.players?.name ?? "Portero";
	const sheetName = sanitizeSheetName(`Portero - ${playerName}`);
	const ws = workbook.addWorksheet(sheetName);

	ws.properties.defaultRowHeight = 20;

	ws.getCell("A1").value = playerName;
	ws.mergeCells("A1:D1");
	styleTitleRow(ws.getRow(1));

	const derived = getGoalkeeperDerived(stat, hiddenStats);

	let row = 3;

	row = addKeyValueBlock(ws, row, "Información portero", [
		{ label: "Nombre", value: playerName },
		{ label: "Número", value: stat.players?.number ?? "-" },
		{ label: "Rol", value: "Portero" }
	]);

	row = addKeyValueBlock(ws, row, "KPIs", [
		{ label: "Paradas", value: derived.saves },
		{ label: "Goles encajados", value: derived.goalsConceded },
		{ label: "Save %", value: `${derived.savePct}%` },
		{ label: "Tiros recibidos", value: derived.shotsReceived }
	]);

	const cards = [
		{
			title: GOALKEEPER_CATEGORY_TITLES.goles,
			rows: buildGoalkeeperCategoryRows("goles", stat, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.paradas,
			rows: buildGoalkeeperCategoryRows("paradas", stat, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.paradas_penalti,
			rows: buildGoalkeeperCategoryRows("paradas_penalti", stat, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.otros_tiros,
			rows: buildGoalkeeperCategoryRows("otros_tiros", stat, hiddenStats)
		},
		{
			title: GOALKEEPER_CATEGORY_TITLES.inferioridad,
			rows: buildGoalkeeperCategoryRows("inferioridad", stat, hiddenStats)
		},
		{
			title: "Acciones",
			rows: buildMergedGoalkeeperActionRows(stat, hiddenStats)
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
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Waterpolo Stats App";
	workbook.created = new Date();

	createMatchTotalsSheet(workbook, data);

	for (const stat of data.fieldPlayersStats) {
		createFieldPlayerSheet(workbook, stat, data.hiddenStats);
	}

	for (const stat of data.goalkeepersStats) {
		createGoalkeeperSheet(workbook, stat, data.hiddenStats);
	}

	return await workbook.xlsx.writeBuffer();
}
