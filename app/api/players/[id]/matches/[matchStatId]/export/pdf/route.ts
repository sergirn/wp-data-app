import { getCurrentProfile } from "@/lib/auth"
import { getPlayerMatchReportData } from "@/lib/players/get-player-report-data"
import { buildPlayerMatchPdf } from "@/lib/exports/build-player-pdf"
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; matchStatId: string }> }
) {
  const t = await getTranslations("Api")
  const tExport = await getTranslations("Export")
  try {
    const { id, matchStatId } = await params
    const playerId = Number(id)
    const statId = Number(matchStatId)

    if (!Number.isFinite(playerId) || !Number.isFinite(statId)) {
      return new Response(t("invalidIds"), { status: 400 })
    }

    const profile = await getCurrentProfile()
    if (!profile) return new Response(t("unauthenticated"), { status: 401 })
    const reportData = await getPlayerMatchReportData(playerId, statId, profile)
    const pdfBytes = await buildPlayerMatchPdf(reportData)

    const opponent = sanitizeFilenamePart(reportData.match?.opponent || tExport("opponentFallback"))
    const jornada = reportData.match?.jornada != null ? `J${reportData.match.jornada}` : tExport("roundFallback")

    const dateObj = new Date(reportData.match?.match_date)
    const yyyy = dateObj.getFullYear()
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0")
    const dd = String(dateObj.getDate()).padStart(2, "0")

    const playerName = sanitizeFilenamePart(reportData.player.name || tExport("playerFallback"))
    const filename = `${playerName}_${opponent}_${jornada}_${yyyy}-${mm}-${dd}.pdf`

    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error(error)
    return new Response(t("pdfGenerationFailed"), { status: 500 })
  }
}
