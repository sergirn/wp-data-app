import {
  PDFDocument,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib"
import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers"
import { getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers"
import { fetchRemoteImage } from "@/lib/safe-image-fetch"
import { getLocale, getTranslations } from "next-intl/server"
import { PDF_COLORS as COLORS, createThemedPage, drawAccentLabel, embedReportFonts } from "@/lib/exports/pdf-theme"

type ReportTranslator = (key: string, values?: Record<string, string | number>) => string

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

function drawFooter(page: PDFPage, font: PDFFont, pageNumber: number, pageCount: number, t: ReportTranslator) {
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

    page.drawRectangle({
      x,
      y: yTop - 3,
      width: w,
      height: 3,
      borderWidth: 0,
      color: COLORS.primary,
    })

    page.drawText(item.value, {
      x: x + 10,
      y: yTop - 18,
      size: 13,
      font: fontBold,
      color: COLORS.primary,
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
    color: COLORS.primarySoft,
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
    color: COLORS.primary,
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
    y: yTop - totalH,
    width: 5,
    height: totalH,
    borderWidth: 0,
    color: COLORS.primary,
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
  },
  t: ReportTranslator
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
    width: 5,
    height: cardH,
    borderWidth: 0,
    color: COLORS.primary,
  })

  page.drawRectangle({
    x,
    y: yTop - cardH,
    width: CONTENT_WIDTH,
    height: 26,
    borderWidth: 0,
    color: COLORS.surfaceAlt,
  })

  page.drawText(t("playerReportTitle"), {
    x: x + photoW + 28,
    y: yTop - 17,
    size: 9,
    font: fontBold,
    color: COLORS.primary,
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
    color: COLORS.primarySoft,
  })

  page.drawText(opts.roleLabel, {
    x: textX + 10,
    y: yTop - 85,
    size: 9,
    font: fontBold,
    color: COLORS.primary,
  })

  return yTop - cardH - 18
}

function buildFieldCategoryCards(stats: Record<string, any>, hiddenStats: string[] | undefined, t: ReportTranslator, tStat: ReportTranslator) {
  return [
    {
      title: t("categories.playerGoals"),
      rows: getPlayerStatsByCategory("goles", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.playerMisses"),
      rows: getPlayerStatsByCategory("fallos", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.fouls"),
      rows: getPlayerStatsByCategory("faltas", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.actions"),
      rows: getPlayerStatsByCategory("acciones", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
  ].filter((card) => card.rows.length > 0)
}

function buildGoalkeeperCategoryCards(stats: Record<string, any>, hiddenStats: string[] | undefined, t: ReportTranslator, tStat: ReportTranslator) {
  return [
    {
      title: t("categories.goalkeeperGoals"),
      rows: getGoalkeeperStatsByCategory("goles", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.saves"),
      rows: getGoalkeeperStatsByCategory("paradas", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.penalties"),
      rows: getGoalkeeperStatsByCategory("paradas_penalti", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.otherShots"),
      rows: getGoalkeeperStatsByCategory("otros_tiros", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.inferiority"),
      rows: getGoalkeeperStatsByCategory("inferioridad", hiddenStats).map((def) => ({
        label: tStat(def.key),
        value: String(stats?.[def.key] ?? 0),
      })),
    },
    {
      title: t("categories.actions"),
      rows: [
        ...getGoalkeeperStatsByCategory("acciones", hiddenStats).map((def) => ({
          label: tStat(def.key),
          value: String(stats?.[def.key] ?? 0),
        })),
        ...getGoalkeeperStatsByCategory("ataque", hiddenStats).map((def) => ({
          label: tStat(def.key),
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
  match: any,
  t: ReportTranslator,
  locale: string
) {
  let { page, y } = state

  const matchDate = match?.match_date
    ? new Date(match.match_date).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-"

  const matchInfoRows = [
    { label: t("opponent"), value: String(match?.opponent ?? "-") },
    { label: t("date"), value: matchDate },
    { label: t("score"), value: `${match?.home_score ?? 0} - ${match?.away_score ?? 0}` },
    { label: t("round"), value: String(match?.jornada ?? "-") },
    { label: t("season"), value: String(match?.season ?? "-") },
    { label: t("location"), value: String(match?.location ?? "-") },
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
    t: ReportTranslator
    tStat: ReportTranslator
    locale: string
  }
) {
  let { page, y } = state
  const t = opts.t
  const tStat = opts.tStat

  ;({ page, y } = ensureSpace(pdfDoc, page, y, 180))
  drawSectionTitle(page, fontBold, font, opts.title, y, opts.subtitle)
  y -= 26

  ;({ page, y } = drawMatchContextRows(pdfDoc, { page, y }, font, fontBold, opts.match, opts.t, opts.locale))
  y -= 10

  if (opts.kind === "goalkeeper") {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: t("saves"), value: String(opts.derived.saves) },
      { label: t("goalsConceded"), value: String(opts.derived.goalsConceded) },
      { label: t("savePercentage"), value: `${opts.derived.savePct}%` },
      { label: t("shotsReceived"), value: String(opts.derived.shotsReceived) },
    ])

    const cards = buildGoalkeeperCategoryCards(opts.stat, opts.hiddenStats, t, tStat)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  } else {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: t("goals"), value: String(opts.derived.goals) },
      { label: t("shots"), value: String(opts.derived.shots) },
      { label: t("efficiency"), value: `${opts.derived.efficiency}%` },
      { label: t("assists"), value: String(opts.derived.assists) },
    ])

    const cards = buildFieldCategoryCards(opts.stat, opts.hiddenStats, t, tStat)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  }

  return { page, y }
}

export async function buildPlayerTotalsPdf(data: any) {
  const reportTranslations = await getTranslations("Reports")
  const statTranslations = await getTranslations("StatLabels")
  const locale = await getLocale()
  const t: ReportTranslator = (key, values) => reportTranslations(key as never, values as never)
  const tStat: ReportTranslator = (key) => statTranslations(key as never)
  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedReportFonts(pdfDoc)

  let page = createPage(pdfDoc)

  const roleLabel = data.kind === "goalkeeper" ? t("goalkeeper") : t("fieldPlayer")
  let y = await drawPlayerHeader(pdfDoc, page, font, fontBold, {
    playerName: data.player.name,
    playerNumber: data.player.number,
    roleLabel,
    photoUrl: data.player.photo_url,
    subtitle: t("seasonMatches", { count: data.matchCount }),
  }, t)

  if (data.kind === "goalkeeper") {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: t("saves"), value: String(data.derived.saves) },
      { label: t("goalsConceded"), value: String(data.derived.goalsConceded) },
      { label: t("savePercentage"), value: `${data.derived.savePct}%` },
      { label: t("shotsReceived"), value: String(data.derived.shotsReceived) },
    ])

    const cards = buildGoalkeeperCategoryCards(data.totals, data.hiddenStats, t, tStat)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  } else {
    y = drawCompactKpiRow(page, font, fontBold, y, [
      { label: t("goals"), value: String(data.derived.goals) },
      { label: t("shots"), value: String(data.derived.shots) },
      { label: t("efficiency"), value: `${data.derived.efficiency}%` },
      { label: t("assists"), value: String(data.derived.assists) },
    ])

    const cards = buildFieldCategoryCards(data.totals, data.hiddenStats, t, tStat)
    ;({ page, y } = drawTwoColumnGrid(pdfDoc, { page, y }, font, fontBold, cards))
  }

  for (let i = 0; i < (data.matchStats ?? []).length; i++) {
    const stat = data.matchStats[i]
    const match = stat?.matches
    if (!match) continue

    y -= 14

    const matchDate = match.match_date
      ? new Date(match.match_date).toLocaleDateString(locale, {
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
        title: t("matchNumber", { number: i + 1 }),
        subtitle: t("opponentDate", { opponent: match.opponent ?? t("opponent"), date: matchDate }),
        match,
        kind: data.kind,
        stat,
        derived: data.kind === "goalkeeper" ? data.getGoalkeeperDerived?.(stat) ?? stat.derived ?? {} : data.getPlayerDerived?.(stat) ?? stat.derived ?? {},
        hiddenStats: data.hiddenStats,
        t,
        tStat,
        locale,
      }
    ))
  }

  const pages = pdfDoc.getPages()
  pages.forEach((p, index) => drawFooter(p, font, index + 1, pages.length, t))

  return await pdfDoc.save()
}

export async function buildPlayerMatchPdf(data: any) {
  const reportTranslations = await getTranslations("Reports")
  const statTranslations = await getTranslations("StatLabels")
  const locale = await getLocale()
  const t: ReportTranslator = (key, values) => reportTranslations(key as never, values as never)
  const tStat: ReportTranslator = (key) => statTranslations(key as never)
  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedReportFonts(pdfDoc)

  let page = createPage(pdfDoc)

  const roleLabel = data.kind === "goalkeeper" ? t("goalkeeper") : t("fieldPlayer")
  const matchDate = data.match?.match_date
    ? new Date(data.match.match_date).toLocaleDateString(locale, {
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
    subtitle: t("opponentDate", { opponent: data.match?.opponent ?? t("opponent"), date: matchDate }),
  }, t)

  ;({ page, y } = drawDetailedMatchSection(
    pdfDoc,
    { page, y },
    font,
    fontBold,
    {
      title: t("match"),
      subtitle: t("fullDetails"),
      match: data.match,
      kind: data.kind,
      stat: data.stat,
      derived: data.derived,
      hiddenStats: data.hiddenStats,
      t,
      tStat,
      locale,
    }
  ))

  const pages = pdfDoc.getPages()
  pages.forEach((p, index) => drawFooter(p, font, index + 1, pages.length, t))

  return await pdfDoc.save()
}
