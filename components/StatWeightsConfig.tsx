"use client";

import * as React from "react";
import { useStatWeights } from "@/hooks/useStatWeights";
import { useHiddenStats } from "@/hooks/useHiddenStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, Minus, Plus, RotateCcw, Save } from "lucide-react";

import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";

import { getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig";
import { useTranslations } from "next-intl";

interface StatDef {
	key: string;
	label: string;
}

interface StatGroup {
	title: string;
	stats: StatDef[];
}

function buildPlayerGroups(statLabel: (key: string) => string, categoryTitle: (category: PlayerStatCategory) => string): StatGroup[] {
	const orderedCategories: PlayerStatCategory[] = ["goles", "fallos", "faltas", "acciones"];

	return orderedCategories
		.map((category) => ({
			title: categoryTitle(category),
			stats: getPlayerStatsByCategory(category).map((s) => ({
				key: s.key,
				label: statLabel(s.key)
			}))
		}))
		.filter((group) => group.stats.length > 0);
}

function buildGoalkeeperGroups(statLabel: (key: string) => string, categoryTitle: (category: GoalkeeperStatCategory) => string): StatGroup[] {
	const orderedCategories: GoalkeeperStatCategory[] = ["goles", "paradas", "paradas_penalti", "otros_tiros", "inferioridad", "acciones", "ataque"];

	return orderedCategories
		.map((category) => ({
			title: categoryTitle(category),
			stats: getGoalkeeperStatsByCategory(category).map((s) => ({
				key: s.key,
				label: statLabel(s.key)
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
	const t = useTranslations("StatWeights");
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
		<div
			className={`flex min-h-40 flex-col rounded-xl border p-4 transition-colors ${
				hidden ? "border-dashed bg-muted/15" : "border-border bg-card shadow-sm"
			}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<span className={`block text-sm font-semibold leading-5 ${hidden ? "text-muted-foreground" : "text-foreground"}`}>
						{stat.label}
					</span>
					<div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
						<span className={`h-1.5 w-1.5 rounded-full ${hidden ? "bg-muted-foreground/60" : "bg-emerald-500"}`} />
						{hidden ? t("hiddenField") : t("activeField")}
					</div>
				</div>

				<Button
					type="button"
					variant={hidden ? "secondary" : "outline"}
					size="sm"
					className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
					onClick={() => onToggleHidden(!hidden)}
					aria-label={hidden ? t("showStat", { stat: stat.label }) : t("hideStat", { stat: stat.label })}
				>
					{hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
					{hidden ? t("show") : t("hide")}
				</Button>
			</div>

			<div className={`mt-auto pt-4 ${hidden ? "opacity-45" : ""}`}>
				<p className="mb-2 text-xs font-medium text-muted-foreground">{t("assignedRating")}</p>
				<div className="grid grid-cols-[2.25rem_1fr_2.25rem] overflow-hidden rounded-lg border bg-background">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-9 w-9 rounded-none border-r"
						onClick={decrement}
						disabled={hidden}
						aria-label={t("decreaseValue", { stat: stat.label })}
					>
						<Minus className="h-4 w-4" />
					</Button>

					<Input
						type="number"
						value={value}
						onChange={handleInput}
						disabled={hidden}
						className="h-9 w-full rounded-none border-0 bg-transparent px-1 text-center text-base font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						aria-label={t("rating", { stat: stat.label })}
					/>

					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-9 w-9 rounded-none border-l"
						onClick={increment}
						disabled={hidden}
						aria-label={t("increaseValue", { stat: stat.label })}
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
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
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
	const t = useTranslations("StatWeights");
	const tStat = useTranslations("StatLabels");
	const tCategories = useTranslations("StatsSections.categories");
	const weightsState = useStatWeights();
	const hiddenState = useHiddenStats();

	const [tab, setTab] = React.useState<"field" | "goalkeeper">("field");

	const playerCategoryKeys: Record<PlayerStatCategory, string> = { goles: "playerGoals", fallos: "playerMisses", faltas: "fouls", acciones: "actions" };
	const goalkeeperCategoryKeys: Record<GoalkeeperStatCategory, string> = { goles: "goalkeeperGoals", paradas: "saves", paradas_penalti: "penalties", otros_tiros: "otherShots", inferioridad: "inferiority", acciones: "actions", ataque: "goalkeeperAttack" };
	const fieldGroups = React.useMemo(() => buildPlayerGroups((key) => tStat(key), (category) => tCategories(playerCategoryKeys[category])), [tStat, tCategories]);
	const goalkeeperGroups = React.useMemo(() => buildGoalkeeperGroups((key) => tStat(key), (category) => tCategories(goalkeeperCategoryKeys[category])), [tStat, tCategories]);

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
				<CardTitle>{t("title")}</CardTitle>
				<CardDescription>
					{t("description")}
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="flex gap-2">
					<Button variant={tab === "field" ? "default" : "outline"} size="sm" onClick={() => setTab("field")}>
						{t("fieldPlayer")}
					</Button>

					<Button variant={tab === "goalkeeper" ? "default" : "outline"} size="sm" onClick={() => setTab("goalkeeper")}>
						{t("goalkeeper")}
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
								{t("unsavedChanges")}
								{error && <span className="text-destructive ml-2">· {error}</span>}
							</div>

							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
									<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
									{t("discard")}
								</Button>

								<Button size="sm" onClick={handleSave} disabled={saving}>
									{saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
									{saving ? t("saving") : t("save")}
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
