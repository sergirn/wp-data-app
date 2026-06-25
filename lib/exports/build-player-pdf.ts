import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib"
import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers"
import { PLAYER_CATEGORY_TITLES } from "@/lib/stats/playerStatsConfig"
import { getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers"
import { GOALKEEPER_CATEGORY_TITLES } from "@/lib/stats/goalkeeperStatsConfig"

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
}

function createPage(pdfDoc: PDFDocument) {
  return pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
}

function ensureSpace(pdfDoc: PDFDocument, page: PDFPage, y: number, needed = 80) {
  if (y > MARGIN_BOTTOM + needed) return { page, y }
  const newPage = createPage(pdfDoc)
  return { page: newPage, y: PAGE_HEIGHT - MARGIN_TOP }
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
    const x = MARGIN_X + index * (w + gap)

    page.drawRectangle({
      x,
      y: yTop - h,
      width: w,
      height: h,
      borderWidth: 1,
      borderColor: COLORS.borderSoft,
      color: COLORS.surfaceAlt,
    })

    page.drawText(item.value, {
      x: x + 10,
      y: yTop - 18,
      size: 13,
      font: fontBold,
      color: COLORS.text,
    })

    page.drawText(item.label, {
      x: x + 10,
      y: yTop - 32,
      size: 8.5,
      font,
      color: COLORS.textSoft,
    })
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

  const paddingX = 8
  const valueSize = 8.8
  const labelSize = 8.4

  const valueWidth = fontBold.widthOfTextAtSize(value, valueSize)
  const valueX = x + w - paddingX - valueWidth

  page.drawText(label, {
    x: x + paddingX,
    y: yTop - 14,
    size: labelSize,
    font,
    color: COLORS.text,
    maxWidth: Math.max(60, w - valueWidth - 24),
  })

  page.drawText(value, {
    x: valueX,
    y: yTop - 14,
    size: valueSize,
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

async function drawPlayerHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  opts: {
    playerName: string
    playerNumber?: number | null
    roleLabel: string
    photoUrl?: string | null
    subtitle: string
  }
) {
  const x = MARGIN_X
  const yTop = PAGE_HEIGHT - MARGIN_TOP
  const cardH = 132
  const photoW = 88
  const photoH = 108

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
    height: 26,
    borderWidth: 0,
    color: COLORS.surfaceAlt,
  })

  page.drawText("PLAYER REPORT", {
    x: x + 14,
    y: yTop - 17,
    size: 9,
    font: fontBold,
    color: COLORS.textSoft,
  })

  const photoX = x + 12
  const photoY = yTop - 12 - photoH

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
    page.drawText(`#${opts.playerNumber ?? "-"}`, {
      x: photoX + 18,
      y: photoY + 44,
      size: 22,
      font: fontBold,
      color: COLORS.textSoft,
    })
  }

  const textX = photoX + photoW + 16

  page.drawText(opts.playerName, {
    x: textX,
    y: yTop - 44,
    size: 21,
    font: fontBold,
    color: COLORS.text,
    maxWidth: CONTENT_WIDTH - photoW - 60,
  })

  page.drawText(opts.subtitle, {
    x: textX,
    y: yTop - 62,
    size: 10,
    font,
    color: COLORS.textSoft,
  })

  page.drawRectangle({
    x: textX,
    y: yTop - 92,
    width: 96,
    height: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.surfaceAlt,
  })

  page.drawText(opts.roleLabel, {
    x: textX + 10,
    y: yTop - 85,
    size: 9,
    font: fontBold,
    color: COLORS.text,
  })

  return yTop - cardH - 18
}

function buildFieldCategoryCards(stats: Record<string, any>, hiddenStats?: string[]) {
  return [
    {
      title: PLAYER_CATEGORY_TITLES.goles,
      rows: getPlayerStatsByCategory("goles", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: PLAYER_CATEGORY_TITLES.fallos,
      rows: getPlayerStatsByCategory("fallos", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: PLAYER_CATEGORY_TITLES.faltas,
      rows: getPlayerStatsByCategory("faltas", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: PLAYER_CATEGORY_TITLES.acciones,
      rows: getPlayerStatsByCategory("acciones", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
  ].filter((card) => card.rows.length > 0)
}

function buildGoalkeeperCategoryCards(stats: Record<string, any>, hiddenStats?: string[]) {
  return [
    {
      title: GOALKEEPER_CATEGORY_TITLES.goles,
      rows: getGoalkeeperStatsByCategory("goles", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.paradas,
      rows: getGoalkeeperStatsByCategory("paradas", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.paradas_penalti,
      rows: getGoalkeeperStatsByCategory("paradas_penalti", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.otros_tiros,
      rows: getGoalkeeperStatsByCategory("otros_tiros", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: GOALKEEPER_CATEGORY_TITLES.inferioridad,
      rows: getGoalkeeperStatsByCategory("inferioridad", hiddenStats).map((def) => ({
        label: def.label,
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: "Acciones",
      rows: [
        ...getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
          label: def.label,
          value: String(stats?.[def.key] ?? 0),
        })),
        ...getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
          label: def.label,
          value: String(stats?.[def.key] ?? 0),
        })),
      ],
    },
  ].filter((card) => card.rows.length > 0)
}

function drawMatchContextRows(
  pdfDoc: PDFDocument,
  state: { page: PDFPage; y: number },
  font: PDFFont,
  fontBold: PDFFont,
  match: any
) {
  let { page, y } = state

  const matchDate = match?.match_date
    ? new Date(match.match_date).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-"

  const matchInfoRows = [
    { label: "Rival", value: String(match?.opponent ?? "-") },
    { label: "Fecha", value: matchDate },
    { label: "Marcador", value: `${match?.home_score ?? 0} - ${match?.away_score ?? 0}` },
    { label: "Jornada", value: String(match?.jornada ?? "-") },
    { label: "Temporada", value: String(match?.season ?? "-") },
    { label: "Ubicación", value: String(match?.location ?? "-") },
  ]

  const gap = 12
  const colW = (CONTENT_WIDTH - gap) / 2
  const rowH = 22

  for (let i = 0; i < matchInfoRows.length; i += 2) {
    ;({ page, y } = ensureSpace(pdfDoc, page, y, 36))
    const left = matchInfoRows[i]
    const right = matchInfoRows[i + 1]

    drawRowBox(page, font, fontBold, MARGIN_X, y, colW, rowH, left.label, left.value)
    if (right) {
      drawRowBox(page, font, fontBold, MARGIN_X + colW + gap, y, colW, rowH, right.label, right.value)
    }

    y -= 28
  }

  return { page, y }
}

function drawDetailedMatchSection(
  pdfDoc: PDFDocument,
  state: { page: PDFPage; y: number },
  font: PDFFont,
  fontBold: PDFFont,
  opts: {
    title: string
    subtitle: string
    match: any
    kind: "field" | "goalkeeper"
    stat: any
    derived: any
    hiddenStats?: string[]
  }
) {
  let { page, y } = state

  ;({ page, y } = ensureSpace(pdfDoc, page, y, 180))
  drawSectionTitle(page, fontBold, font, opts.title, y, opts.subtitle)
  y -= 26

  ;({ page, y } = drawMatchContextRows(pdfDoc, { page, y }, font, fontBold, opts.match))
  y -= 10

  if (opts.kind === "goalkeeper") {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: "Paradas", value: String(opts.derived.saves) },
      { label: "Goles recibidos", value: String(opts.derived.goalsConceded) },
      { label: "Save %", value: `${opts.derived.savePct}%` },
      { label: "Tiros recibidos", value: String(opts.derived.shotsReceived) },
    ])

    const cards = buildGoalkeeperCategoryCards(opts.stat, opts.hiddenStats)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  } else {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: "Goles", value: String(opts.derived.goals) },
      { label: "Tiros", value: String(opts.derived.shots) },
      { label: "Eficiencia", value: `${opts.derived.efficiency}%` },
      { label: "Asistencias", value: String(opts.derived.assists) },
    ])

    const cards = buildFieldCategoryCards(opts.stat, opts.hiddenStats)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  }

  return { page, y }
}

export async function buildPlayerTotalsPdf(data: any) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = createPage(pdfDoc)

  const roleLabel = data.kind === "goalkeeper" ? "Portero" : "Jugador de Campo"
  let y = await drawPlayerHeader(pdfDoc, page, font, fontBold, {
    playerName: data.player.name,
    playerNumber: data.player.number,
    roleLabel,
    photoUrl: data.player.photo_url,
    subtitle: `Temporada · ${data.matchCount} partidos`,
  })

  if (data.kind === "goalkeeper") {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: "Paradas", value: String(data.derived.saves) },
      { label: "Goles recibidos", value: String(data.derived.goalsConceded) },
      { label: "Save %", value: `${data.derived.savePct}%` },
      { label: "Tiros recibidos", value: String(data.derived.shotsReceived) },
    ])

    const cards = buildGoalkeeperCategoryCards(data.totals, data.hiddenStats)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  } else {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: "Goles", value: String(data.derived.goals) },
      { label: "Tiros", value: String(data.derived.shots) },
      { label: "Eficiencia", value: `${data.derived.efficiency}%` },
      { label: "Asistencias", value: String(data.derived.assists) },
    ])

    const cards = buildFieldCategoryCards(data.totals, data.hiddenStats)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  }

  for (let i = 0; i < (data.matchStats ?? []).length; i++) {
    const stat = data.matchStats[i]
    const match = stat?.matches
    if (!match) continue

    y -= 14

    const matchDate = match.match_date
      ? new Date(match.match_date).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "-"

    ;({ page, y } = drawDetailedMatchSection(
      pdfDoc,
      { page, y },
      font,
      fontBold,
      {
        title: `Partido ${i + 1}`,
        subtitle: `${match.opponent ?? "Rival"} · ${matchDate}`,
        match,
        kind: data.kind,
        stat,
        derived: data.kind === "goalkeeper" ? data.getGoalkeeperDerived?.(stat) ?? stat.derived ?? {} : data.getPlayerDerived?.(stat) ?? stat.derived ?? {},
        hiddenStats: data.hiddenStats,
      }
    ))
  }

  const pages = pdfDoc.getPages()
  pages.forEach((p, index) => drawFooter(p, font, index + 1, pages.length))

  return await pdfDoc.save()
}

export async function buildPlayerMatchPdf(data: any) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = createPage(pdfDoc)

  const roleLabel = data.kind === "goalkeeper" ? "Portero" : "Jugador de Campo"
  const matchDate = data.match?.match_date
    ? new Date(data.match.match_date).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-"

  let y = await drawPlayerHeader(pdfDoc, page, font, fontBold, {
    playerName: data.player.name,
    playerNumber: data.player.number,
    roleLabel,
    photoUrl: data.player.photo_url,
    subtitle: `${data.match?.opponent ?? "Rival"} · ${matchDate}`,
  })

  ;({ page, y } = drawDetailedMatchSection(
    pdfDoc,
    { page, y },
    font,
    fontBold,
    {
      title: "Partido",
      subtitle: "Detalle completo",
      match: data.match,
      kind: data.kind,
      stat: data.stat,
      derived: data.derived,
      hiddenStats: data.hiddenStats,
    }
  ))

  const pages = pdfDoc.getPages()
  pages.forEach((p, index) => drawFooter(p, font, index + 1, pages.length))

  return await pdfDoc.save()
}