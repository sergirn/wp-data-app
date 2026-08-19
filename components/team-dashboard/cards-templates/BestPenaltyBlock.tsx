"use client";

import { useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { TopPlayerCard } from "../TopPlayerCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface BestPenaltyFeaturedCardProps {
	playerStats: any[];
}

const toNum = (v: any) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

/**
 * ✅ SOLO campos de BBDD con registros:
 * - tiros_penalti_fallado
 * - goles_penalti_anotado
 *
 * Soporta:
 *  1) p.stats como array de MatchStats[] -> suma
 *  2) p.stats como objeto agregado -> lee directo
 *  3) p plano -> lee directo
 */
const getMatchStatTotal = (p: any, key: "tiros_penalti_fallado" | "goles_penalti_anotado") => {
	if (!p) return 0;

	// 1) Si stats es array: SUMA (lo más típico si estás trayendo MatchStats por partido)
	if (Array.isArray(p.stats)) {
		return p.stats.reduce((acc: number, stat: any) => acc + toNum(stat?.[key]), 0);
	}

	// 2) Si stats es objeto agregado
	if (p?.stats && typeof p.stats === "object") {
		const v = p.stats?.[key];
		if (v !== null && v !== undefined) return toNum(v);
	}

	// 3) Plano
	const flat = p?.[key];
	if (flat !== null && flat !== undefined) return toNum(flat);

	return 0;
};

export function BestPenaltyFeaturedCard({ playerStats }: BestPenaltyFeaturedCardProps) {
	const t = useTranslations("TeamDashboardCards");
	// ✅ Logs para confirmar de dónde lo está sacando
	useEffect(() => {
		if (process.env.NODE_ENV === "production") return;

		const sample = (playerStats ?? []).slice(0, 8);
		console.groupCollapsed("[BestPenaltyFeaturedCard] penalties debug (first 8)");
		sample.forEach((p: any) => {
			const src = Array.isArray(p?.stats) ? "stats[]" : p?.stats && typeof p.stats === "object" ? "stats{}" : "flat";

			console.log({
				id: p?.id,
				name: p?.name,
				source: src,
				goles_penalti_anotado: getMatchStatTotal(p, "goles_penalti_anotado"),
				tiros_penalti_fallado: getMatchStatTotal(p, "tiros_penalti_fallado"),
				raw_flat_missed: p?.tiros_penalti_fallado,
				raw_stats_missed: p?.stats?.tiros_penalti_fallado,
				raw_stats0_missed: Array.isArray(p?.stats) ? p.stats?.[0]?.tiros_penalti_fallado : undefined
			});
		});
		console.groupEnd();
	}, [playerStats]);

	const ranking = useMemo(() => {
		return [...(playerStats ?? [])]
			.map((p) => {
				const scored = getMatchStatTotal(p, "goles_penalti_anotado");
				const missed = getMatchStatTotal(p, "tiros_penalti_fallado");

				const total = scored + missed;
				const eff = total > 0 ? (scored / total) * 100 : 0;

				return { ...p, _penEff: eff, _scored: scored, _missed: missed, _total: total };
			})
			.filter((p) => toNum(p._total) > 0)
			.sort((a, b) => toNum(b._penEff) - toNum(a._penEff) || toNum(b._total) - toNum(a._total))
			.slice(0, 10);
	}, [playerStats]);

	const top = ranking[0] ?? null;
	const rest = ranking.slice(1);

	return (
		<div>
			<div>
				<CardTitle>{t("penalties.title")}</CardTitle>
				<CardDescription>{t("penalties.description")}</CardDescription>
			</div>

			<div className="mt-4">
				{!top ? (
					<div className="rounded-lg border p-3 text-sm text-muted-foreground">{t("penalties.noData")}</div>
				) : (
					<div className="space-y-2">
						<TopPlayerCard
							player={{ id: top.id, name: top.name, number: top.number, photo_url: top.photo_url }}
							statLabel={t("efficiency")}
							statValue={`${toNum(top._penEff).toFixed(0)}%`}
							gradientColors="from-amber-500 to-orange-500"
							details={[
								{ label: t("scored"), value: toNum(top._scored) },
								{ label: t("missed"), value: toNum(top._missed) },
								{ label: t("total"), value: toNum(top._total) }
							]}
						/>

						<Dialog>
							<DialogTrigger asChild>
								<Button variant="secondary" className="w-full" disabled={rest.length === 0}>
									{t("viewMore")}
								</Button>
							</DialogTrigger>

							<DialogContent className="sm:max-w-2xl">
								<DialogHeader>
									<DialogTitle>{t("penalties.ranking")}</DialogTitle>
								</DialogHeader>

								<div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
									{rest.map((p, idx) => (
										<TopPlayerCard
											key={p.id ?? `${p.name}-${idx}`}
											player={{ id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }}
											statLabel={t("rankedMetric", { rank: idx + 2, metric: t("efficiency") })}
											statValue={`${toNum(p._penEff).toFixed(0)}%`}
											gradientColors="from-amber-500 to-orange-500"
											details={[
												{ label: t("scored"), value: toNum(p._scored) },
												{ label: t("missed"), value: toNum(p._missed) },
												{ label: t("total"), value: toNum(p._total) }
											]}
										/>
									))}
								</div>
							</DialogContent>
						</Dialog>
					</div>
				)}
			</div>
		</div>
	);
}
