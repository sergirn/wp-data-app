"use client";

import { useMemo } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { buildMatchGoalkeeperConversionData } from "@/lib/helpers/chartGoalkeeperMatchHelper";
import { MatchConversionChartTemplate } from "../templates/charts/MatchConversionChartTemplate";

type Props = {
	match: any;
	stats: any[];
};

function Row({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"flex items-center justify-between gap-3 rounded-xl px-3 py-2 border transition-colors",
				subtle ? "bg-muted/30 border-transparent" : "bg-card/40 border-border/60"
			].join(" ")}
		>
			<span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

export function MatchGoalkeepersPieChart({ match, stats }: Props) {
	const computed = useMemo(() => buildMatchGoalkeeperConversionData(match, stats ?? []), [match, stats]);

	if (!match) return null;

	const { derived, extra } = computed;

	const hasExtras = extra.inferioritySaves > 0 || extra.penaltySaves > 0 || extra.inferiorityOutside > 0 || extra.inferiorityBlocks > 0;

	return (
		<MatchConversionChartTemplate
			title="Porteros"
			description={`${derived.saves}/${derived.shotsReceived} · ${derived.savePct}% · GC ${derived.goalsConceded}`}
			icon={<Shield className="h-5 w-5" />}
			data={{
				scored: derived.saves,
				missed: derived.goalsConceded,
				attempts: derived.shotsReceived,
				efficiency: derived.savePct
			}}
			scoredLabel="Paradas"
			missedLabel="Goles recibidos"
			insightGood="Buen rendimiento bajo palos. Más paradas que goles encajados."
			insightBad="Rendimiento mejorable en portería. Conviene revisar volumen y tipo de tiros recibidos."
			rightHeader={<span className="text-xs text-muted-foreground tabular-nums">{derived.savePct}%</span>}
			okColor="hsla(142, 71%, 45%, 0.95)"
			badColor="hsla(45, 90%, 45%, 0.90)"
			renderExtraChartSummary={
				hasExtras ? (
					<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
						<div className="flex items-center justify-between gap-3 mb-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situaciones especiales</p>
							<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
								Detalle
							</Badge>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<Row label="Paradas inf." value={extra.inferioritySaves} />
							<Row label="Penaltis parados" value={extra.penaltySaves} />
							<Row label="Inf. fuera" value={extra.inferiorityOutside} subtle />
							<Row label="Inf. bloqueo" value={extra.inferiorityBlocks} subtle />
						</div>
					</div>
				) : null
			}
			renderExtraTableSummary={
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
						<Row label="Paradas" value={derived.saves} />
						<Row label="Goles recibidos" value={derived.goalsConceded} />
						<Row label="Tiros recibidos" value={derived.shotsReceived} subtle />
						<Row label="% Paradas" value={`${derived.savePct}%`} subtle />
						<Row label="Penaltis recibidos" value={derived.penaltyAttempts} subtle />
						<Row label="% Penaltis parados" value={`${derived.penaltySavePct}%`} subtle />
					</div>

					{hasExtras ? (
						<div className="rounded-3xl border border-border/60 bg-muted/15 p-4">
							<div className="flex items-center justify-between gap-2 mb-3">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalle extra</p>
								<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
									Inferioridad y penaltis
								</Badge>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<Row label="Paradas inferioridad" value={extra.inferioritySaves} />
								<Row label="Penaltis parados" value={extra.penaltySaves} />
								<Row label="Inf. fuera" value={extra.inferiorityOutside} subtle />
								<Row label="Inf. bloqueo" value={extra.inferiorityBlocks} subtle />
								<Row label="Intentos inf." value={derived.inferiorityAttempts} subtle />
								<Row label="Eficacia inf." value={`${derived.inferiorityEfficiency}%`} subtle />
							</div>
						</div>
					) : null}
				</>
			}
		/>
	);
}
