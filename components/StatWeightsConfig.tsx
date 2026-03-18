"use client";

import * as React from "react";
import { useStatWeights } from "@/hooks/useStatWeights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Minus, Plus, RotateCcw, Save } from "lucide-react";

import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { PLAYER_CATEGORY_TITLES, type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";

import { getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { GOALKEEPER_CATEGORY_TITLES, type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig";

interface StatDef {
	key: string;
	label: string;
}

interface StatGroup {
	title: string;
	stats: StatDef[];
}

function buildPlayerGroups(): StatGroup[] {
	const orderedCategories: PlayerStatCategory[] = ["goles", "fallos", "faltas", "acciones"];

	return orderedCategories
		.map((category) => ({
			title: PLAYER_CATEGORY_TITLES[category],
			stats: getPlayerStatsByCategory(category).map((s) => ({
				key: s.key,
				label: s.label
			}))
		}))
		.filter((group) => group.stats.length > 0);
}

function buildGoalkeeperGroups(): StatGroup[] {
	const orderedCategories: GoalkeeperStatCategory[] = ["goles", "paradas", "paradas_penalti", "otros_tiros", "inferioridad", "acciones", "ataque"];

	return orderedCategories
		.map((category) => ({
			title: GOALKEEPER_CATEGORY_TITLES[category],
			stats: getGoalkeeperStatsByCategory(category).map((s) => ({
				key: s.key,
				label: s.label
			}))
		}))
		.filter((group) => group.stats.length > 0);
}

function WeightRow({ stat, value, onChange }: { stat: StatDef; value: number; onChange: (v: number) => void }) {
	const decrement = () => onChange(value - 1);
	const increment = () => onChange(value + 1);

	const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		if (raw === "" || raw === "-") {
			onChange(0);
			return;
		}
		const parsed = parseInt(raw, 10);
		if (!isNaN(parsed)) onChange(parsed);
	};

	return (
		<div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
			<span className="text-sm text-foreground flex-1 min-w-0 truncate">{stat.label}</span>
			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={decrement}
					aria-label={`Reducir valor de ${stat.label}`}
				>
					<Minus className="h-3.5 w-3.5" />
				</Button>

				<Input
					type="number"
					value={value}
					onChange={handleInput}
					className="h-7 w-14 text-center text-sm tabular-nums px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					aria-label={`Valoracion de ${stat.label}`}
				/>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={increment}
					aria-label={`Aumentar valor de ${stat.label}`}
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}

function GroupSection({
	group,
	getWeight,
	setWeight
}: {
	group: StatGroup;
	getWeight: (k: string) => number;
	setWeight: (k: string, v: number) => void;
}) {
	return (
		<div className="space-y-2">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h4>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{group.stats.map((s) => (
					<WeightRow key={s.key} stat={s} value={getWeight(s.key)} onChange={(v) => setWeight(s.key, v)} />
				))}
			</div>
		</div>
	);
}

export function StatWeightsConfig() {
	const { loaded, dirty, saving, error, getWeight, setWeight, discard, save } = useStatWeights();

	const [tab, setTab] = React.useState<"field" | "goalkeeper">("field");

	const fieldGroups = React.useMemo(() => buildPlayerGroups(), []);
	const goalkeeperGroups = React.useMemo(() => buildGoalkeeperGroups(), []);

	if (!loaded) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				</CardContent>
			</Card>
		);
	}

	const groups = tab === "field" ? fieldGroups : goalkeeperGroups;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Valoraciones de Estadisticas</CardTitle>
				<CardDescription>
					Asigna un peso (positivo o negativo) a cada campo de estadistica. Cada usuario tiene sus propias valoraciones independientes.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="flex gap-2">
					<Button variant={tab === "field" ? "default" : "outline"} size="sm" onClick={() => setTab("field")}>
						Jugador de campo
					</Button>

					<Button variant={tab === "goalkeeper" ? "default" : "outline"} size="sm" onClick={() => setTab("goalkeeper")}>
						Portero
					</Button>
				</div>

				<div className="space-y-4">
					{groups.map((g) => (
						<GroupSection key={g.title} group={g} getWeight={getWeight} setWeight={setWeight} />
					))}
				</div>

				{dirty && (
					<div className="sticky bottom-4 z-20">
						<div className="rounded-xl border bg-background/80 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
							<div className="text-sm text-muted-foreground">
								Cambios sin guardar
								{error && <span className="text-destructive ml-2">· {error}</span>}
							</div>

							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={discard} disabled={saving}>
									<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
									Descartar
								</Button>

								<Button size="sm" onClick={save} disabled={saving}>
									{saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
									{saving ? "Guardando..." : "Guardar"}
								</Button>
							</div>
						</div>
					</div>
				)}

				{error && !dirty && <p className="text-sm text-destructive">{error}</p>}
			</CardContent>
		</Card>
	);
}
