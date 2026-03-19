"use client";

import * as React from "react";
import { useStatWeights } from "@/hooks/useStatWeights";
import { useHiddenStats } from "@/hooks/useHiddenStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

function WeightRow({
	stat,
	value,
	hidden,
	onChange,
	onToggleHidden
}: {
	stat: StatDef;
	value: number;
	hidden: boolean;
	onChange: (v: number) => void;
	onToggleHidden: (hidden: boolean) => void;
}) {
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
		<div className={`rounded-lg border px-3 py-2 ${hidden ? "bg-muted/20 opacity-60" : "bg-muted/30"}`}>
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0 flex-1">
					<span className="text-sm text-foreground block truncate">{stat.label}</span>
					<p className="text-xs text-muted-foreground">{hidden ? "Campo oculto para este usuario" : "Campo activo"}</p>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<span className="text-xs text-muted-foreground">Ocultar</span>
					<Switch checked={hidden} onCheckedChange={onToggleHidden} aria-label={`Ocultar ${stat.label}`} />
				</div>
			</div>

			<div className="mt-2 flex items-center justify-end gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={decrement}
					disabled={hidden}
					aria-label={`Reducir valor de ${stat.label}`}
				>
					<Minus className="h-3.5 w-3.5" />
				</Button>

				<Input
					type="number"
					value={value}
					onChange={handleInput}
					disabled={hidden}
					className="h-7 w-14 text-center text-sm tabular-nums px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					aria-label={`Valoracion de ${stat.label}`}
				/>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={increment}
					disabled={hidden}
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
	setWeight,
	isHidden,
	setHidden
}: {
	group: StatGroup;
	getWeight: (k: string) => number;
	setWeight: (k: string, v: number) => void;
	isHidden: (k: string) => boolean;
	setHidden: (k: string, v: boolean) => void;
}) {
	return (
		<div className="space-y-2">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h4>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{group.stats.map((s) => (
					<WeightRow
						key={s.key}
						stat={s}
						value={getWeight(s.key)}
						hidden={isHidden(s.key)}
						onChange={(v) => setWeight(s.key, v)}
						onToggleHidden={(v) => setHidden(s.key, v)}
					/>
				))}
			</div>
		</div>
	);
}

export function StatWeightsConfig() {
	const weightsState = useStatWeights();
	const hiddenState = useHiddenStats();

	const [tab, setTab] = React.useState<"field" | "goalkeeper">("field");

	const fieldGroups = React.useMemo(() => buildPlayerGroups(), []);
	const goalkeeperGroups = React.useMemo(() => buildGoalkeeperGroups(), []);

	const loaded = weightsState.loaded && hiddenState.loaded;
	const dirty = weightsState.dirty || hiddenState.dirty;
	const saving = weightsState.saving || hiddenState.saving;
	const error = weightsState.error || hiddenState.error;

	const handleDiscard = () => {
		weightsState.discard();
		hiddenState.discard();
	};

	const handleSave = async () => {
		await weightsState.save();
		await hiddenState.save();
	};

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
				<CardTitle>Valoraciones de Estadísticas</CardTitle>
				<CardDescription>
					Asigna un peso a cada campo y oculta los que no quieras utilizar. Los campos ocultos no deberían mostrarse en formularios,
					resúmenes ni gráficas de este usuario.
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
						<GroupSection
							key={g.title}
							group={g}
							getWeight={weightsState.getWeight}
							setWeight={weightsState.setWeight}
							isHidden={hiddenState.isHidden}
							setHidden={hiddenState.setHidden}
						/>
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
								<Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
									<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
									Descartar
								</Button>

								<Button size="sm" onClick={handleSave} disabled={saving}>
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
