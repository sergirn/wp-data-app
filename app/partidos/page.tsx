"use client";

import type React from "react";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Edit, CheckCircle2, PauseCircle, FileClock, Clock3, Trash2, Loader2 } from "lucide-react";
import type { Match } from "@/lib/types";
import { useClub } from "@/lib/club-context";
import { useProfile } from "@/lib/profile-context";
import { useEffect, useState } from "react";
import { DeleteMatchButton } from "@/components/delete-match-button";
import { useRouter } from "next/navigation";
import logo from "@/public/images/lewaterpolo_bg.png";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { deleteMatchDraft, listMatchDrafts } from "@/lib/match-draft-client";
import type { MatchDraftPayload, MatchDraftRecord } from "@/lib/match-drafts";

type MatchWithCompetition = Match & {
	competitions?: { id: number; name: string; slug: string; image_url: string | null } | null;
};

type MatchListDraftPayload = MatchDraftPayload & {
	matchDate?: string;
	opponent?: string;
	location?: string;
	isHome?: boolean;
	season?: string;
	jornada?: number;
	activePlayerIds?: number[];
};

type MatchListDraft = MatchDraftRecord<MatchListDraftPayload>;

export default function MatchesPage() {
	const t = useTranslations("Pages");
	const matchesT = useTranslations("Matches");
	const { currentClub } = useClub();
	const { profile } = useProfile();
	const [matches, setMatches] = useState<MatchWithCompetition[]>([]);
	const [drafts, setDrafts] = useState<MatchListDraft[]>([]);
	const [loading, setLoading] = useState(true);
	const [now, setNow] = useState(() => Date.now());

	const canEdit = profile?.role === "admin" || profile?.role === "coach";

	useEffect(() => {
		const interval = window.setInterval(() => setNow(Date.now()), 60_000);
		return () => window.clearInterval(interval);
	}, []);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			setMatches([]);
			setDrafts([]);

			if (!currentClub) {
				setLoading(false);
				return;
			}

			try {
				const supabase = createClient();
				if (!supabase) {
					setLoading(false);
					return;
				}

				const { data: matchesData, error } = await supabase
					.from("matches")
					.select(
						`
						*,
						competitions:competition_id (
						id,
						name,
						slug,
						image_url
						)
					`
					)
					.eq("club_id", currentClub.id)
					.order("match_date", { ascending: false });

				if (error) throw error;

				setMatches(matchesData || []);
				if (canEdit && profile?.id) {
					const draftData = await listMatchDrafts<MatchListDraftPayload>(profile.id, currentClub.id);
					setDrafts(draftData);
				}
			} catch (error) {
				console.error("[v0] Error fetching matches:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [canEdit, currentClub, profile?.id]);

	const handleDeleteDraft = async (draft: MatchListDraft) => {
		if (!profile?.id) return;
		await deleteMatchDraft(profile.id, draft.draftKey, draft.clubId);
		setDrafts((current) => current.filter((item) => item.draftKey !== draft.draftKey));
	};

	const handleToggleStatsEnabled = async (matchId: number, currentValue: boolean) => {
		try {
			const supabase = createClient();
			if (!supabase) return;

			const nextValue = !currentValue;

			const { error } = await supabase
				.from("matches")
				.update({ stats_enabled: nextValue })
				.eq("id", matchId);

			if (error) throw error;

			setMatches((prev) =>
				prev.map((match) =>
					match.id === matchId ? { ...match, stats_enabled: nextValue } : match
				)
			);
		} catch (error) {
			console.error("[v0] Error updating stats_enabled:", error);
		}
	};

	if (loading) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<div className="text-center py-12">
					<p className="text-muted-foreground">{matchesT("loading")}</p>
				</div>
			</main>
		);
	}

	return (
		<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t("matches")}</h1>
					<p className="text-sm sm:text-base text-muted-foreground">{matchesT("history", { club: currentClub?.short_name || "" })}</p>
				</div>
				
			</div>

			<Tabs defaultValue="matches" className="gap-5">
				<TabsList className="grid h-11 w-full max-w-md grid-cols-2">
					<TabsTrigger value="matches" className="gap-2">
						<CheckCircle2 className="h-4 w-4" />
						{matchesT("tabs.matches", { count: matches.length })}
					</TabsTrigger>
					<TabsTrigger value="drafts" className="gap-2">
						<FileClock className="h-4 w-4" />
						{matchesT("tabs.drafts", { count: drafts.length })}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="matches">
					{matches.length > 0 ? (
						<div className="grid gap-3 sm:gap-4">
							{matches.map((match) => (
								<MatchCard
									key={match.id}
									match={match}
									clubName={currentClub?.short_name || ""}
									canEdit={canEdit}
									onToggleStatsEnabled={handleToggleStatsEnabled}
								/>
							))}
						</div>
					) : (
						<EmptyMatches clubName={currentClub?.short_name || ""} canEdit={canEdit} />
					)}
				</TabsContent>

				<TabsContent value="drafts">
					{drafts.length > 0 ? (
						<div className="grid gap-3 sm:gap-4">
							{drafts.map((draft) => (
								<DraftCard
									key={draft.draftKey}
									draft={draft}
									clubName={currentClub?.short_name || ""}
									now={now}
									onDelete={handleDeleteDraft}
								/>
							))}
						</div>
					) : (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<FileClock className="mb-3 h-9 w-9 text-muted-foreground/60" />
								<p className="mb-4 text-sm text-muted-foreground sm:text-base">{matchesT("drafts.empty")}</p>
								{canEdit && (
									<Button asChild>
										<Link href="/nuevo-partido">
											<Plus className="mr-2 h-4 w-4" />
											{matchesT("drafts.create")}
										</Link>
									</Button>
								)}
							</CardContent>
						</Card>
					)}
				</TabsContent>
			</Tabs>
		</main>
	);
}

function EmptyMatches({ clubName, canEdit }: { clubName: string; canEdit: boolean }) {
	const t = useTranslations("Matches");
	return (
		<Card>
			<CardContent className="flex flex-col items-center justify-center py-12">
				<p className="mb-4 text-center text-sm text-muted-foreground sm:text-base">{t("noMatches", { club: clubName })}</p>
				{canEdit && (
					<Button asChild>
						<Link href="/nuevo-partido">
							<Plus className="mr-2 h-4 w-4" />
							{t("createFirst")}
						</Link>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

function DraftCard({
	draft,
	clubName,
	now,
	onDelete
}: {
	draft: MatchListDraft;
	clubName: string;
	now: number;
	onDelete: (draft: MatchListDraft) => Promise<void>;
}) {
	const router = useRouter();
	const t = useTranslations("Matches");
	const locale = useLocale();
	const payload = draft.payload;
	const opponent = payload.opponent?.trim() || t("drafts.opponentFallback");
	const localTeam = payload.isHome === false ? opponent : clubName;
	const visitingTeam = payload.isHome === false ? clubName : opponent;
	const matchDate = new Date(payload.matchDate || draft.updatedAt);
	const updatedAt = new Date(draft.updatedAt);
	const continueParams = new URLSearchParams({ draftKey: draft.draftKey });
	if (draft.matchId) continueParams.set("matchId", String(draft.matchId));
	const continueHref = `/nuevo-partido?${continueParams}`;
	const playerCount = Array.isArray(payload.activePlayerIds) ? payload.activePlayerIds.length : 0;
	const expiresAt = new Date(draft.expiresAt);
	const remainingMs = expiresAt.getTime() - now;
	const isExpired = remainingMs <= 0;
	const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
	const remainingHours = Math.ceil(remainingMs / 3_600_000);
	const remainingDays = Math.ceil(remainingMs / 86_400_000);
	const expirationText = isExpired
		? t("drafts.expired")
		: remainingMs >= 86_400_000
			? t("drafts.expiresDays", { count: remainingDays })
			: remainingMs >= 3_600_000
				? t("drafts.expiresHours", { count: remainingHours })
				: t("drafts.expiresMinutes", { count: remainingMinutes });
	const expirationColor = isExpired
		? "text-red-700 dark:text-red-300"
		: remainingMs <= 86_400_000
			? "text-amber-700 dark:text-amber-300"
			: "text-muted-foreground";

	const handleCardClick = (event: React.MouseEvent) => {
		if ((event.target as HTMLElement).closest(".action-buttons")) return;
		if (isExpired) return;
		router.push(continueHref);
	};

	return (
		<CardContent className={`${isExpired ? "cursor-default opacity-80" : "cursor-pointer hover:bg-muted/100"} rounded-xl p-0 transition-colors`} onClick={handleCardClick}>
			<div className="relative overflow-hidden rounded-xl border-2 border-dashed border-blue-500/35">
				<div className="pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px]">
					<div className="relative h-full w-full">
						<div className="absolute inset-10 rounded-full bg-gradient-to-br from-blue-500/70 via-cyan-400/30 to-transparent blur-3xl" />
						<Image src={logo} alt="LEWaterpolo" fill sizes="(max-width: 640px) 280px, 420px" className="object-contain opacity-20" />
					</div>
				</div>
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/35" />

				<div className="relative p-4 sm:p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
						<div className="min-w-0 flex-1">
							<div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
								<h3 className="truncate text-lg font-bold sm:text-xl">
									{localTeam} {t("versus")} {visitingTeam}
								</h3>
								<span className="w-fit rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
									{t("drafts.badge")}
								</span>
							</div>
							<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
								<span>{matchDate.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
								{payload.location && <span>• {payload.location}</span>}
								{payload.season && <span>• {payload.season}</span>}
								{payload.jornada && <span>• {t("matchday", { number: payload.jornada })}</span>}
							</div>
						</div>

						<div className="flex min-w-[190px] flex-col items-center justify-center gap-1 rounded-lg bg-blue-500/5 px-4 py-3">
							<FileClock className="h-6 w-6 text-blue-600 dark:text-blue-300" />
							<p className="font-semibold">{t("drafts.inProgress")}</p>
							<p className="text-xs text-muted-foreground">{t("drafts.players", { count: playerCount })}</p>
						</div>
					</div>

					<div className="action-buttons mt-4 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-col gap-1 text-xs">
							<div className="flex items-center gap-1.5 text-muted-foreground">
								<Clock3 className="h-3.5 w-3.5" />
								{t("drafts.updated", { date: updatedAt.toLocaleString(locale) })}
							</div>
							<div className={`flex items-center gap-1.5 font-medium ${expirationColor}`}>
								<FileClock className="h-3.5 w-3.5" />
								{expirationText}
							</div>
						</div>
						<div className="flex gap-2">
							{isExpired ? (
								<Button type="button" variant="ghost" disabled>
									<Edit className="mr-2 h-4 w-4" />
									{t("drafts.expired")}
								</Button>
							) : (
								<Button asChild variant="ghost" className="text-blue-700 hover:bg-blue-500/10 hover:text-blue-800 dark:text-blue-300">
									<Link href={continueHref}>
										<Edit className="mr-2 h-4 w-4" />
										{t("drafts.continue")}
									</Link>
								</Button>
							)}
							<DeleteDraftButton draft={draft} onDelete={onDelete} />
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	);
}

function DeleteDraftButton({ draft, onDelete }: { draft: MatchListDraft; onDelete: (draft: MatchListDraft) => Promise<void> }) {
	const t = useTranslations("Matches");
	const common = useTranslations("Common");
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await onDelete(draft);
		} catch (error) {
			console.error("Error deleting draft:", error);
			alert(t("drafts.deleteError"));
		} finally {
			setDeleting(false);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button type="button" variant="ghost" className="text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-300">
					<Trash2 className="mr-2 h-4 w-4" />
					{t("delete")}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("drafts.deleteTitle")}</AlertDialogTitle>
					<AlertDialogDescription>{t("drafts.deleteDescription")}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
					<AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
						{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{deleting ? t("drafts.deleting") : t("delete")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function MatchCard({
	match,
	clubName,
	canEdit,
	onToggleStatsEnabled
}: {
	match: MatchWithCompetition;
	clubName: string;
	canEdit: boolean;
	onToggleStatsEnabled: (matchId: number, currentValue: boolean) => void;
}) {
	const router = useRouter();
	const t = useTranslations("Matches");
	const locale = useLocale();
	const matchDate = new Date(match.match_date);

	const isTied = match.home_score === match.away_score;
	const hasPenalties = isTied && match.penalty_home_score !== null && match.penalty_away_score !== null;
	const competitionImage = match.competitions?.image_url?.trim() || null;
	const isClubHome = match.is_home !== false;
	const localTeam = isClubHome ? clubName : match.opponent;
	const visitingTeam = isClubHome ? match.opponent : clubName;
	const localScore = isClubHome ? match.home_score : match.away_score;
	const visitingScore = isClubHome ? match.away_score : match.home_score;
	const localPenaltyScore = isClubHome ? match.penalty_home_score : match.penalty_away_score;
	const visitingPenaltyScore = isClubHome ? match.penalty_away_score : match.penalty_home_score;

	const outcome = hasPenalties
		? match.penalty_home_score! > match.penalty_away_score! ? "win" : "loss"
		: match.home_score > match.away_score ? "win" : match.home_score < match.away_score ? "loss" : "draw";
	const result = hasPenalties
		? t(outcome === "win" ? "results.penaltyWin" : "results.penaltyLoss")
		: t(`results.${outcome}`);
	const resultColor = outcome === "win"
		? "text-green-600 dark:text-green-400"
		: outcome === "loss"
			? "text-red-600 dark:text-red-400"
			: "text-yellow-600 dark:text-yellow-400";

	const logoGlow = outcome === "win"
		? "from-green-500/80 via-emerald-400/40 to-transparent"
		: outcome === "loss"
			? "from-red-500/80 via-rose-400/40 to-transparent"
			: "from-yellow-500/80 via-amber-400/40 to-transparent";

	const handleCardClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest(".action-buttons")) {
			return;
		}
		router.push(`/partidos/${match.id}`);
	};

	return (
		<CardContent className="p-0 hover:bg-muted/100 rounded-xl transition-colors cursor-pointer" onClick={handleCardClick}>
			<div className="relative overflow-hidden rounded-xl border-2">
				<div className="pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px]">
					<div className="relative h-full w-full">
						<div className={`absolute inset-10 rounded-full bg-gradient-to-br ${logoGlow} blur-3xl`} />
						<Image
							src={competitionImage ?? logo}
							alt={match.competitions?.name ?? "LEWaterpolo"}
							fill
							sizes="(max-width: 640px) 280px, 420px"
							className="object-contain opacity-30 hover:opacity-50  transition-opacity duration-200"
						/>
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />

				<div className="relative p-4 sm:p-6">
					<div className="flex flex-col sm:flex-row sm:justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
								<h3 className="text-lg sm:text-xl font-bold truncate">
									{localTeam} {t("versus")} {visitingTeam}
								</h3>
								<span className={`text-xs sm:text-sm font-semibold ${resultColor}`}>{result}</span>
							</div>

							<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
								<span>
									{matchDate.toLocaleDateString(locale, {
										weekday: "long",
										year: "numeric",
										month: "long",
										day: "numeric"
									})}
								</span>

								{match.location && <span>• {match.location}</span>}
								{match.season && <span>• {match.season}</span>}
								{match.jornada && <span>• {t("matchday", { number: match.jornada })}</span>}
							</div>
						</div>

						{/* MARCADOR */}
						<div className="flex flex-col items-center justify-center gap-2 w-full sm:w-auto">
							<div className="flex items-center gap-4 sm:gap-6">
								<div className="text-center">
									<p className="text-2xl sm:text-3xl font-bold">{localScore}</p>
									<p className="text-xs text-muted-foreground truncate max-w-[120px]">{localTeam}</p>
								</div>

								<div className="text-xl sm:text-2xl font-bold text-muted-foreground">-</div>

								<div className="text-center">
									<p className="text-2xl sm:text-3xl font-bold">{visitingScore}</p>
									<p className="text-xs text-muted-foreground truncate max-w-[120px]">{visitingTeam}</p>
								</div>
							</div>

							{hasPenalties && (
								<div className="text-xs text-muted-foreground font-medium">
									{t("penalties", { home: localPenaltyScore ?? 0, away: visitingPenaltyScore ?? 0 })}
								</div>
							)}
						</div>
					</div>

					{canEdit && (
						<div className="flex gap-4 mt-2 action-buttons">
							<Button
								type="button"
								variant="ghost"
								onClick={(e) => {
									e.stopPropagation();
									onToggleStatsEnabled(match.id, match.stats_enabled ?? true);
								}}
								className={`group flex-1 h-10 rounded-md flex items-center justify-center gap-2 transition-all duration-200 font-medium ${
									match.stats_enabled
										? "text-green-700 dark:text-green-400 bg-green-500/5 hover:bg-green-500/20"
										: "text-amber-700 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/20"
								}`}
							>
								{match.stats_enabled ? <CheckCircle2 className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
								<span className="hidden sm:inline text-sm">
									{match.stats_enabled ? t("statsEnabled") : t("statsDisabled")}
								</span>
							</Button>

							<Link
								href={`/nuevo-partido?matchId=${match.id}`}
								className="group flex-1 h-10 rounded-md flex items-center justify-center gap-2 
                  text-blue-700 dark:text-blue-400 
                  bg-blue-500/5 hover:bg-blue-500/20 
                  transition-all duration-200 font-medium"
							>
								<Edit className="h-4 w-4" />
								<span className="hidden sm:inline text-sm">{t("edit")}</span>
							</Link>

							<div
								className="group flex-1 h-10 rounded-md flex items-center justify-center gap-2 
                  text-red-700 dark:text-red-400 
                  bg-red-500/5 hover:bg-red-500/20 
                  transition-all duration-200 font-medium"
							>
								<DeleteMatchButton matchId={match.id} />
								<span className="hidden sm:inline text-sm">{t("delete")}</span>
							</div>
						</div>
					)}
					<div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
						<span>{t("poweredBy")}</span>

						<Image
							src="/images/logo-sponsor/TFT_LOGO.webp"
							alt="TFT"
							width={30}
							height={18}
							className="h-[40px] w-auto dark:invert dark:brightness-0 dark:contrast-200"
						/>

						<span>&amp;</span>
						<span></span>

						<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={86} height={38} className="h-[30px] w-auto" />
					</div>
				</div>
			</div>
		</CardContent>
	);
}
