"use client";

import { useMemo } from "react";
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
					toNum(p.faltas_exp_simple)
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
				<CardTitle>Más expulsado</CardTitle>
				<CardDescription>Ranking por expulsiones totales</CardDescription>
			</div>

			<div className="mt-4">
				{top && (
					<div className="space-y-2">
						<TopPlayerCard
							player={{ id: top.id, name: top.name, number: top.number, photo_url: top.photo_url }}
							statLabel="Expulsiones"
							statValue={`${toNum(top._exp)}`}
							gradientColors="from-rose-500 to-red-500"
							details={[
								// 👇 aquí se ve el total en vez de "bruta"
								{ label: "Total expulsiones", value: toNum(top._exp) },
								{ label: "Exp 3 int", value: toNum(top.faltas_exp_3_int) },
								{ label: 'Exp 20" 1c1', value: toNum(top.faltas_exp_20_1c1) },
								{ label: 'Exp 20" boya', value: toNum(top.faltas_exp_20_boya) }
							]}
						/>

						<Dialog>
							<DialogTrigger asChild>
								<Button variant="secondary" className="w-full" disabled={rest.length === 0}>
									Ver más
								</Button>
							</DialogTrigger>

							<DialogContent className="sm:max-w-2xl">
								<DialogHeader>
									<DialogTitle>Ranking · Expulsiones</DialogTitle>
								</DialogHeader>

								<div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
									{rest.map((p, idx) => (
										<TopPlayerCard
											key={p.id ?? `${p.name}-${idx}`}
											player={{ id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }}
											statLabel={`#${idx + 2} · Expulsiones`}
											statValue={`${toNum(p._exp)}`}
											gradientColors="from-rose-500 to-red-500"
											details={[
												// 👇 igual aquí
												{ label: "Total expulsiones", value: toNum(p._exp) },
												{ label: "Exp 3 int", value: toNum(p.faltas_exp_3_int) },
												{ label: 'Exp 20" 1c1', value: toNum(p.faltas_exp_20_1c1) },
												{ label: 'Exp 20" boya', value: toNum(p.faltas_exp_20_boya) }
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
