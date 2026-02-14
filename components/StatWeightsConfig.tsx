"use client";

import * as React from "react";
import { useStatWeights } from "@/hooks/useStatWeights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Minus, Plus, RotateCcw, Save } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Stat definitions – grouped exactly like FieldPlayer & GK clients  */
/* ------------------------------------------------------------------ */

interface StatDef {
	key: string;
	label: string;
}

interface StatGroup {
	title: string;
	stats: StatDef[];
}

/* --- Jugador de campo: mismos grupos y campos que nuevo-partido UI --- */
const FIELD_PLAYER_GROUPS: StatGroup[] = [
	{
		title: "Goles",
		stats: [
			{ key: "goles_boya_jugada", label: "Boya / Jugada" },
			{ key: "goles_lanzamiento", label: "Lanzamiento" },
			{ key: "goles_dir_mas_5m", label: "Dir +6m" },
			{ key: "goles_contraataque", label: "Contraataque" },
			{ key: "goles_penalti_anotado", label: "Penalti Anotado" }
		]
	},
	{
		title: "Tiros",
		stats: [
			{ key: "tiros_penalti_fallado", label: "Penalti Fallado" },
			{ key: "tiros_corner", label: "Corner" },
			{ key: "tiros_fuera", label: "Fuera" },
			{ key: "tiros_parados", label: "Parados" },
			{ key: "tiros_bloqueado", label: "Bloqueado" },
			{ key: "tiro_palo", label: "Palo" }
		]
	},
	{
		title: "Superioridad",
		stats: [
			{ key: "goles_hombre_mas", label: "Goles H+" },
			{ key: "gol_del_palo_sup", label: "Gol del palo H+" },
			{ key: "tiros_hombre_mas", label: "Fallos H+" },
			{ key: "rebote_recup_hombre_mas", label: "Rebote Recup." },
			{ key: "rebote_perd_hombre_mas", label: "Rebote Perd." }
		]
	},
	{
		title: "Faltas",
		stats: [
			{ key: "faltas_exp_20_1c1", label: "Exp 18'' 1c1" },
			{ key: "faltas_exp_20_boya", label: "Exp 18'' Boya" },
			{ key: "faltas_penalti", label: "Penalti" },
			{ key: "faltas_exp_simple", label: "Exp (Simple)" },
			{ key: "exp_trans_def", label: "Exp trans. def." }
		]
	},
	{
		title: "Acciones",
		stats: [
			{ key: "acciones_bloqueo", label: "Bloqueo" },
			{ key: "acciones_asistencias", label: "Asistencias" },
			{ key: "acciones_recuperacion", label: "Recuperacion" },
			{ key: "acciones_rebote", label: "Rebote" },
			{ key: "acciones_exp_provocada", label: "Exp Provocada" },
			{ key: "acciones_penalti_provocado", label: "Penalti Provocado" },
			{ key: "acciones_recibir_gol", label: "Recibe Gol" },
			{ key: "acciones_perdida_poco", label: "Perdida Posesion" },
			{ key: "faltas_contrafaltas", label: "Contrafaltas" },
			{ key: "pase_boya", label: "Pase boya" },
			{ key: "pase_boya_fallado", label: "Pase boya fallado" }
		]
	}
];

/* --- Portero: mismos grupos y campos que nuevo-partido UI --- */
const GOALKEEPER_GROUPS: StatGroup[] = [
	{
		title: "Goles encajados",
		stats: [
			{ key: "portero_goles_boya_parada", label: "Boya" },
			{ key: "portero_goles_dir_mas_5m", label: "Dir +6m" },
			{ key: "portero_goles_contraataque", label: "Contraataque" },
			{ key: "portero_goles_penalti", label: "Penalti" },
			{ key: "portero_goles_lanzamiento", label: "Lanzamiento" }
		]
	},
	{
		title: "Paradas",
		stats: [
			{ key: "portero_tiros_parada_recup", label: "Parada Recup" },
			{ key: "portero_paradas_fuera", label: "Parada Fuera" },
			{ key: "portero_paradas_penalti_parado", label: "Penalti Parado" },
			{ key: "lanz_recibido_fuera", label: "Lanz. recibido fuera" },
			{ key: "portero_lanz_palo", label: "Lanz. recibido palo" }
		]
	},
	{
		title: "Inferioridad",
		stats: [
			{ key: "portero_goles_hombre_menos", label: "Goles Hombre -" },
			{ key: "portero_paradas_hombre_menos", label: "Paradas Hombre -" },
			{ key: "portero_inferioridad_fuera", label: "Fuera" },
			{ key: "portero_inferioridad_bloqueo", label: "Bloqueo" }
		]
	},
	{
		title: "Acciones",
		stats: [
			{ key: "acciones_asistencias", label: "Asistencias" },
			{ key: "acciones_recuperacion", label: "Recuperacion" },
			{ key: "portero_acciones_perdida_pos", label: "Perdida Posesion" },
			{ key: "acciones_exp_provocada", label: "Expulsion Provocada" },
			{ key: "portero_gol", label: "Gol" },
			{ key: "portero_gol_superioridad", label: "Gol Superioridad" },
			{ key: "portero_fallo_superioridad", label: "Fallo Superioridad" }
		]
	}
];

/* ------------------------------------------------------------------ */
/*  Single weight row                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Group section                                                      */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Main config component                                              */
/* ------------------------------------------------------------------ */

export function StatWeightsConfig() {
	const { loaded, dirty, saving, error, getWeight, setWeight, discard, save } = useStatWeights();

	const [tab, setTab] = React.useState<"field" | "goalkeeper">("field");

	if (!loaded) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				</CardContent>
			</Card>
		);
	}

	const groups = tab === "field" ? FIELD_PLAYER_GROUPS : GOALKEEPER_GROUPS;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Valoraciones de Estadisticas</CardTitle>
				<CardDescription>
					Asigna un peso (positivo o negativo) a cada campo de estadistica. Cada usuario tiene sus propias valoraciones independientes.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Tab toggle */}
				<div className="flex gap-2">
					<Button variant={tab === "field" ? "default" : "outline"} size="sm" onClick={() => setTab("field")}>
						Jugador de campo
					</Button>
					<Button variant={tab === "goalkeeper" ? "default" : "outline"} size="sm" onClick={() => setTab("goalkeeper")}>
						Portero
					</Button>
				</div>

				{/* Stat groups */}
				<div className="space-y-4">
					{groups.map((g) => (
						<GroupSection key={g.title} group={g} getWeight={getWeight} setWeight={setWeight} />
					))}
				</div>

				{/* Save / Discard bar */}
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
