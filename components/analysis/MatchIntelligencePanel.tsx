"use client";

import { useMemo, useState, useTransition } from "react";
import {
	AlertCircle,
	CheckCircle2,
	ClipboardCheck,
	Lightbulb,
	LockKeyhole,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Target,
	TrendingDown,
	TrendingUp
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import {
	buildMatchInsights,
	calculatePerformanceSnapshot,
	DEFAULT_ANALYSIS_THRESHOLDS,
	validateMatchData,
	type AnalysisThresholds,
	type MatchReviewIssue,
	type PerformanceInsight
} from "@/lib/analysis/performance-insights";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ReviewStatus = "pending_review" | "reviewed" | "locked";

type Props = {
	match: Record<string, unknown> & { id: number; review_status?: ReviewStatus };
	stats: Array<Record<string, unknown>>;
	actionCount: number;
	canEdit: boolean;
	thresholds?: AnalysisThresholds;
};

const toneStyles: Record<PerformanceInsight["tone"], string> = {
	positive: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300",
	warning: "border-amber-500/25 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300",
	negative: "border-rose-500/25 bg-rose-500/[0.07] text-rose-700 dark:text-rose-300",
	neutral: "border-border bg-muted/20 text-foreground"
};

function InsightIcon({ tone }: { tone: PerformanceInsight["tone"] }) {
	if (tone === "positive") return <TrendingUp className="size-4" />;
	if (tone === "negative") return <TrendingDown className="size-4" />;
	if (tone === "warning") return <AlertCircle className="size-4" />;
	return <Lightbulb className="size-4" />;
}

function ReviewIssueRow({ issue }: { issue: MatchReviewIssue }) {
	const t = useTranslations("ProductInsights");
	const isError = issue.severity === "error";
	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-xl border p-3",
				isError
					? "border-rose-500/25 bg-rose-500/[0.06]"
					: issue.severity === "warning"
						? "border-amber-500/25 bg-amber-500/[0.06]"
						: "bg-muted/20"
			)}
		>
			{isError ? (
				<AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
			) : issue.severity === "warning" ? (
				<AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
			) : (
				<Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			)}
			<div className="min-w-0">
				<p className="text-sm font-medium">{t(`issues.${issue.code}`, { expected: issue.expected ?? 0, actual: issue.actual ?? 0 })}</p>
				<p className="mt-0.5 text-xs text-muted-foreground">{t(`severity.${issue.severity}`)}</p>
			</div>
		</div>
	);
}

export function MatchIntelligencePanel({ match, stats, actionCount, canEdit, thresholds = DEFAULT_ANALYSIS_THRESHOLDS }: Props) {
	const t = useTranslations("ProductInsights");
	const router = useRouter();
	const [status, setStatus] = useState<ReviewStatus>(match.review_status ?? "pending_review");
	const [feedback, setFeedback] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const snapshot = useMemo(() => calculatePerformanceSnapshot([match], stats), [match, stats]);
	const insights = useMemo(() => buildMatchInsights(match, stats, thresholds), [match, stats, thresholds]);
	const issues = useMemo(() => validateMatchData(match, stats, actionCount), [match, stats, actionCount]);
	const blockers = issues.filter((issue) => issue.severity === "error").length;

	const changeStatus = (nextStatus: ReviewStatus) => {
		setFeedback(null);
		startTransition(async () => {
			const response = await fetch(`/api/matches/${match.id}/review`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: nextStatus })
			}).catch(() => null);
			if (!response?.ok) {
				setFeedback(response?.status === 409 ? t("review.blockedFeedback") : t("review.updateError"));
				return;
			}
			setStatus(nextStatus);
			setFeedback(t(`review.feedback.${nextStatus}`));
			router.refresh();
		});
	};

	return (
		<Card className="mb-2 overflow-hidden rounded-2xl border-border/70 p-0">
			<CardHeader className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent">
				<div className=" mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between -mb-6">
					<div>
						<CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
							<Sparkles className="size-5 text-primary" />
							{t("title")}
						</CardTitle>
						<CardDescription className="mt-1">{t("description")}</CardDescription>
					</div>
					<Badge
						variant="outline"
						className={cn(
							"gap-1.5",
							status === "locked" && "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
							status === "reviewed" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
						)}
					>
						{status === "locked" ? <LockKeyhole /> : status === "reviewed" ? <ShieldCheck /> : <ClipboardCheck />}
						{t(`status.${status}`)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="p-4 ">
				<Tabs defaultValue="summary">
					<TabsList className="grid h-auto w-full grid-cols-2 rounded-xl -mt-6">
						<TabsTrigger value="summary" className="gap-2 py-2.5">
							<Lightbulb className="size-4" />
							{t("tabs.summary")}
						</TabsTrigger>
						<TabsTrigger value="review" className="gap-2 py-2.5">
							<ClipboardCheck className="size-4" />
							{t("tabs.review")}{" "}
							{blockers > 0 && (
								<span className="grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] text-white">{blockers}</span>
							)}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="summary" className="mt-5 space-y-5">
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
							<Metric
								label={t("metrics.shooting")}
								value={`${snapshot.shootingEfficiency}%`}
								hint={t("metrics.goalsShots", { goals: snapshot.calculatedGoals, shots: snapshot.shots })}
							/>
							<Metric
								label={t("metrics.powerPlay")}
								value={`${snapshot.powerPlayEfficiency}%`}
								hint={t("metrics.converted", { goals: snapshot.powerPlayGoals, attempts: snapshot.powerPlayAttempts })}
							/>
							<Metric
								label={t("metrics.possession")}
								value={snapshot.possessionBalance > 0 ? `+${snapshot.possessionBalance}` : String(snapshot.possessionBalance)}
								hint={t("metrics.recoveriesTurnovers", { recoveries: snapshot.recoveries, turnovers: snapshot.turnovers })}
							/>
							<Metric
								label={t("metrics.goalkeeper")}
								value={`${snapshot.savePercentage}%`}
								hint={t("metrics.savesShots", { saves: snapshot.saves, shots: snapshot.shotsFaced })}
							/>
						</div>
						<div>
							<div className="mb-3 flex items-center gap-2">
								<Target className="size-4 text-primary" />
								<h3 className="text-sm font-semibold">{t("diagnosis")}</h3>
							</div>
							{insights.length > 0 ? (
								<div className="grid gap-3 md:grid-cols-2">
									{insights.map((insight, index) => (
										<div
											key={`${insight.code}-${index}`}
											className={cn("flex items-start gap-3 rounded-xl border p-3", toneStyles[insight.tone])}
										>
											<InsightIcon tone={insight.tone} />
											<p className="text-sm font-medium leading-relaxed">
												{t(`insights.${insight.code}`, {
													value: insight.value ?? 0,
													target: insight.target ?? 0,
													delta: insight.delta ?? 0,
													quarter: insight.quarter ?? 0
												})}
											</p>
										</div>
									))}
								</div>
							) : (
								<p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{t("noInsights")}</p>
							)}
						</div>
					</TabsContent>

					<TabsContent value="review" className="mt-5 space-y-5">
						<div className="grid gap-3 md:grid-cols-2">
							{issues.length > 0 ? (
								issues.map((issue, index) => <ReviewIssueRow key={`${issue.code}-${index}`} issue={issue} />)
							) : (
								<div className="col-span-full flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4 text-emerald-700 dark:text-emerald-300">
									<CheckCircle2 className="size-5" />
									<p className="text-sm font-medium">{t("review.clean")}</p>
								</div>
							)}
						</div>
						{feedback && (
							<Alert>
								<AlertCircle />
								<AlertTitle>{t("review.feedbackTitle")}</AlertTitle>
								<AlertDescription>{feedback}</AlertDescription>
							</Alert>
						)}
						{canEdit && (
							<div className="flex flex-wrap justify-end gap-2 border-t pt-4">
								{status !== "pending_review" && (
									<Button variant="outline" disabled={isPending} onClick={() => changeStatus("pending_review")}>
										<RotateCcw className="mr-2 size-4" />
										{t("review.reopen")}
									</Button>
								)}
								{status === "pending_review" && (
									<Button disabled={isPending || blockers > 0} onClick={() => changeStatus("reviewed")}>
										<ShieldCheck className="mr-2 size-4" />
										{t("review.markReviewed")}
									</Button>
								)}
								{status === "reviewed" && (
									<Button disabled={isPending} onClick={() => changeStatus("locked")}>
										<LockKeyhole className="mr-2 size-4" />
										{t("review.lock")}
									</Button>
								)}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
	return (
		<div className="rounded-xl border bg-card/60 p-3">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
			<p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
		</div>
	);
}
