import { getCurrentProfile } from "@/lib/auth"
import { getMatchReportData } from "@/lib/matches/get-match-report-data"
import { buildMatchPdf } from "@/lib/exports/build-match-pdf"

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

function buildPdfFilename(reportData: Awaited<ReturnType<typeof getMatchReportData>>) {
  const opponentRaw = reportData.match?.opponent || "Rival"
  const opponent = sanitizeFilenamePart(opponentRaw)

  const jornada =
    reportData.match?.jornada != null
      ? `J${reportData.match.jornada}`
      : "Jornada"

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const matchId = Number(id)

    if (!Number.isFinite(matchId)) {
      return new Response("Invalid match id", { status: 400 })
    }

    const profile = await getCurrentProfile()
    const reportData = await getMatchReportData(matchId, profile?.id ?? null)
    const pdfBytes = await buildMatchPdf(reportData)
    const filename = buildPdfFilename(reportData)

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
    return new Response("Failed to generate PDF", { status: 500 })
  }
}