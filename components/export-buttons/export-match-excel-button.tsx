"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

function getFilenameFromDisposition(disposition: string | null) {
	if (!disposition) return null;

	const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

	const asciiMatch = disposition.match(/filename="([^"]+)"/i);
	if (asciiMatch?.[1]) return asciiMatch[1];

	return null;
}

export function ExportMatchExcelButton({ matchId }: { matchId: number | string }) {
	const t = useTranslations("Export");
	const [loading, setLoading] = useState(false);

	const handleDownload = async () => {
		try {
			setLoading(true);

			const response = await fetch(`/api/matches/${matchId}/export/excel`, {
				method: "GET"
			});

			if (!response.ok) throw new Error(t("excelDownloadFailed"));

			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);

			const disposition = response.headers.get("Content-Disposition");
			const filename = getFilenameFromDisposition(disposition) || t("matchExcelFilename", { id: matchId });

			const link = document.createElement("a");
			link.href = blobUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			link.remove();

			window.URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			onClick={handleDownload}
			disabled={loading}
			className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600/30 dark:text-white dark:hover:bg-emerald-500/30"
		>
			{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
			{loading ? t("downloadingExcel") : t("exportExcel")}
			<span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">{t("excel")}</span>
		</Button>
	);
}
