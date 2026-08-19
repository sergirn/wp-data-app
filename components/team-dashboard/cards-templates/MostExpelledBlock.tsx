"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { TopPlayerCard } from "../TopPlayerCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MostExpelledFeaturedCardProps {
	playerStats: any[];
}

const toNum = (v: any) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function MostExpelledFeaturedCard({ playerStats }: MostExpelledFeaturedCardProps) {
	const t = useTranslations("TeamDashboardCards");
	const ranking = useMemo(() => {
		return [...(playerStats ?? [])]
			.map((p) => ({
				...p,
				_exp:
					toNum(p.faltas_exp_3_bruta) +
					toNum(p.faltas_exp_3_int) +
					toNum(p.faltas_exp_20_1c1) +
					toNum(p.faltas_exp_20_boya) +
					toNum(p.exp_trans_def) +
					toNum(p.faltas_exp_simple) +
					toNum(p.faltas_penalti)
			}))
			.filter((p) => toNum(p._exp) > 0)
			.sort((a, b) => toNum(b._exp) - toNum(a._exp))
			.slice(0, 10);
	}, [playerStats]);

	const top = ranking[0] ?? null;
	const rest = ranking.slice(1);

	return (
		<div>
			<div>
				<CardTitle>{t("expulsions.title")}</CardTitle>
				<CardDescription>{t("expulsions.description")}</CardDescription>
			</div>

			<div className="mt-4">
				{top && (
					<div className="space-y-2">
						<TopPlayerCard
							player={{ id: top.id, name: top.name, number: top.number, photo_url: top.photo_url }}
							statLabel={t("expulsions.metric")}
							statValue={`${toNum(top._exp)}`}
							gradientColors="from-rose-500 to-red-500"
							details={[
								// 👇 aquí se ve el total en vez de "bruta"
								// { label: "Total expulsiones", value: toNum(top._exp) },
								{ label: t("intentionalExclusionShort"), value: toNum(top.faltas_exp_3_int) },
								{ label: t("exclusionOneOnOneShort"), value: toNum(top.faltas_exp_20_1c1) },
								{ label: t("exclusionBuoyShort"), value: toNum(top.faltas_exp_20_boya) },
								{ label: t("penaltiesDrawn"), value: toNum(top.faltas_penalti) }
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
									<DialogTitle>{t("expulsions.ranking")}</DialogTitle>
								</DialogHeader>

								<div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
									{rest.map((p, idx) => (
										<TopPlayerCard
											key={p.id ?? `${p.name}-${idx}`}
											player={{ id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }}
											statLabel={t("rankedMetric", { rank: idx + 2, metric: t("expulsions.metric") })}
											statValue={`${toNum(p._exp)}`}
											gradientColors="from-rose-500 to-red-500"
											details={[
												// 👇 igual aquí
												{ label: t("totalExpulsions"), value: toNum(p._exp) },
												{ label: t("intentionalExclusionShort"), value: toNum(p.faltas_exp_3_int) },
												{ label: t("exclusionOneOnOneShort"), value: toNum(p.faltas_exp_20_1c1) },
												{ label: t("exclusionBuoyShort"), value: toNum(p.faltas_exp_20_boya) }
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
