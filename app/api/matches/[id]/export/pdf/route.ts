import { getCurrentProfile } from "@/lib/auth"
import { getMatchReportData } from "@/lib/matches/get-match-report-data"
import { buildMatchPdf } from "@/lib/exports/build-match-pdf"
import { getTranslations } from "next-intl/server"

function sanitizeFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim()
}

function buildPdfFilename(reportData: Awaited<ReturnType<typeof getMatchReportData>>, opponentFallback: string, roundFallback: string) {
  const opponentRaw = reportData.match?.opponent || opponentFallback
  const opponent = sanitizeFilenamePart(opponentRaw)

  const jornada =
    reportData.match?.jornada != null
      ? `J${reportData.match.jornada}`
      : roundFallback

  const dateObj =
    reportData.matchDate instanceof Date
      ? reportData.matchDate
      : new Date(reportData.match?.match_date)

  const yyyy = dateObj.getFullYear()
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0")
  const dd = String(dateObj.getDate()).padStart(2, "0")

  return `${opponent}_${jornada}_${yyyy}-${mm}-${dd}.pdf`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await getTranslations("Api")
  const tExport = await getTranslations("Export")
  try {
    const { id } = await params
    const matchId = Number(id)

    if (!Number.isFinite(matchId)) {
      return new Response(t("invalidMatchId"), { status: 400 })
    }

    const profile = await getCurrentProfile()
    if (!profile) return new Response(t("unauthenticated"), { status: 401 })
    const reportData = await getMatchReportData(matchId, profile)
    const detail = new URL(request.url).searchParams.get("detail") === "summary" ? "summary" : "full"
    const pdfBytes = await buildMatchPdf(reportData, { detail })
    const filename = buildPdfFilename(reportData, tExport("opponentFallback"), tExport("roundFallback"))

    console.log("PDF filename:", filename)

    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error(error)
    return new Response(t("pdfGenerationFailed"), { status: 500 })
  }
}
