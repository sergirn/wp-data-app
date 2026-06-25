"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface ToggleMatchStatsButtonProps {
	matchId: number;
	initialValue: boolean;
	onUpdated?: (newValue: boolean) => void;
}

export function ToggleMatchStatsButton({
	matchId,
	initialValue,
	onUpdated
}: ToggleMatchStatsButtonProps) {
	const [enabled, setEnabled] = useState(initialValue);
	const [loading, setLoading] = useState(false);

	const handleToggle = async (e: React.MouseEvent) => {
		e.stopPropagation();

		const nextValue = !enabled;
		setLoading(true);

		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("matches")
				.update({ stats_enabled: nextValue })
				.eq("id", matchId);

			if (error) throw error;

			setEnabled(nextValue);
			onUpdated?.(nextValue);
		} catch (error) {
			console.error("Error actualizando stats_enabled:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={handleToggle}
			disabled={loading}
			className={
				enabled
					? "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
					: "border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
			}
		>
			{enabled ? "Cuenta en estadísticas" : "No cuenta en estadísticas"}
		</Button>
	);
}