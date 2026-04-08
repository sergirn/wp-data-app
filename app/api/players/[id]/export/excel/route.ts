import { getCurrentProfile } from "@/lib/auth";
import { getPlayerTotalsReportData } from "@/lib/players/get-player-report-data";
import { buildPlayerTotalsExcel } from "@/lib/exports/build-player-excel";

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
	try {
		const { id } = await params;
		const playerId = Number(id);

		if (!Number.isFinite(playerId)) {
			return new Response("Invalid player id", { status: 400 });
		}

		const profile = await getCurrentProfile();
		const reportData = await getPlayerTotalsReportData(playerId, profile?.id ?? null);
		const excelBytes = await buildPlayerTotalsExcel(reportData);

		const filename = `${sanitizeFilenamePart(reportData.player.name || "Jugador")}_totales.xlsx`;

		return new Response(excelBytes, {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
			}
		});
	} catch (error) {
		console.error(error);
		return new Response("Failed to generate Excel", { status: 500 });
	}
}
