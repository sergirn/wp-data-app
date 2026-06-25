import { getCurrentProfile } from "@/lib/auth";
import { getMatchReportData } from "@/lib/matches/get-match-report-data";
import { buildMatchExcel } from "@/lib/exports/build-match-excel";

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
		const matchId = Number(id);

		if (!Number.isFinite(matchId)) {
			return new Response("Invalid match id", { status: 400 });
		}

		const profile = await getCurrentProfile();
		const reportData = await getMatchReportData(matchId, profile?.id ?? null);
		const excelBytes = await buildMatchExcel(reportData);

		const filename = `${sanitizeFilenamePart(reportData.clubName || "Partido")}_vs_${sanitizeFilenamePart(reportData.match.opponent || "Rival")}.xlsx`;

		return new Response(new Uint8Array(excelBytes), {
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
