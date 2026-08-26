"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText, Files, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function getFilenameFromDisposition(disposition: string | null) {
	if (!disposition) return null;

	const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match?.[1]) {
		return decodeURIComponent(utf8Match[1]);
	}

	const asciiMatch = disposition.match(/filename="([^"]+)"/i);
	if (asciiMatch?.[1]) {
		return asciiMatch[1];
	}

	return null;
}

export function ExportMatchPdfButton({ matchId }: { matchId: number | string }) {
	const t = useTranslations("Export");
	const [loading, setLoading] = useState(false);

	const handleDownload = async (detail: "summary" | "full") => {
		try {
			setLoading(true);

			const response = await fetch(`/api/matches/${matchId}/export/pdf?detail=${detail}`, {
				method: "GET"
			});

			if (!response.ok) {
				throw new Error(t("pdfDownloadFailed"));
			}

			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);

			const disposition = response.headers.get("Content-Disposition");
			const filename = getFilenameFromDisposition(disposition) || t("matchPdfFilename", { id: matchId });

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

	return <DropdownMenu>
		<DropdownMenuTrigger asChild><Button disabled={loading} className="cursor-pointer bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-600/30 dark:text-white dark:hover:bg-red-500/30">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}<span>{loading ? t("downloading") : t("exportPdf")}</span><ChevronDown className="ml-2 size-3.5" /></Button></DropdownMenuTrigger>
		<DropdownMenuContent align="end" className="w-64">
			<DropdownMenuItem onSelect={() => void handleDownload("summary")} className="items-start gap-3 py-3"><FileText className="mt-0.5 size-4 text-primary" /><div><p className="font-medium">{t("matchPdfSummary")}</p><p className="text-xs text-muted-foreground">{t("matchPdfSummaryDescription")}</p></div></DropdownMenuItem>
			<DropdownMenuItem onSelect={() => void handleDownload("full")} className="items-start gap-3 py-3"><Files className="mt-0.5 size-4 text-primary" /><div><p className="font-medium">{t("matchPdfFull")}</p><p className="text-xs text-muted-foreground">{t("matchPdfFullDescription")}</p></div></DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>;
}
