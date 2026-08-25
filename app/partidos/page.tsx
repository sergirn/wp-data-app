"use client";

import type React from "react";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Plus, Edit, CheckCircle2, PauseCircle, FileClock, Clock3, Trash2, Loader2, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
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
import { getMatchOutcome, getVenueScore } from "@/lib/matches/score";

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

type CompetitionOption = { id: number; name: string };
const MATCHES_PER_PAGE = 10;

export default function MatchesPage() {
	const t = useTranslations("Pages");
	const matchesT = useTranslations("Matches");
	const { currentClub } = useClub();
	const { profile } = useProfile();
	const [matches, setMatches] = useState<MatchWithCompetition[]>([]);
	const [drafts, setDrafts] = useState<MatchListDraft[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadedOnce, setLoadedOnce] = useState(false);
	const [totalMatches, setTotalMatches] = useState(0);
	const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [competitionFilter, setCompetitionFilter] = useState("all");
	const [venueFilter, setVenueFilter] = useState("all");
	const [statsFilter, setStatsFilter] = useState("all");
	const [sortOrder, setSortOrder] = useState("date-desc");
	const [seasons, setSeasons] = useState<string[]>([]);
	const [seasonFilter, setSeasonFilter] = useState("");
	const [activeSeason, setActiveSeason] = useState("");
	const [seasonClubId, setSeasonClubId] = useState<number | null>(null);
	const [page, setPage] = useState(1);
	const [now, setNow] = useState(() => Date.now());

	const canEdit = profile?.role === "admin" || profile?.role === "coach";

	useEffect(() => {
		const interval = window.setInterval(() => setNow(Date.now()), 60_000);
		return () => window.clearInterval(interval);
	}, []);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedSearch(search.trim());
			setPage(1);
		}, 300);
		return () => window.clearTimeout(timeout);
	}, [search]);

	useEffect(() => {
		const abortController = new AbortController();
		async function fetchMatches() {
			if (!currentClub || seasonClubId !== currentClub.id) return;
			setLoading(true);
			setMatches([]);

			if (!currentClub) {
				setTotalMatches(0);
				setLoading(false);
				return;
			}

			try {
				const supabase = createClient();
				if (!supabase) {
					setLoading(false);
					return;
				}

				let query = supabase
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
						`,
						{ count: "exact" }
					)
					.eq("club_id", currentClub.id);

				if (seasonFilter) query = query.eq("season", seasonFilter);
				if (debouncedSearch) query = query.ilike("opponent", `%${debouncedSearch}%`);
				if (competitionFilter !== "all") query = query.eq("competition_id", Number(competitionFilter));
				if (venueFilter !== "all") query = query.eq("is_home", venueFilter === "home");
				if (statsFilter !== "all") query = query.eq("stats_enabled", statsFilter === "enabled");

				if (sortOrder === "date-asc") query = query.order("match_date", { ascending: true });
				else if (sortOrder === "opponent-asc") query = query.order("opponent", { ascending: true }).order("match_date", { ascending: false });
				else query = query.order("match_date", { ascending: false });

				const from = (page - 1) * MATCHES_PER_PAGE;
				const { data: matchesData, error, count } = await query
					.range(from, from + MATCHES_PER_PAGE - 1)
					.abortSignal(abortController.signal);

				if (error) throw error;

				setMatches(matchesData || []);
				setTotalMatches(count ?? 0);
			} catch (error) {
				if (!abortController.signal.aborted) console.error("[v0] Error fetching matches:", error);
			} finally {
				if (!abortController.signal.aborted) {
					setLoading(false);
					setLoadedOnce(true);
				}
			}
		}

		void fetchMatches();
		return () => abortController.abort();
	}, [competitionFilter, currentClub, debouncedSearch, page, seasonClubId, seasonFilter, sortOrder, statsFilter, venueFilter]);

	useEffect(() => {
		async function fetchSupportingData() {
			setDrafts([]);
			setCompetitions([]);
			setSeasons([]);
			setSeasonFilter("");
			setActiveSeason("");
			setSeasonClubId(null);
			if (!currentClub) return;
			const supabase = createClient();
			const { data: seasonRows } = await supabase
				.from("club_seasons")
				.select("name, status, start_year")
				.eq("club_id", currentClub.id)
				.order("start_year", { ascending: false });
			let availableSeasons = (seasonRows ?? []).map((row) => String(row.name));
			let defaultSeason = seasonRows?.find((row) => row.status === "active")?.name ?? availableSeasons[0];
			if (availableSeasons.length === 0) {
				const { data: matchSeasons } = await supabase.from("matches").select("season").eq("club_id", currentClub.id).not("season", "is", null).order("match_date", { ascending: false });
				availableSeasons = Array.from(new Set((matchSeasons ?? []).map((row) => String(row.season))));
				defaultSeason = availableSeasons[0];
			}
			setSeasons(availableSeasons);
			setSeasonFilter(defaultSeason ?? "");
			setActiveSeason(defaultSeason ?? "");
			setSeasonClubId(currentClub.id);

			const { data: competitionRows } = await supabase
				.from("club_competitions")
				.select("competition_id, competitions:competition_id(id, name)")
				.eq("club_id", currentClub.id);
			const normalizedCompetitions = (competitionRows ?? []).flatMap((row) => {
				const relation = Array.isArray(row.competitions) ? row.competitions[0] : row.competitions;
				return relation ? [{ id: Number(relation.id), name: String(relation.name) }] : [];
			});
			setCompetitions(normalizedCompetitions.sort((a, b) => a.name.localeCompare(b.name)));

			if (canEdit && profile?.id) {
				const draftData = await listMatchDrafts<MatchListDraftPayload>(profile.id, currentClub.id);
				setDrafts(draftData);
			}
		}

		void fetchSupportingData();
	}, [canEdit, currentClub, profile?.id]);

	const totalPages = Math.max(1, Math.ceil(totalMatches / MATCHES_PER_PAGE));
	const hasFilters = Boolean(search || seasonFilter !== activeSeason || competitionFilter !== "all" || venueFilter !== "all" || statsFilter !== "all" || sortOrder !== "date-desc");
	const clearFilters = () => {
		setSearch("");
		setCompetitionFilter("all");
		setVenueFilter("all");
		setStatsFilter("all");
		setSortOrder("date-desc");
		setSeasonFilter(activeSeason);
		setPage(1);
	};

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

	if (loading && !loadedOnce) {
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
						{matchesT("tabs.matches", { count: totalMatches })}
					</TabsTrigger>
					<TabsTrigger value="drafts" className="gap-2">
						<FileClock className="h-4 w-4" />
						{matchesT("tabs.drafts", { count: drafts.length })}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="matches">
					<div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card/50 p-2 shadow-sm">
						<div className="relative min-w-[220px] flex-1 sm:max-w-xs">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder={matchesT("filters.searchPlaceholder")}
								aria-label={matchesT("filters.searchLabel")}
								className="h-9 bg-background/60 pl-9 pr-9 shadow-none"
							/>
							{search && (
								<button type="button" onClick={() => setSearch("")} aria-label={matchesT("filters.clearSearch")} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</div>

						<div className="flex h-9 shrink-0 items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
							<SlidersHorizontal className="h-3.5 w-3.5" />
							<span>{matchesT("filters.button")}</span>
						</div>

						<Select value={competitionFilter} onValueChange={(value) => { setCompetitionFilter(value); setPage(1); }}>
							<SelectTrigger aria-label={matchesT("filters.competitionLabel")} className="h-9 w-[175px] bg-background/60 text-xs shadow-none"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{matchesT("filters.allCompetitions")}</SelectItem>
								{competitions.map((competition) => <SelectItem key={competition.id} value={String(competition.id)}>{competition.name}</SelectItem>)}
							</SelectContent>
						</Select>
						{seasons.length > 0 && (
							<Select value={seasonFilter} onValueChange={(value) => { setSeasonFilter(value); setPage(1); }}>
								<SelectTrigger aria-label={matchesT("filters.seasonLabel")} className="h-9 w-[135px] bg-background/60 text-xs shadow-none"><SelectValue /></SelectTrigger>
								<SelectContent>{seasons.map((season) => <SelectItem key={season} value={season}>{season}</SelectItem>)}</SelectContent>
							</Select>
						)}
						<Select value={venueFilter} onValueChange={(value) => { setVenueFilter(value); setPage(1); }}>
							<SelectTrigger aria-label={matchesT("filters.venueLabel")} className="h-9 w-[135px] bg-background/60 text-xs shadow-none"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{matchesT("filters.allVenues")}</SelectItem>
								<SelectItem value="home">{matchesT("filters.home")}</SelectItem>
								<SelectItem value="away">{matchesT("filters.away")}</SelectItem>
							</SelectContent>
						</Select>
						<Select value={statsFilter} onValueChange={(value) => { setStatsFilter(value); setPage(1); }}>
							<SelectTrigger aria-label={matchesT("filters.statsLabel")} className="h-9 w-[150px] bg-background/60 text-xs shadow-none"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{matchesT("filters.allStats")}</SelectItem>
								<SelectItem value="enabled">{matchesT("filters.statsEnabled")}</SelectItem>
								<SelectItem value="disabled">{matchesT("filters.statsDisabled")}</SelectItem>
							</SelectContent>
						</Select>
						<Select value={sortOrder} onValueChange={(value) => { setSortOrder(value); setPage(1); }}>
							<SelectTrigger aria-label={matchesT("filters.sortLabel")} className="h-9 w-[140px] bg-background/60 text-xs shadow-none"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="date-desc">{matchesT("filters.newest")}</SelectItem>
								<SelectItem value="date-asc">{matchesT("filters.oldest")}</SelectItem>
								<SelectItem value="opponent-asc">{matchesT("filters.opponent")}</SelectItem>
							</SelectContent>
						</Select>

						<div className="ml-auto flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-2 text-xs tabular-nums text-muted-foreground">
							<span className="size-1.5 rounded-full bg-primary/70" />
							{matchesT("filters.results", { count: totalMatches })}
						</div>
						{hasFilters && (
							<Button type="button" variant="ghost" size="icon" onClick={clearFilters} aria-label={matchesT("filters.clear")} className="h-9 w-9 shrink-0 text-muted-foreground">
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>

					{loading ? (
						<Card><CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{matchesT("loading")}</CardContent></Card>
					) : matches.length > 0 ? (
						<div>
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
							{totalPages > 1 && (
								<div className="mt-2 flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
									<Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
										<ChevronLeft className="mr-1 h-4 w-4" />{matchesT("pagination.previous")}
									</Button>
									<span className="text-xs text-muted-foreground sm:text-sm">{matchesT("pagination.page", { page, total: totalPages })}</span>
									<Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>
										{matchesT("pagination.next")}<ChevronRight className="ml-1 h-4 w-4" />
									</Button>
								</div>
							)}
						</div>
					) : hasFilters ? (
						<Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><Search className="mb-3 h-8 w-8 text-muted-foreground/60" /><p className="text-sm text-muted-foreground">{matchesT("filters.noResults")}</p><Button type="button" variant="link" onClick={clearFilters}>{matchesT("filters.clear")}</Button></CardContent></Card>
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
	const hasPenalties = isTied && match.penalty_home_score != null && match.penalty_away_score != null;
	const competitionImage = match.competitions?.image_url?.trim() || null;
	const isClubHome = match.is_home !== false;
	const localTeam = isClubHome ? clubName : match.opponent;
	const visitingTeam = isClubHome ? match.opponent : clubName;
	const venueScore = getVenueScore(match);
	const localScore = venueScore.local;
	const visitingScore = venueScore.visitor;
	const localPenaltyScore = venueScore.localPenalties;
	const visitingPenaltyScore = venueScore.visitorPenalties;

	const outcome = getMatchOutcome(match);
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
