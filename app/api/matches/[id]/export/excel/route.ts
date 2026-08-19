import { getCurrentProfile } from "@/lib/auth";
import { getMatchReportData } from "@/lib/matches/get-match-report-data";
import { buildMatchExcel } from "@/lib/exports/build-match-excel";
import { getTranslations } from "next-intl/server";

function sanitizeFilenamePart(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
		.replace(/\./g, "")
		.replace(/\s+/g, "_")
		.replace(/_+/g, "_")
		.trim();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const t = await getTranslations("Api");
	const tExport = await getTranslations("Export");
	try {
		const { id } = await params;
		const matchId = Number(id);

		if (!Number.isFinite(matchId)) {
			return new Response(t("invalidMatchId"), { status: 400 });
		}

		const profile = await getCurrentProfile();
		if (!profile) return new Response(t("unauthenticated"), { status: 401 });
		const reportData = await getMatchReportData(matchId, profile);
		const excelBytes = await buildMatchExcel(reportData);

		const filename = `${sanitizeFilenamePart(reportData.clubName || tExport("matchFallback"))}_vs_${sanitizeFilenamePart(reportData.match.opponent || tExport("opponentFallback"))}.xlsx`;

		return new Response(new Uint8Array(excelBytes), {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
			}
		});
	} catch (error) {
		console.error(error);
		return new Response(t("excelGenerationFailed"), { status: 500 });
	}
}
