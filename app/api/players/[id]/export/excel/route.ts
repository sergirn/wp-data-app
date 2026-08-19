import { getCurrentProfile } from "@/lib/auth";
import { getPlayerTotalsReportData } from "@/lib/players/get-player-report-data";
import { buildPlayerTotalsExcel } from "@/lib/exports/build-player-excel";
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
		const playerId = Number(id);

		if (!Number.isFinite(playerId)) {
			return new Response(t("invalidPlayerId"), { status: 400 });
		}

		const profile = await getCurrentProfile();
		if (!profile) return new Response(t("unauthenticated"), { status: 401 });
		const reportData = await getPlayerTotalsReportData(playerId, profile);
		const excelBytes = await buildPlayerTotalsExcel(reportData);

		const filename = `${sanitizeFilenamePart(reportData.player.name || tExport("playerFallback"))}_${tExport("totalsSuffix")}.xlsx`;

		return new Response(excelBytes, {
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
