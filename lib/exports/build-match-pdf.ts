import {
  PDFDocument,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib"
import { getLocale, getTranslations } from "next-intl/server"
import { getPlayerDerived, getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers"
import { type PlayerStatCategory } from "@/lib/stats/playerStatsConfig"
import { getGoalkeeperDerived, getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers"
import { type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig"
import { fetchRemoteImage } from "@/lib/safe-image-fetch"
import { PDF_COLORS as COLORS, createThemedPage, drawAccentLabel, embedReportFonts } from "@/lib/exports/pdf-theme"

type ReportTranslator = (key: string, values?: Record<string, string | number>) => string
type ResultKind = "win" | "loss" | "draw"

type MatchReportData = Awaited<
  ReturnType<typeof import("@/lib/matches/get-match-report-data").getMatchReportData>
>

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 34
const MARGIN_TOP = 32
const MARGIN_BOTTOM = 34
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

function createPage(pdfDoc: PDFDocument) {
  return createThemedPage(pdfDoc, PAGE_WIDTH, PAGE_HEIGHT)
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

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  pageNumber: number,
  pageCount: number,
  t: ReportTranslator
) {
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
    color: COLORS.primary,
  })

  const text = t("pageNumber", { page: pageNumber, total: pageCount })
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
  drawAccentLabel(page, MARGIN_X, y + 8)
  page.drawText(text, {
    x: MARGIN_X + 38,
    y,
    size: 15,
    font: fontBold,
    color: COLORS.text,
  })

  if (subtitle) {
    page.drawText(subtitle, {
      x: MARGIN_X + 38,
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

  page.drawRectangle({
    x,
    y: yTop - h,
    width: 5,
    height: h,
    borderWidth: 0,
    color: COLORS.primary,
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

function drawResultBadge(
  page: PDFPage,
  fontBold: PDFFont,
  x: number,
  yTop: number,
  result: string,
  resultKind: ResultKind
) {
  const isWin = resultKind === "win"
  const isLoss = resultKind === "loss"

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
    resultKind: ResultKind
    competition?: string | null
    date: string
    location?: string | null
    season?: string | null
    round?: string | number | null
    penalties?: string | null
  },
  t: ReportTranslator
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

  page.drawRectangle({
    x: x + 18,
    y: yTop - 43,
    width: 82,
    height: 3,
    borderWidth: 0,
    color: COLORS.primary,
  })

  page.drawText(t("matchReportTitle"), {
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

  page.drawRectangle({
    x: x + 18,
    y: yTop - 148,
    width: 5,
    height: 72,
    borderWidth: 0,
    color: COLORS.primary,
  })

  page.drawText(opts.score, {
    x: x + 30,
    y: yTop - 120,
    size: 32,
    font: fontBold,
    color: COLORS.primary,
  })

  const badgeW = drawResultBadge(
    page,
    fontBold,
    x + CONTENT_WIDTH - 160,
    yTop - 96,
    opts.result,
    opts.resultKind
  )

  if (opts.penalties) {
    drawTag(
      page,
      font,
      fontBold,
      x + CONTENT_WIDTH - Math.max(160, badgeW),
      yTop - 130,
      t("penalties"),
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
    { label: t("competition"), value: String(opts.competition ?? "-") },
    { label: t("date"), value: opts.date },
  ]

  // Fila 2
  const row2 = [
    { label: t("location"), value: String(opts.location ?? "-") },
    { label: t("season"), value: String(opts.season ?? "-") },
  ]

  // Fila 3: ancho completo
  const row3 = { label: t("round"), value: String(opts.round ?? "-") }

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

  page.drawRectangle({
    x,
    y: yTop - 3,
    width: w,
    height: 3,
    borderWidth: 0,
    color: COLORS.primary,
  })

  page.drawText(value, {
    x: x + 10,
    y: yTop - 18,
    size: 13,
    font: fontBold,
    color: COLORS.primary,
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
    color: COLORS.primarySoft,
    borderWidth: 0,
  })

  page.drawText(title, {
    x: x + 10,
    y: yTop - 16,
    size: 9.5,
    font: fontBold,
    color: COLORS.primary,
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
  hiddenStats: string[] | Set<string> | undefined,
  tStat: ReportTranslator
) {
  return getPlayerStatsByCategory(category, hiddenStats).map((def) => ({
    label: tStat(def.key),
    value: String(stats?.[def.key] ?? 0),
  }))
}

function buildGoalkeeperCategoryRows(
  category: GoalkeeperStatCategory,
  stats: Record<string, any>,
  hiddenStats: string[] | Set<string> | undefined,
  tStat: ReportTranslator
) {
  return getGoalkeeperStatsByCategory(category, hiddenStats).map((def) => ({
    label: tStat(def.key),
    value: String(stats?.[def.key] ?? 0),
  }))
}

function buildMergedGoalkeeperActionRows(
  stats: Record<string, any>,
  hiddenStats: string[] | Set<string> | undefined,
  tStat: ReportTranslator
) {
  const actionRows = getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
    label: tStat(def.key),
    value: String(stats?.[def.key] ?? 0),
  }))

  const attackRows = getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
    label: tStat(def.key),
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
    const { contentType, bytes } = await fetchRemoteImage(url)

    if (contentType.includes("png")) return await pdfDoc.embedPng(bytes)
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return await pdfDoc.embedJpg(bytes)
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
  },
  t: ReportTranslator
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
    width: 4,
    height: cardH,
    borderWidth: 0,
    color: COLORS.primary,
  })

  page.drawRectangle({
    x,
    y: yTop - cardH,
    width: CONTENT_WIDTH,
    height: 24,
    borderWidth: 0,
    color: COLORS.primarySoft,
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
    page.drawText(t("noPhoto"), {
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
    color: COLORS.primary,
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
  hiddenStats: string[],
  t: ReportTranslator,
  tStat: ReportTranslator
) {
  let page = createPage(pdfDoc)
  let y = await drawPersonHeroCard(pdfDoc, page, font, fontBold, {
    title: stat.players?.name ?? t("player"),
    subtitle: t("matchDetail", { number: stat.players?.number ?? "-" }),
    roleLabel: t("player"),
    number: stat.players?.number ?? null,
    photoUrl: stat.players?.photo_url ?? null,
  }, t)

  const derived = getPlayerDerived(stat, hiddenStats)

  y = drawCompactKpiRow(page, font, fontBold, y, [
    { label: t("goals"), value: String(derived.goals) },
    { label: t("shots"), value: String(derived.shots) },
    { label: t("efficiency"), value: `${derived.efficiency}%` },
    { label: t("assists"), value: String(derived.assists) },
  ])

  const cards = [
    {
      title: t("categories.playerGoals"),
      rows: buildPlayerCategoryRows("goles", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.playerMisses"),
      rows: buildPlayerCategoryRows("fallos", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.fouls"),
      rows: buildPlayerCategoryRows("faltas", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.actions"),
      rows: buildPlayerCategoryRows("acciones", stat, hiddenStats, tStat),
    },
  ].filter((card) => card.rows.length > 0)

  ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
}

async function drawDetailedGoalkeeperPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  stat: any,
  hiddenStats: string[],
  t: ReportTranslator,
  tStat: ReportTranslator
) {
  let page = createPage(pdfDoc)
  let y = await drawPersonHeroCard(pdfDoc, page, font, fontBold, {
    title: stat.players?.name ?? t("goalkeeper"),
    subtitle: t("matchDetail", { number: stat.players?.number ?? "-" }),
    roleLabel: t("goalkeeper"),
    number: stat.players?.number ?? null,
    photoUrl: stat.players?.photo_url ?? null,
  }, t)

  const derived = getGoalkeeperDerived(stat, hiddenStats)

  y = drawCompactKpiRow(page, font, fontBold, y, [
    { label: t("saves"), value: String(derived.saves) },
    { label: t("goalsConceded"), value: String(derived.goalsConceded) },
    { label: t("savePercentage"), value: `${derived.savePct}%` },
    { label: t("shotsReceived"), value: String(derived.shotsReceived) },
  ])

  const cards = [
    {
      title: t("categories.goalkeeperGoals"),
      rows: buildGoalkeeperCategoryRows("goles", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.saves"),
      rows: buildGoalkeeperCategoryRows("paradas", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.penalties"),
      rows: buildGoalkeeperCategoryRows("paradas_penalti", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.otherShots"),
      rows: buildGoalkeeperCategoryRows("otros_tiros", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.inferiority"),
      rows: buildGoalkeeperCategoryRows("inferioridad", stat, hiddenStats, tStat),
    },
    {
      title: t("categories.actions"),
      rows: buildMergedGoalkeeperActionRows(stat, hiddenStats, tStat),
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
  },
  t: ReportTranslator
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
    width: 5,
    height: 96,
    borderWidth: 0,
    color: COLORS.primary,
  })

  page.drawRectangle({
    x: MARGIN_X,
    y: y - 96,
    width: CONTENT_WIDTH,
    height: 24,
    borderWidth: 0,
    color: COLORS.primarySoft,
  })

  page.drawText(t("teamTotals"), {
    x: MARGIN_X + 16,
    y: y - 16,
    size: 9,
    font: fontBold,
    color: COLORS.primary,
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

export async function buildMatchPdf(data: MatchReportData, options: { detail?: "summary" | "full" } = {}) {
  const reportTranslations = await getTranslations("Reports")
  const statTranslations = await getTranslations("StatLabels")
  const locale = await getLocale()
  const t: ReportTranslator = (key, values) => reportTranslations(key as never, values as never)
  const tStat: ReportTranslator = (key) => statTranslations(key as never)
  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedReportFonts(pdfDoc)

  let page = createPage(pdfDoc)
  let y = PAGE_HEIGHT - MARGIN_TOP

  const {
    match,
    clubName,
    matchDate,
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

  const localizedClubName = clubName === "Nuestro Equipo" ? t("ourTeam") : clubName
  const resultKind: ResultKind = hasPenalties
    ? (match.penalty_home_score ?? 0) > (match.penalty_away_score ?? 0)
      ? "win"
      : "loss"
    : match.home_score > match.away_score
      ? "win"
      : match.home_score < match.away_score
        ? "loss"
        : "draw"
  const localizedResult = hasPenalties
    ? t(resultKind === "win" ? "winPenalties" : "lossPenalties")
    : t(resultKind)

  y = drawHeroHeader(page, font, fontBold, {
    title: t("versus", { team: localizedClubName, opponent: match.opponent }),
    score: `${match.home_score} - ${match.away_score}`,
    result: localizedResult,
    resultKind,
    competition: match.competitions?.name ?? "-",
    date: matchDate.toLocaleDateString(locale, {
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
  }, t)

  // más aire tras header
  drawDivider(page, y)
  y -= 28

  ;({ page, y } = ensureSpace(pdfDoc, page, y, 140))
  drawSectionTitle(page, fontBold, font, t("periods"), y, t("periodsDescription"))
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
      t("periodLine", {
        quarter: t("quarter", { number: period.q }),
        home: period.home,
        away: period.away,
        winner: period.winner ? `#${period.winner.number} ${period.winner.name}` : "-",
      }),
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
    drawSectionTitle(page, fontBold, font, t("penaltyShootout"), y, t("penaltySequence"))
    y -= 28

    page.drawText(t("homeShooters"), {
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
        t("homeShotLine", {
          order: shot.shot_order,
          player: shot.players ? `#${shot.players.number} ${shot.players.name}` : t("unknown"),
          result: shot.scored ? t("scored") : t("missed"),
          type: shot.result_type ? ` | ${shot.result_type}` : "",
        }),
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
    page.drawText(t("opponentShots"), {
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
        t("goalkeeperShotLine", {
          order: shot.shot_order,
          goalkeeper: shot.goalkeeper
            ? `#${shot.goalkeeper.number} ${shot.goalkeeper.name}`
            : t("unknown"),
          result: shot.scored ? t("goal") : t("savedOrMissed"),
          type: shot.result_type ? ` | ${shot.result_type}` : "",
        }),
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
    drawSectionTitle(page, fontBold, font, t("notes"), y)
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

  if (options.detail !== "summary") {
  const attackCards = [
    {
      title: t("categories.playerGoals"),
      rows: buildPlayerCategoryRows("goles", attackTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.playerMisses"),
      rows: buildPlayerCategoryRows("fallos", attackTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.fouls"),
      rows: buildPlayerCategoryRows("faltas", attackTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.actions"),
      rows: buildPlayerCategoryRows("acciones", attackTotals, hiddenStats, tStat),
    },
  ].filter((card) => card.rows.length > 0)

  await drawTotalsPage(pdfDoc, font, fontBold, {
    title: t("attack"),
    subtitle: t("attackDescription"),
    kpis: [
      { label: t("goals"), value: String(attackSummary.topBar.goals) },
      { label: t("shots"), value: String(attackSummary.topBar.shots) },
      { label: t("efficiency"), value: `${attackSummary.topBar.efficiency}%` },
      { label: t("assists"), value: String(attackSummary.topBar.assists) },
    ],
    cards: attackCards,
  }, t)

  const defenseCards = [
    {
      title: t("categories.fouls"),
      rows: buildPlayerCategoryRows("faltas", defenseTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.actions"),
      rows: buildPlayerCategoryRows("acciones", defenseTotals, hiddenStats, tStat),
    },
  ].filter((card) => card.rows.length > 0)

  await drawTotalsPage(pdfDoc, font, fontBold, {
    title: t("defense"),
    subtitle: t("defenseDescription"),
    kpis: [
      { label: t("fouls"), value: String(defenseSummary.defense.fouls) },
      { label: t("blocks"), value: String(defenseSummary.defense.blocks) },
      { label: t("recoveries"), value: String(defenseSummary.defense.recoveries) },
      { label: t("rebounds"), value: String(defenseSummary.defense.rebounds) },
    ],
    cards: defenseCards,
  }, t)

  const goalkeeperCards = [
    {
      title: t("categories.goalkeeperGoals"),
      rows: buildGoalkeeperCategoryRows("goles", goalkeeperTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.saves"),
      rows: buildGoalkeeperCategoryRows("paradas", goalkeeperTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.penalties"),
      rows: buildGoalkeeperCategoryRows("paradas_penalti", goalkeeperTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.otherShots"),
      rows: buildGoalkeeperCategoryRows("otros_tiros", goalkeeperTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.inferiority"),
      rows: buildGoalkeeperCategoryRows("inferioridad", goalkeeperTotals, hiddenStats, tStat),
    },
    {
      title: t("categories.actions"),
      rows: buildMergedGoalkeeperActionRows(goalkeeperTotals, hiddenStats, tStat),
    },
  ].filter((card) => card.rows.length > 0)

  await drawTotalsPage(pdfDoc, font, fontBold, {
    title: t("goalkeeper"),
    subtitle: t("goalkeeperDescription"),
    kpis: [
      { label: t("saves"), value: String(goalkeeperSummary.topBar.saves) },
      { label: t("goalsConceded"), value: String(goalkeeperSummary.topBar.goalsConceded) },
      { label: t("shotsReceived"), value: String(goalkeeperSummary.topBar.shotsReceived) },
      { label: t("savePercentage"), value: `${goalkeeperSummary.topBar.savePct}%` },
    ],
    cards: goalkeeperCards,
  }, t)

  for (const stat of fieldPlayersStats) {
    await drawDetailedFieldPlayerPage(pdfDoc, font, fontBold, stat, hiddenStats, t, tStat)
  }

  for (const stat of goalkeepersStats) {
    await drawDetailedGoalkeeperPage(pdfDoc, font, fontBold, stat, hiddenStats, t, tStat)
  }
  }

  const pages = pdfDoc.getPages()
  pages.forEach((p, index) => {
    drawFooter(p, font, index + 1, pages.length, t)
  })

  return await pdfDoc.save()
}
