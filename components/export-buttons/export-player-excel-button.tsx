"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

function getFilenameFromDisposition(disposition: string | null) {
	if (!disposition) return null;

	const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

	const asciiMatch = disposition.match(/filename="([^"]+)"/i);
	if (asciiMatch?.[1]) return asciiMatch[1];

	return null;
}

export function ExportPlayerExcelButton({ playerId }: { playerId: number | string }) {
	const [loading, setLoading] = useState(false);

	const handleDownload = async () => {
		try {
			setLoading(true);

			const response = await fetch(`/api/players/${playerId}/export/excel`, {
				method: "GET"
			});

			if (!response.ok) throw new Error("Failed to download Excel");

			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);

			const disposition = response.headers.get("Content-Disposition");
			const filename = getFilenameFromDisposition(disposition) || `player-${playerId}.xlsx`;

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
			<Download className="mr-2 h-4 w-4" />
			{loading ? "Descargando..." : "Exportar Excel"}
			<span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">EXCEL</span>
		</Button>
	);
}
