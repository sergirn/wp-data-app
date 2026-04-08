import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib"
import { getPlayerDerived, getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers"
import {
  PLAYER_CATEGORY_TITLES,
  type PlayerStatCategory,
} from "@/lib/stats/playerStatsConfig"
import { getGoalkeeperDerived, getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers"
import {
  GOALKEEPER_CATEGORY_TITLES,
  type GoalkeeperStatCategory,
} from "@/lib/stats/goalkeeperStatsConfig"

type MatchReportData = Awaited<
  ReturnType<typeof import("@/lib/matches/get-match-report-data").getMatchReportData>
>

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 34
const MARGIN_TOP = 32
const MARGIN_BOTTOM = 34
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

const COLORS = {
  text: rgb(0.09, 0.11, 0.14),
  textSoft: rgb(0.43, 0.47, 0.54),
  border: rgb(0.86, 0.89, 0.93),
  borderSoft: rgb(0.91, 0.94, 0.97),
  surface: rgb(1, 1, 1),
  surfaceAlt: rgb(0.975, 0.982, 0.992),
  panel: rgb(0.965, 0.978, 0.995),
  blue: rgb(0.17, 0.36, 0.72),
  blueSoft: rgb(0.9, 0.95, 1),
  greenBg: rgb(0.92, 0.98, 0.94),
  greenText: rgb(0.12, 0.46, 0.22),
  redBg: rgb(0.99, 0.93, 0.93),
  redText: rgb(0.62, 0.15, 0.15),
  yellowBg: rgb(1, 0.97, 0.9),
  yellowText: rgb(0.62, 0.42, 0.08),
}

function createPage(pdfDoc: PDFDocument) {
  return pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
}

function ensureSpace(pdfDoc: PDFDocument, page: PDFPage, y: number, needed = 80) {
  if (y > MARGIN_BOTTOM + needed) return { page, y }
  const newPage = createPage(pdfDoc)
  return { page: newPage, y: PAGE_HEIGHT - MARGIN_TOP }
}

function wrapText(text: string, maxChars = 90) {
  if (!text) return []
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines
}

function drawDivider(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 1,
    color: COLORS.borderSoft,
  })
}

function drawFooter(page: PDFPage, font: PDFFont, pageNumber: number, pageCount: number) {
  page.drawLine({
    start: { x: MARGIN_X, y: 24 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: 24 },
    thickness: 1,
    color: COLORS.borderSoft,
  })

  page.drawText("Waterpolo Stats App", {
    x: MARGIN_X,
    y: 12,
    size: 8,
    font,
    color: COLORS.textSoft,
  })

  const text = `Page ${pageNumber} / ${pageCount}`
  page.drawText(text, {
    x: PAGE_WIDTH - MARGIN_X - 48,
    y: 12,
    size: 8,
    font,
    color: COLORS.textSoft,
  })
}

function drawSectionTitle(
  page: PDFPage,
  fontBold: PDFFont,
  font: PDFFont,
  text: string,
  y: number,
  subtitle?: string
) {
  page.drawText(text, {
    x: MARGIN_X,
    y,
    size: 15,
    font: fontBold,
    color: COLORS.text,
  })

  if (subtitle) {
    page.drawText(subtitle, {
      x: MARGIN_X,
      y: y - 12,
      size: 9,
      font,
      color: COLORS.textSoft,
    })
  }
}

function drawTag(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  yTop: number,
  label: string,
  value: string,
  width?: number
) {
  const w = width ?? Math.max(94, (label.length + value.length) * 4.9 + 20)
  const h = 22

  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.surface,
  })

  page.drawText(label, {
    x: x + 8,
    y: yTop - 14,
    size: 8,
    font,
    color: COLORS.textSoft,
  })

  page.drawText(value, {
    x: x + 8 + label.length * 4.1 + 8,
    y: yTop - 14,
    size: 8.2,
    font: fontBold,
    color: COLORS.text,
  })

  return w
}

function drawResultBadge(page: PDFPage, fontBold: PDFFont, x: number, yTop: number, result: string) {
  const isWin = result.toLowerCase().includes("victoria")
  const isLoss = result.toLowerCase().includes("derrota")

  const bg = isWin ? COLORS.greenBg : isLoss ? COLORS.redBg : COLORS.yellowBg
  const color = isWin ? COLORS.greenText : isLoss ? COLORS.redText : COLORS.yellowText

  const w = Math.max(110, result.length * 5.8 + 20)
  const h = 24

  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    borderWidth: 0,
    color: bg,
  })

  page.drawText(result, {
    x: x + 10,
    y: yTop - 15,
    size: 9,
    font: fontBold,
    color,
  })

  return w
}

function drawHeroHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  opts: {
    title: string
    score: string
    result: string
    competition?: string | null
    date: string
    location?: string | null
    season?: string | null
    round?: string | number | null
    penalties?: string | null
  }
) {
  const x = MARGIN_X
  const yTop = PAGE_HEIGHT - MARGIN_TOP

  // Más altura para que entre todo bien
  const h = 300

  page.drawRectangle({
    x,
    y: yTop - h,
    width: CONTENT_WIDTH,
    height: h,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.surface,
  })

  page.drawRectangle({
    x,
    y: yTop - 42,
    width: CONTENT_WIDTH,
    height: 42,
    borderWidth: 0,
    color: COLORS.surfaceAlt,
  })

  page.drawText("MATCH REPORT", {
    x: x + 18,
    y: yTop - 25,
    size: 9,
    font: fontBold,
    color: COLORS.textSoft,
  })

  page.drawText(opts.title, {
    x: x + 18,
    y: yTop - 68,
    size: 22,
    font: fontBold,
    color: COLORS.text,
    maxWidth: CONTENT_WIDTH - 36,
  })

  // Score
  page.drawRectangle({
    x: x + 18,
    y: yTop - 148,
    width: 188,
    height: 72,
    borderWidth: 0,
    color: COLORS.blueSoft,
  })

  page.drawText(opts.score, {
    x: x + 30,
    y: yTop - 120,
    size: 32,
    font: fontBold,
    color: COLORS.blue,
  })

  const badgeW = drawResultBadge(
    page,
    fontBold,
    x + CONTENT_WIDTH - 160,
    yTop - 96,
    opts.result
  )

  if (opts.penalties) {
    drawTag(
      page,
      font,
      fontBold,
      x + CONTENT_WIDTH - Math.max(160, badgeW),
      yTop - 130,
      "Penalties",
      opts.penalties,
      Math.max(128, badgeW)
    )
  }

  // Grid metadata
  const gridX = x + 18
  const gridTop = yTop - 176
  const gap = 10
  const colW = (CONTENT_WIDTH - 36 - gap) / 2
  const rowH = 28

  // Fila 1
  const row1 = [
    { label: "Competition", value: String(opts.competition ?? "-") },
    { label: "Date", value: opts.date },
  ]

  // Fila 2
  const row2 = [
    { label: "Location", value: String(opts.location ?? "-") },
    { label: "Season", value: String(opts.season ?? "-") },
  ]

  // Fila 3: ancho completo
  const row3 = { label: "Round", value: String(opts.round ?? "-") }

  const drawMetaCell = (
    cellX: number,
    cellY: number,
    width: number,
    label: string,
    value: string
  ) => {
    page.drawRectangle({
      x: cellX,
      y: cellY - rowH,
      width,
      height: rowH,
      borderWidth: 1,
      borderColor: COLORS.borderSoft,
      color: COLORS.surfaceAlt,
    })

    page.drawText(label, {
      x: cellX + 8,
      y: cellY - 17,
      size: 8,
      font,
      color: COLORS.textSoft,
    })

    page.drawText(value, {
      x: cellX + 86,
      y: cellY - 17,
      size: 8.5,
      font: fontBold,
      color: COLORS.text,
      maxWidth: width - 94,
    })
  }

  // Draw row 1
  row1.forEach((item, index) => {
    const cellX = gridX + index * (colW + gap)
    const cellY = gridTop
    drawMetaCell(cellX, cellY, colW, item.label, item.value)
  })

  // Draw row 2
  row2.forEach((item, index) => {
    const cellX = gridX + index * (colW + gap)
    const cellY = gridTop - (rowH + 10)
    drawMetaCell(cellX, cellY, colW, item.label, item.value)
  })

  // Draw row 3 full width
  drawMetaCell(
    gridX,
    gridTop - (rowH + 10) * 2,
    CONTENT_WIDTH - 36,
    row3.label,
    row3.value
  )

  return yTop - h - 28
}

function drawKpiBox(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  yTop: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    color: COLORS.surfaceAlt,
  })

  page.drawText(value, {
    x: x + 10,
    y: yTop - 18,
    size: 13,
    font: fontBold,
    color: COLORS.text,
  })

  page.drawText(label, {
    x: x + 10,
    y: yTop - 32,
    size: 8.5,
    font,
    color: COLORS.textSoft,
  })
}

function drawCompactKpiRow(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  yTop: number,
  items: Array<{ label: string; value: string }>
) {
  const gap = 8
  const w = (CONTENT_WIDTH - gap * (items.length - 1)) / items.length
  const h = 44

  items.forEach((item, index) => {
    drawKpiBox(
      page,
      font,
      fontBold,
      MARGIN_X + index * (w + gap),
      yTop,
      w,
      h,
      item.label,
      item.value
    )
  })

  return yTop - 56
}

function drawRowBox(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  yTop: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    color: COLORS.surfaceAlt,
  })

  page.drawText(label, {
    x: x + 8,
    y: yTop - 14,
    size: 8.4,
    font,
    color: COLORS.text,
    maxWidth: w - 60,
  })

  page.drawText(value, {
    x: x + w - 38,
    y: yTop - 14,
    size: 8.8,
    font: fontBold,
    color: COLORS.text,
  })
}

function getCategoryCardHeight(rowCount: number) {
  const headerH = 24
  const rowH = 20
  const gap = 4
  return headerH + 8 + rowCount * rowH + Math.max(0, rowCount - 1) * gap + 8
}

function drawCategoryCard(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  yTop: number,
  w: number,
  title: string,
  rows: Array<{ label: string; value: string }>
) {
  const headerH = 24
  const rowH = 20
  const gap = 4
  const totalH = getCategoryCardHeight(rows.length)

  page.drawRectangle({
    x,
    y: yTop - totalH,
    width: w,
    height: totalH,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.surface,
  })

  page.drawRectangle({
    x,
    y: yTop - headerH,
    width: w,
    height: headerH,
    color: COLORS.surfaceAlt,
    borderWidth: 0,
  })

  page.drawText(title, {
    x: x + 10,
    y: yTop - 16,
    size: 9.5,
    font: fontBold,
    color: COLORS.text,
  })

  let rowY = yTop - headerH - 6
  for (const row of rows) {
    drawRowBox(page, font, fontBold, x + 6, rowY, w - 12, rowH, row.label, row.value)
    rowY -= rowH + gap
  }

  return totalH
}

function drawTwoColumnGrid(
  pdfDoc: PDFDocument,
  state: { page: PDFPage; y: number },
  font: PDFFont,
  fontBold: PDFFont,
  cards: Array<{ title: string; rows: Array<{ label: string; value: string }> }>
) {
  let { page, y } = state
  const gap = 12
  const colW = (CONTENT_WIDTH - gap) / 2

  for (let i = 0; i < cards.length; i += 2) {
    const left = cards[i]
    const right = cards[i + 1]

    const leftH = getCategoryCardHeight(left.rows.length)
    const rightH = right ? getCategoryCardHeight(right.rows.length) : 0
    const blockH = Math.max(leftH, rightH)

    ;({ page, y } = ensureSpace(pdfDoc, page, y, blockH + 8))

    drawCategoryCard(page, font, fontBold, MARGIN_X, y, colW, left.title, left.rows)

    if (right) {
      drawCategoryCard(page, font, fontBold, MARGIN_X + colW + gap, y, colW, right.title, right.rows)
    }

    y -= blockH + 10
  }

  return { page, y }
}

function buildPlayerCategoryRows(
  category: PlayerStatCategory,
  stats: Record<string, any>,
  hiddenStats?: string[] | Set<string>
) {
  return getPlayerStatsByCategory(category, hiddenStats).map((def) => ({
    label: def.label,
    value: String(stats?.[def.key] ?? 0),
  }))
}

function buildGoalkeeperCategoryRows(
  category: GoalkeeperStatCategory,
  stats: Record<string, any>,
  hiddenStats?: string[] | Set<string>
) {
  return getGoalkeeperStatsByCategory(category, hiddenStats).map((def) => ({
    label: def.label,
    value: String(stats?.[def.key] ?? 0),
  }))
}

function buildMergedGoalkeeperActionRows(
  stats: Record<string, any>,
  hiddenStats?: string[] | Set<string>
) {
  const actionRows = getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
    label: def.label,
    value: String(stats?.[def.key] ?? 0),
  }))

  const attackRows = getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
    label: def.label,
    value: String(stats?.[def.key] ?? 0),
  }))

  return [...actionRows, ...attackRows]
}

async function fetchImageAsPdfImage(
  pdfDoc: PDFDocument,
  url?: string | null
): Promise<PDFImage | null> {
  if (!url) return null

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const contentType = response.headers.get("content-type") || ""
    const bytes = await response.arrayBuffer()

    if (contentType.includes("png")) return await pdfDoc.embedPng(bytes)
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return await pdfDoc.embedJpg(bytes)
    if (url.toLowerCase().endsWith(".png")) return await pdfDoc.embedPng(bytes)
    if (url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg")) {
      return await pdfDoc.embedJpg(bytes)
    }
    return null
  } catch {
    return null
  }
}

async function drawPersonHeroCard(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  opts: {
    title: string
    subtitle: string
    roleLabel: string
    photoUrl?: string | null
    number?: number | null
  }
) {
  const x = MARGIN_X
  const yTop = PAGE_HEIGHT - MARGIN_TOP
  const cardH = 118
  const photoW = 84
  const photoH = 100

  page.drawRectangle({
    x,
    y: yTop - cardH,
    width: CONTENT_WIDTH,
    height: cardH,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.surface,
  })

  page.drawRectangle({
    x,
    y: yTop - cardH,
    width: CONTENT_WIDTH,
    height: 24,
    borderWidth: 0,
    color: COLORS.surfaceAlt,
  })

  const photoX = x + 8
  const photoY = yTop - 8 - photoH

  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.panel,
  })

  const image = await fetchImageAsPdfImage(pdfDoc, opts.photoUrl)
  if (image) {
    page.drawImage(image, {
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
    })
  } else {
    page.drawText(`#${opts.number ?? "-"}`, {
      x: photoX + 18,
      y: photoY + 42,
      size: 22,
      font: fontBold,
      color: COLORS.textSoft,
    })
    page.drawText("No photo", {
      x: photoX + 16,
      y: photoY + 24,
      size: 9,
      font,
      color: COLORS.textSoft,
    })
  }

  const textX = photoX + photoW + 14

  page.drawText(opts.title, {
    x: textX,
    y: yTop - 31,
    size: 18,
    font: fontBold,
    color: COLORS.text,
    maxWidth: CONTENT_WIDTH - photoW - 40,
  })

  page.drawText(opts.subtitle, {
    x: textX,
    y: yTop - 49,
    size: 10,
    font,
    color: COLORS.textSoft,
  })

  page.drawRectangle({
    x: textX,
    y: yTop - 78,
    width: 92,
    height: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.surfaceAlt,
  })

  page.drawText(opts.roleLabel, {
    x: textX + 10,
    y: yTop - 71,
    size: 9,
    font: fontBold,
    color: COLORS.text,
  })

  return yTop - cardH - 14
}

async function drawDetailedFieldPlayerPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  stat: any,
  hiddenStats: string[]
) {
  let page = createPage(pdfDoc)
  let y = await drawPersonHeroCard(pdfDoc, page, font, fontBold, {
    title: stat.players?.name ?? "Jugador",
    subtitle: `#${stat.players?.number ?? "-"} · Match detail`,
    roleLabel: "Player",
    number: stat.players?.number ?? null,
    photoUrl: stat.players?.photo_url ?? null,
  })

  const derived = getPlayerDerived(stat, hiddenStats)

  y = drawCompactKpiRow(page, font, fontBold, y, [
    { label: "Goals", value: String(derived.goals) },
    { label: "Shots", value: String(derived.shots) },
    { label: "Efficiency", value: `${derived.efficiency}%` },
    { label: "Assists", value: String(derived.assists) },
  ])

  const cards = [
    {
      title: PLAYER_CATEGORY_TITLES.goles,
      rows: buildPlayerCategoryRows("goles", stat, hiddenStats),
    },
    {
      title: PLAYER_CATEGORY_TITLES.fallos,
      rows: buildPlayerCategoryRows("fallos", stat, hiddenStats),
    },
    {
      title: PLAYER_CATEGORY_TITLES.faltas,
      rows: buildPlayerCategoryRows("faltas", stat, hiddenStats),
    },
    {
      title: PLAYER_CATEGORY_TITLES.acciones,
      rows: buildPlayerCategoryRows("acciones", stat, hiddenStats),
    },
  ].filter((card) => card.rows.length > 0)

  ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
}

async function drawDetailedGoalkeeperPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  stat: any,
  hiddenStats: string[]
) {
  let page = createPage(pdfDoc)
  let y = await drawPersonHeroCard(pdfDoc, page, font, fontBold, {
    title: stat.players?.name ?? "Portero",
    subtitle: `#${stat.players?.number ?? "-"} · Match detail`,
    roleLabel: "Goalkeeper",
    number: stat.players?.number ?? null,
    photoUrl: stat.players?.photo_url ?? null,
  })

  const derived = getGoalkeeperDerived(stat, hiddenStats)

  y = drawCompactKpiRow(page, font, fontBold, y, [
    { label: "Saves", value: String(derived.saves) },
    { label: "Goals Ag.", value: String(derived.goalsConceded) },
    { label: "Save %", value: `${derived.savePct}%` },
    { label: "Shots", value: String(derived.shotsReceived) },
  ])

  const cards = [
    {
      title: GOALKEEPER_CATEGORY_TITLES.goles,
      rows: buildGoalkeeperCategoryRows("goles", stat, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.paradas,
      rows: buildGoalkeeperCategoryRows("paradas", stat, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.paradas_penalti,
      rows: buildGoalkeeperCategoryRows("paradas_penalti", stat, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.otros_tiros,
      rows: buildGoalkeeperCategoryRows("otros_tiros", stat, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.inferioridad,
      rows: buildGoalkeeperCategoryRows("inferioridad", stat, hiddenStats),
    },
    {
      title: "Acciones",
      rows: buildMergedGoalkeeperActionRows(stat, hiddenStats),
    },
  ].filter((card) => card.rows.length > 0)

  ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
}

async function drawTotalsPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  opts: {
    title: string
    subtitle: string
    kpis: Array<{ label: string; value: string }>
    cards: Array<{ title: string; rows: Array<{ label: string; value: string }> }>
  }
) {
  let page = createPage(pdfDoc)
  let y = PAGE_HEIGHT - MARGIN_TOP

  page.drawRectangle({
    x: MARGIN_X,
    y: y - 96,
    width: CONTENT_WIDTH,
    height: 96,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.surface,
  })

  page.drawRectangle({
    x: MARGIN_X,
    y: y - 96,
    width: CONTENT_WIDTH,
    height: 24,
    borderWidth: 0,
    color: COLORS.surfaceAlt,
  })

  page.drawText("TEAM TOTALS", {
    x: MARGIN_X + 16,
    y: y - 16,
    size: 9,
    font: fontBold,
    color: COLORS.textSoft,
  })

  page.drawText(opts.title, {
    x: MARGIN_X + 16,
    y: y - 46,
    size: 24,
    font: fontBold,
    color: COLORS.text,
  })

  page.drawText(opts.subtitle, {
    x: MARGIN_X + 16,
    y: y - 63,
    size: 10,
    font,
    color: COLORS.textSoft,
  })

  y -= 116
  y = drawCompactKpiRow(page, font, fontBold, y, opts.kpis)
  ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, opts.cards))
}

export async function buildMatchPdf(data: MatchReportData) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = createPage(pdfDoc)
  let y = PAGE_HEIGHT - MARGIN_TOP

  const {
    match,
    clubName,
    matchDate,
    result,
    hasPenalties,
    periods,
    homePenaltyShooters,
    rivalPenaltyShots,
    fieldPlayersStats,
    goalkeepersStats,
    hiddenStats,
    attackTotals,
    attackSummary,
    defenseTotals,
    defenseSummary,
    goalkeeperTotals,
    goalkeeperSummary,
  } = data

  y = drawHeroHeader(page, font, fontBold, {
    title: `${clubName} vs ${match.opponent}`,
    score: `${match.home_score} - ${match.away_score}`,
    result,
    competition: match.competitions?.name ?? "-",
    date: matchDate.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    location: match.location ?? "-",
    season: match.season ?? "-",
    round: match.jornada ?? "-",
    penalties: hasPenalties
      ? `${match.penalty_home_score ?? 0} - ${match.penalty_away_score ?? 0}`
      : null,
  })

  // más aire tras header
  drawDivider(page, y)
  y -= 28

  ;({ page, y } = ensureSpace(pdfDoc, page, y, 140))
  drawSectionTitle(page, fontBold, font, "Periods", y, "Quarter-by-quarter score and sprint winners")
  y -= 28

  for (const period of periods) {
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 22,
      width: CONTENT_WIDTH,
      height: 22,
      borderWidth: 1,
      borderColor: COLORS.borderSoft,
      color: COLORS.surfaceAlt,
    })

    page.drawText(
      `Q${period.q}: ${period.home} - ${period.away} | Sprint winner: ${
        period.winner ? `#${period.winner.number} ${period.winner.name}` : "-"
      }`,
      {
        x: MARGIN_X + 8,
        y: y - 14,
        size: 8.8,
        font,
        color: COLORS.text,
      }
    )
    y -= 26
  }

  if (hasPenalties) {
    // más separación entre periods y penalty
    y -= 20
    ;({ page, y } = ensureSpace(pdfDoc, page, y, 160))
    drawSectionTitle(page, fontBold, font, "Penalty Shootout", y, "Sequence of penalty actions")
    y -= 28

    page.drawText("Our shooters", {
      x: MARGIN_X,
      y,
      size: 10,
      font: fontBold,
      color: COLORS.text,
    })
    y -= 14

    for (const shot of homePenaltyShooters) {
      ;({ page, y } = ensureSpace(pdfDoc, page, y, 24))
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 20,
        width: CONTENT_WIDTH,
        height: 20,
        borderWidth: 1,
        borderColor: COLORS.borderSoft,
        color: COLORS.surfaceAlt,
      })

      page.drawText(
        `${shot.shot_order}. ${shot.players ? `#${shot.players.number} ${shot.players.name}` : "Unknown"} | ${
          shot.scored ? "Scored" : "Missed"
        }${shot.result_type ? ` | ${shot.result_type}` : ""}`,
        {
          x: MARGIN_X + 8,
          y: y - 13,
          size: 8.6,
          font,
          color: COLORS.text,
          maxWidth: CONTENT_WIDTH - 16,
        }
      )
      y -= 24
    }

    y -= 10
    page.drawText("Rival shots", {
      x: MARGIN_X,
      y,
      size: 10,
      font: fontBold,
      color: COLORS.text,
    })
    y -= 14

    for (const shot of rivalPenaltyShots) {
      ;({ page, y } = ensureSpace(pdfDoc, page, y, 24))
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 20,
        width: CONTENT_WIDTH,
        height: 20,
        borderWidth: 1,
        borderColor: COLORS.borderSoft,
        color: COLORS.surfaceAlt,
      })

      page.drawText(
        `${shot.shot_order}. Goalkeeper: ${
          shot.goalkeeper ? `#${shot.goalkeeper.number} ${shot.goalkeeper.name}` : "Unknown"
        } | ${shot.scored ? "Goal" : "Saved/Missed"}${shot.result_type ? ` | ${shot.result_type}` : ""}`,
        {
          x: MARGIN_X + 8,
          y: y - 13,
          size: 8.6,
          font,
          color: COLORS.text,
          maxWidth: CONTENT_WIDTH - 16,
        }
      )
      y -= 24
    }
  }

  if (match.notes) {
    // más espacio también antes de notes
    y -= 20
    ;({ page, y } = ensureSpace(pdfDoc, page, y, 110))
    drawSectionTitle(page, fontBold, font, "Notes", y)
    y -= 20

    const lines = wrapText(match.notes, 95)
    for (const line of lines) {
      ;({ page, y } = ensureSpace(pdfDoc, page, y, 18))
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size: 9.6,
        font,
        color: COLORS.text,
      })
      y -= 13
    }
  }

  const attackCards = [
    {
      title: PLAYER_CATEGORY_TITLES.goles,
      rows: buildPlayerCategoryRows("goles", attackTotals, hiddenStats),
    },
    {
      title: PLAYER_CATEGORY_TITLES.fallos,
      rows: buildPlayerCategoryRows("fallos", attackTotals, hiddenStats),
    },
    {
      title: PLAYER_CATEGORY_TITLES.faltas,
      rows: buildPlayerCategoryRows("faltas", attackTotals, hiddenStats),
    },
    {
      title: PLAYER_CATEGORY_TITLES.acciones,
      rows: buildPlayerCategoryRows("acciones", attackTotals, hiddenStats),
    },
  ].filter((card) => card.rows.length > 0)

  await drawTotalsPage(pdfDoc, font, fontBold, {
    title: "Attack",
    subtitle: "Team offensive output and shot profile",
    kpis: [
      { label: "Goals", value: String(attackSummary.topBar.goals) },
      { label: "Shots", value: String(attackSummary.topBar.shots) },
      { label: "Efficiency", value: `${attackSummary.topBar.efficiency}%` },
      { label: "Assists", value: String(attackSummary.topBar.assists) },
    ],
    cards: attackCards,
  })

  const defenseCards = [
    {
      title: PLAYER_CATEGORY_TITLES.faltas,
      rows: buildPlayerCategoryRows("faltas", defenseTotals, hiddenStats),
    },
    {
      title: PLAYER_CATEGORY_TITLES.acciones,
      rows: buildPlayerCategoryRows("acciones", defenseTotals, hiddenStats),
    },
  ].filter((card) => card.rows.length > 0)

  await drawTotalsPage(pdfDoc, font, fontBold, {
    title: "Defense",
    subtitle: "Defensive actions, fouls and recoveries",
    kpis: [
      { label: "Fouls", value: String(defenseSummary.defense.fouls) },
      { label: "Blocks", value: String(defenseSummary.defense.blocks) },
      { label: "Recoveries", value: String(defenseSummary.defense.recoveries) },
      { label: "Rebounds", value: String(defenseSummary.defense.rebounds) },
    ],
    cards: defenseCards,
  })

  const goalkeeperCards = [
    {
      title: GOALKEEPER_CATEGORY_TITLES.goles,
      rows: buildGoalkeeperCategoryRows("goles", goalkeeperTotals, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.paradas,
      rows: buildGoalkeeperCategoryRows("paradas", goalkeeperTotals, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.paradas_penalti,
      rows: buildGoalkeeperCategoryRows("paradas_penalti", goalkeeperTotals, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.otros_tiros,
      rows: buildGoalkeeperCategoryRows("otros_tiros", goalkeeperTotals, hiddenStats),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.inferioridad,
      rows: buildGoalkeeperCategoryRows("inferioridad", goalkeeperTotals, hiddenStats),
    },
    {
      title: "Acciones",
      rows: buildMergedGoalkeeperActionRows(goalkeeperTotals, hiddenStats),
    },
  ].filter((card) => card.rows.length > 0)

  await drawTotalsPage(pdfDoc, font, fontBold, {
    title: "Goalkeeper",
    subtitle: "Shot prevention and goalkeeper breakdown",
    kpis: [
      { label: "Saves", value: String(goalkeeperSummary.topBar.saves) },
      { label: "Goals Against", value: String(goalkeeperSummary.topBar.goalsConceded) },
      { label: "Shots Received", value: String(goalkeeperSummary.topBar.shotsReceived) },
      { label: "Save %", value: `${goalkeeperSummary.topBar.savePct}%` },
    ],
    cards: goalkeeperCards,
  })

  for (const stat of fieldPlayersStats) {
    await drawDetailedFieldPlayerPage(pdfDoc, font, fontBold, stat, hiddenStats)
  }

  for (const stat of goalkeepersStats) {
    await drawDetailedGoalkeeperPage(pdfDoc, font, fontBold, stat, hiddenStats)
  }

  const pages = pdfDoc.getPages()
  pages.forEach((p, index) => {
    drawFooter(p, font, index + 1, pages.length)
  })

  return await pdfDoc.save()
}