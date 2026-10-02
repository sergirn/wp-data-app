"use client";

import type React from "react";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import {
	Plus,
	Edit,
	CheckCircle2,
	PauseCircle,
	FileClock,
	Clock3,
	Trash2,
	Loader2,
	Search,
	SlidersHorizontal,
	X,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ClipboardCheck,
	LockKeyhole
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
	const [reviewFilter, setReviewFilter] = useState("all");
	const [sortOrder, setSortOrder] = useState("date-desc");
	const [seasons, setSeasons] = useState<string[]>([]);
	const [seasonFilter, setSeasonFilter] = useState("");
	const [activeSeason, setActiveSeason] = useState("");
	const [seasonClubId, setSeasonClubId] = useState<number | null>(null);
	const [page, setPage] = useState(1);
	const [listRevision, setListRevision] = useState(0);
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
				if (reviewFilter !== "all") query = query.eq("review_status", reviewFilter);

				if (sortOrder === "date-asc") query = query.order("match_date", { ascending: true });
				else if (sortOrder === "opponent-asc") query = query.order("opponent", { ascending: true }).order("match_date", { ascending: false });
				else query = query.order("match_date", { ascending: false });

				const from = (page - 1) * MATCHES_PER_PAGE;
				const { data: matchesData, error, count } = await query.range(from, from + MATCHES_PER_PAGE - 1).abortSignal(abortController.signal);

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
	}, [
		competitionFilter,
		currentClub,
		debouncedSearch,
		listRevision,
		page,
		reviewFilter,
		seasonClubId,
		seasonFilter,
		sortOrder,
		statsFilter,
		venueFilter
	]);

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
				const { data: matchSeasons } = await supabase
					.from("matches")
					.select("season")
					.eq("club_id", currentClub.id)
					.not("season", "is", null)
					.order("match_date", { ascending: false });
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
	const hasFilters = Boolean(
		search ||
		seasonFilter !== activeSeason ||
		competitionFilter !== "all" ||
		venueFilter !== "all" ||
		statsFilter !== "all" ||
		reviewFilter !== "all" ||
		sortOrder !== "date-desc"
	);
	const advancedFiltersCount = [venueFilter !== "all", statsFilter !== "all", reviewFilter !== "all", sortOrder !== "date-desc"].filter(
		Boolean
	).length;

	const mobileFiltersCount = [
		competitionFilter !== "all",
		seasonFilter !== activeSeason,
		venueFilter !== "all",
		statsFilter !== "all",
		reviewFilter !== "all",
		sortOrder !== "date-desc"
	].filter(Boolean).length;
	const clearFilters = () => {
		setSearch("");
		setCompetitionFilter("all");
		setVenueFilter("all");
		setStatsFilter("all");
		setReviewFilter("all");
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

			const { error } = await supabase.from("matches").update({ stats_enabled: nextValue }).eq("id", matchId);

			if (error) throw error;

			setMatches((prev) => prev.map((match) => (match.id === matchId ? { ...match, stats_enabled: nextValue } : match)));
		} catch (error) {
			console.error("[v0] Error updating stats_enabled:", error);
		}
	};

	const handleMatchDeleted = (matchId: number) => {
		const wasLastMatchOnPage = matches.length === 1;
		setMatches((current) => current.filter((match) => match.id !== matchId));
		setTotalMatches((current) => Math.max(0, current - 1));

		if (wasLastMatchOnPage && page > 1) {
			setPage((current) => Math.max(1, current - 1));
		} else {
			setListRevision((current) => current + 1);
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
					<div className="mb-5 rounded-xl border bg-card shadow-sm">
						{/* Barra principal */}
						<div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
							{/* Buscar */}
							<div className="relative min-w-0 flex-1 sm:max-w-sm">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

								<Input
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder={matchesT("filters.searchPlaceholder")}
									aria-label={matchesT("filters.searchLabel")}
									className="h-10 border-0 bg-muted/40 pl-9 pr-9 shadow-none focus-visible:ring-1"
								/>

								{search && (
									<button
										type="button"
										onClick={() => setSearch("")}
										aria-label={matchesT("filters.clearSearch")}
										className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								)}
							</div>

							{/* Filtros principales - solo desktop */}
							<div className="hidden items-center gap-2 sm:flex">
								<Select
									value={competitionFilter}
									onValueChange={(value) => {
										setCompetitionFilter(value);
										setPage(1);
									}}
								>
									<SelectTrigger
										aria-label={matchesT("filters.competitionLabel")}
										className="h-10 w-[175px] border-0 bg-muted/40 text-xs shadow-none"
									>
										<SelectValue />
									</SelectTrigger>

									<SelectContent>
										<SelectItem value="all">{matchesT("filters.allCompetitions")}</SelectItem>

										{competitions.map((competition) => (
											<SelectItem key={competition.id} value={String(competition.id)}>
												{competition.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{seasons.length > 0 && (
									<Select
										value={seasonFilter}
										onValueChange={(value) => {
											setSeasonFilter(value);
											setPage(1);
										}}
									>
										<SelectTrigger
											aria-label={matchesT("filters.seasonLabel")}
											className="h-10 w-[135px] border-0 bg-muted/40 text-xs shadow-none"
										>
											<SelectValue />
										</SelectTrigger>

										<SelectContent>
											{seasons.map((season) => (
												<SelectItem key={season} value={season}>
													{season}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>

							{/* Más filtros */}
							<Popover>
								<PopoverTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										className="
						h-10 w-full justify-between gap-2
						bg-muted/40 px-3 font-medium
						hover:bg-muted
						sm:w-auto sm:justify-center
					"
									>
										<div className="flex items-center gap-2">
											<SlidersHorizontal className="h-4 w-4" />

											<span className="sm:hidden">{matchesT("filters.button")}</span>

											<span className="hidden sm:inline">{matchesT("filters.moreFilters")}</span>

											{/* Contador móvil */}
											{mobileFiltersCount > 0 && (
												<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground sm:hidden">
													{mobileFiltersCount}
												</span>
											)}

											{/* Contador desktop */}
											{advancedFiltersCount > 0 && (
												<span className="hidden h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground sm:flex">
													{advancedFiltersCount}
												</span>
											)}
										</div>

										<ChevronDown className="h-4 w-4 text-muted-foreground" />
									</Button>
								</PopoverTrigger>

								<PopoverContent align="end" className="w-[calc(100vw-2rem)] p-0 sm:w-[390px]">
									<div className="border-b px-4 py-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-semibold">{matchesT("filters.button")}</p>
												<p className="text-xs text-muted-foreground">{matchesT("filters.filterDescription")}</p>
											</div>

											{hasFilters && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={clearFilters}
													className="h-8 px-2 text-xs text-muted-foreground"
												>
													<X className="mr-1.5 h-3.5 w-3.5" />
													{matchesT("filters.clear")}
												</Button>
											)}
										</div>
									</div>

									<div className="grid gap-4 p-4 sm:grid-cols-2">
										{/* Competición - móvil */}
										<div className="space-y-1.5 sm:hidden">
											<label className="text-xs font-medium text-muted-foreground">
												{matchesT("filters.competitionLabel")}
											</label>

											<Select
												value={competitionFilter}
												onValueChange={(value) => {
													setCompetitionFilter(value);
													setPage(1);
												}}
											>
												<SelectTrigger className="h-10 w-full">
													<SelectValue />
												</SelectTrigger>

												<SelectContent>
													<SelectItem value="all">{matchesT("filters.allCompetitions")}</SelectItem>

													{competitions.map((competition) => (
														<SelectItem key={competition.id} value={String(competition.id)}>
															{competition.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{/* Temporada - móvil */}
										{seasons.length > 0 && (
											<div className="space-y-1.5 sm:hidden">
												<label className="text-xs font-medium text-muted-foreground">{matchesT("filters.seasonLabel")}</label>

												<Select
													value={seasonFilter}
													onValueChange={(value) => {
														setSeasonFilter(value);
														setPage(1);
													}}
												>
													<SelectTrigger className="h-10 w-full">
														<SelectValue />
													</SelectTrigger>

													<SelectContent>
														{seasons.map((season) => (
															<SelectItem key={season} value={season}>
																{season}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										)}

										{/* Local / visitante */}
										<div className="space-y-1.5">
											<label className="text-xs font-medium text-muted-foreground">{matchesT("filters.venueLabel")}</label>

											<Select
												value={venueFilter}
												onValueChange={(value) => {
													setVenueFilter(value);
													setPage(1);
												}}
											>
												<SelectTrigger className="h-10 w-full">
													<SelectValue />
												</SelectTrigger>

												<SelectContent>
													<SelectItem value="all">{matchesT("filters.allVenues")}</SelectItem>
													<SelectItem value="home">{matchesT("filters.home")}</SelectItem>
													<SelectItem value="away">{matchesT("filters.away")}</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{/* Estadísticas */}
										<div className="space-y-1.5">
											<label className="text-xs font-medium text-muted-foreground">{matchesT("filters.statsLabel")}</label>

											<Select
												value={statsFilter}
												onValueChange={(value) => {
													setStatsFilter(value);
													setPage(1);
												}}
											>
												<SelectTrigger className="h-10 w-full">
													<SelectValue />
												</SelectTrigger>

												<SelectContent>
													<SelectItem value="all">{matchesT("filters.allStats")}</SelectItem>
													<SelectItem value="enabled">{matchesT("filters.statsEnabled")}</SelectItem>
													<SelectItem value="disabled">{matchesT("filters.statsDisabled")}</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{/* Revisión */}
										<div className="space-y-1.5">
											<label className="text-xs font-medium text-muted-foreground">{matchesT("filters.reviewLabel")}</label>

											<Select
												value={reviewFilter}
												onValueChange={(value) => {
													setReviewFilter(value);
													setPage(1);
												}}
											>
												<SelectTrigger className="h-10 w-full">
													<SelectValue />
												</SelectTrigger>

												<SelectContent>
													<SelectItem value="all">{matchesT("filters.allReviewStatuses")}</SelectItem>
													<SelectItem value="pending_review">{matchesT("reviewStatus.pending_review")}</SelectItem>
													<SelectItem value="reviewed">{matchesT("reviewStatus.reviewed")}</SelectItem>
													<SelectItem value="locked">{matchesT("reviewStatus.locked")}</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{/* Orden */}
										<div className="space-y-1.5">
											<label className="text-xs font-medium text-muted-foreground">{matchesT("filters.sortLabel")}</label>

											<Select
												value={sortOrder}
												onValueChange={(value) => {
													setSortOrder(value);
													setPage(1);
												}}
											>
												<SelectTrigger className="h-10 w-full">
													<SelectValue />
												</SelectTrigger>

												<SelectContent>
													<SelectItem value="date-desc">{matchesT("filters.newest")}</SelectItem>
													<SelectItem value="date-asc">{matchesT("filters.oldest")}</SelectItem>
													<SelectItem value="opponent-asc">{matchesT("filters.opponent")}</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
								</PopoverContent>
							</Popover>

							{/* Resultados - desktop */}
							<div className="ml-auto hidden h-10 shrink-0 items-center gap-2 px-2 text-xs tabular-nums text-muted-foreground lg:flex">
								<span className="h-1.5 w-1.5 rounded-full bg-primary" />
								{matchesT("filters.results", { count: totalMatches })}
							</div>

							{/* Limpiar desktop */}
							{hasFilters && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={clearFilters}
									aria-label={matchesT("filters.clear")}
									className="hidden h-10 w-10 shrink-0 text-muted-foreground sm:inline-flex"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>

						{/* Footer móvil */}
						<div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground sm:hidden">
							<div className="flex items-center gap-2">
								<span className="h-1.5 w-1.5 rounded-full bg-primary" />
								{matchesT("filters.results", { count: totalMatches })}
							</div>

							{hasFilters && (
								<button type="button" onClick={clearFilters} className="font-medium text-foreground">
									{matchesT("filters.clear")}
								</button>
							)}
						</div>
					</div>

					{loading ? (
						<Card>
							<CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								{matchesT("loading")}
							</CardContent>
						</Card>
					) : matches.length > 0 ? (
						<div>
							<div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
								<div className="hidden grid-cols-[minmax(17rem,1.45fr)_minmax(11rem,.9fr)_minmax(10rem,.75fr)_minmax(12rem,.95fr)_7rem_1.5rem] items-center gap-5 border-b bg-muted/25 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
									<span>{matchesT("list.match")}</span>
									<span>{matchesT("list.date")}</span>
									<span>{matchesT("list.score")}</span>
									<span>{matchesT("list.status")}</span>
									<span className="text-center">{matchesT("list.actions")}</span>
									<span className="sr-only">{matchesT("list.open")}</span>
								</div>
								{matches.map((match) => (
									<MatchCard
										key={match.id}
										match={match}
										clubName={currentClub?.short_name || ""}
										canEdit={canEdit}
										onToggleStatsEnabled={handleToggleStatsEnabled}
										onDeleted={handleMatchDeleted}
									/>
								))}
							</div>
							{totalPages > 1 && (
								<div className="mt-2 flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setPage((value) => Math.max(1, value - 1))}
										disabled={page === 1}
									>
										<ChevronLeft className="mr-1 h-4 w-4" />
										{matchesT("pagination.previous")}
									</Button>
									<span className="text-xs text-muted-foreground sm:text-sm">
										{matchesT("pagination.page", { page, total: totalPages })}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
										disabled={page === totalPages}
									>
										{matchesT("pagination.next")}
										<ChevronRight className="ml-1 h-4 w-4" />
									</Button>
								</div>
							)}
						</div>
					) : hasFilters ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<Search className="mb-3 h-8 w-8 text-muted-foreground/60" />
								<p className="text-sm text-muted-foreground">{matchesT("filters.noResults")}</p>
								<Button type="button" variant="link" onClick={clearFilters}>
									{matchesT("filters.clear")}
								</Button>
							</CardContent>
						</Card>
					) : (
						<EmptyMatches clubName={currentClub?.short_name || ""} canEdit={canEdit} />
					)}
				</TabsContent>

				<TabsContent value="drafts">
					{drafts.length > 0 ? (
						<div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
							<div className="hidden grid-cols-[minmax(17rem,1.45fr)_minmax(12rem,.9fr)_minmax(12rem,.95fr)_minmax(10rem,.75fr)_9rem_1.5rem] items-center gap-5 border-b bg-muted/25 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
								<span>{matchesT("draftList.match")}</span>
								<span>{matchesT("draftList.saved")}</span>
								<span>{matchesT("draftList.expiration")}</span>
								<span>{matchesT("draftList.squad")}</span>
								<span className="text-center">{matchesT("draftList.actions")}</span>
								<span className="sr-only">{matchesT("draftList.open")}</span>
							</div>
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
	const expirationBadge = isExpired
		? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
		: remainingMs <= 86_400_000
			? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
			: "border-blue-500/20 bg-blue-500/8 text-blue-700 dark:text-blue-300";

	const handleCardClick = (event: React.MouseEvent) => {
		if ((event.target as HTMLElement).closest(".action-buttons")) return;
		if (isExpired) return;
		router.push(continueHref);
	};

	return (
		<div
			role={isExpired ? undefined : "link"}
			tabIndex={isExpired ? -1 : 0}
			onClick={handleCardClick}
			onKeyDown={(event) => {
				if (isExpired || (event.target as HTMLElement).closest(".action-buttons")) return;
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					router.push(continueHref);
				}
			}}
			className={cn("group border-b transition-colors last:border-0", isExpired ? "opacity-70" : "cursor-pointer hover:bg-primary/[0.035] focus-visible:bg-primary/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring")}
		>
			<div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(17rem,1.45fr)_minmax(12rem,.9fr)_minmax(12rem,.95fr)_minmax(10rem,.75fr)_9rem_1.5rem] lg:items-center lg:gap-5">
				<div className="flex min-w-0 items-center gap-3.5">
					<div className="grid size-14 shrink-0 place-items-center rounded-xl border border-dashed border-blue-500/30 bg-blue-500/[0.06] shadow-sm">
						<FileClock className="size-7 text-blue-600 dark:text-blue-300" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h2 className="truncate font-semibold tracking-tight sm:text-base">{localTeam} {t("versus")} {visitingTeam}</h2>
							<Badge variant="outline" className="shrink-0 border-blue-500/25 bg-blue-500/8 text-[10px] text-blue-700 dark:text-blue-300">{t("drafts.badge")}</Badge>
						</div>
						<p className="mt-0.5 truncate text-xs text-muted-foreground">{matchDate.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}{payload.season ? ` · ${payload.season}` : ""}{payload.jornada ? ` · ${t("matchday", { number: payload.jornada })}` : ""}</p>
						{payload.location && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{payload.location}</p>}
					</div>
				</div>

				<div className="rounded-xl border bg-muted/10 p-3 lg:border-0 lg:bg-transparent lg:p-0">
					<div className="flex items-center justify-between gap-3 lg:block">
						<span className="text-xs text-muted-foreground lg:hidden">{t("draftList.saved")}</span>
						<div className="text-right lg:text-left">
							<p className="text-xs font-medium">{updatedAt.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}</p>
							<p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground lg:justify-start"><Clock3 className="size-3" />{updatedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</p>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-between gap-3 lg:block">
					<span className="text-xs text-muted-foreground lg:hidden">{t("draftList.expiration")}</span>
					<div className="text-right lg:text-left">
						<Badge variant="outline" className={cn("text-[10px]", expirationBadge)}><FileClock className="size-3" />{expirationText}</Badge>
						<p className={cn("mt-1.5 text-[11px]", expirationColor)}>{expiresAt.toLocaleDateString(locale, { day: "2-digit", month: "short" })} · {expiresAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</p>
					</div>
				</div>

				<div className="flex items-center justify-between gap-3">
					<span className="text-xs text-muted-foreground lg:hidden">{t("draftList.squad")}</span>
					<div className="text-right lg:text-left"><p className="text-xs font-semibold tabular-nums">{t("drafts.players", { count: playerCount })}</p><p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">{t("drafts.inProgress")}</p></div>
				</div>

				<div className="action-buttons flex items-center justify-end gap-1 border-t pt-3 lg:border-0 lg:pt-0">
					{isExpired ? <Button type="button" variant="ghost" size="icon" disabled aria-label={t("drafts.expired")}><Edit className="size-4" /></Button> : <Button asChild variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-400"><Link href={continueHref} aria-label={t("drafts.continue")} title={t("drafts.continue")}><Edit className="size-4" /></Link></Button>}
					<DeleteDraftButton draft={draft} onDelete={onDelete} compact />
				</div>

				<ChevronRight className={cn("hidden size-5 text-muted-foreground transition-transform lg:block", !isExpired && "group-hover:translate-x-0.5 group-hover:text-primary")} />
			</div>
		</div>
	);
}

function DeleteDraftButton({ draft, onDelete, compact = false }: { draft: MatchListDraft; onDelete: (draft: MatchListDraft) => Promise<void>; compact?: boolean }) {
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
				<Button type="button" variant="ghost" size={compact ? "icon" : "default"} aria-label={t("delete")} title={compact ? t("delete") : undefined} className="text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-300">
					<Trash2 className={cn("h-4 w-4", !compact && "mr-2")} />
					{!compact && t("delete")}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("drafts.deleteTitle")}</AlertDialogTitle>
					<AlertDialogDescription>{t("drafts.deleteDescription")}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
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
	onToggleStatsEnabled,
	onDeleted
}: {
	match: MatchWithCompetition;
	clubName: string;
	canEdit: boolean;
	onToggleStatsEnabled: (matchId: number, currentValue: boolean) => void;
	onDeleted: (matchId: number) => void;
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
	const result = hasPenalties ? t(outcome === "win" ? "results.penaltyWin" : "results.penaltyLoss") : t(`results.${outcome}`);
	const reviewStatus = match.review_status ?? "pending_review";
	const statsEnabled = match.stats_enabled ?? true;
	const outcomeClasses = outcome === "win"
		? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
		: outcome === "loss"
			? "bg-rose-500/12 text-rose-700 dark:text-rose-300"
			: "bg-amber-500/12 text-amber-700 dark:text-amber-300";

	const handleCardClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest(".action-buttons")) {
			return;
		}
		router.push(`/partidos/${match.id}`);
	};

	return (
		<div
			role="link"
			tabIndex={0}
			onClick={handleCardClick}
			onKeyDown={(event) => {
				if ((event.target as HTMLElement).closest(".action-buttons")) return;
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					router.push(`/partidos/${match.id}`);
				}
			}}
			className="group cursor-pointer border-b transition-colors last:border-0 hover:bg-primary/[0.035] focus-visible:bg-primary/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
		>
			<div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(17rem,1.45fr)_minmax(11rem,.9fr)_minmax(10rem,.75fr)_minmax(12rem,.95fr)_7rem_1.5rem] lg:items-center lg:gap-5">
				<div className="flex min-w-0 items-center gap-3.5">
					<div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-background shadow-sm transition-transform group-hover:scale-[1.03]">
						<Image src={competitionImage ?? logo} alt="" fill sizes="56px" className={competitionImage ? "object-contain p-1.5" : "object-contain p-2 opacity-65"} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h2 className="truncate font-semibold tracking-tight sm:text-base">{localTeam} {t("versus")} {visitingTeam}</h2>
							<ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" />
						</div>
						<p className="mt-0.5 truncate text-xs text-muted-foreground">{match.competitions?.name ?? t("list.competitionFallback")}{match.season ? ` · ${match.season}` : ""}</p>
					</div>
				</div>

				<div className="rounded-xl border bg-muted/10 p-3 lg:border-0 lg:bg-transparent lg:p-0">
					<div className="flex items-center justify-between gap-3 lg:block">
						<span className="text-xs text-muted-foreground lg:hidden">{t("list.date")}</span>
						<div className="text-right lg:text-left">
							<p className="text-xs font-medium">{matchDate.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}</p>
							<p className="mt-1 truncate text-[11px] text-muted-foreground">{match.jornada ? t("matchday", { number: match.jornada }) : "—"}{match.location ? ` · ${match.location}` : ""}</p>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-between gap-3 lg:block">
					<span className="text-xs text-muted-foreground lg:hidden">{t("list.score")}</span>
					<div className="flex items-center gap-3 lg:block">
						<div className="flex items-baseline gap-2 text-xl font-bold tabular-nums"><span>{localScore}</span><span className="text-sm font-medium text-muted-foreground">–</span><span>{visitingScore}</span></div>
						<Badge variant="outline" className={cn("mt-1 border-0 px-2 text-[10px]", outcomeClasses)}>{result}</Badge>
						{hasPenalties && <p className="mt-1 text-[10px] text-muted-foreground">{t("penalties", { home: localPenaltyScore ?? 0, away: visitingPenaltyScore ?? 0 })}</p>}
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3 lg:justify-start">
						<span className="text-xs text-muted-foreground lg:hidden">{t("list.status")}</span>
						<Badge variant="outline" className={cn("text-[10px]", reviewStatus === "locked" ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" : reviewStatus === "reviewed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
							{reviewStatus === "locked" ? <LockKeyhole className="size-3" /> : <ClipboardCheck className="size-3" />}{t(`reviewStatus.${reviewStatus}`)}
						</Badge>
					</div>
					{canEdit && reviewStatus !== "locked" ? <button type="button" onClick={(event) => { event.stopPropagation(); onToggleStatsEnabled(match.id, statsEnabled); }} className={cn("action-buttons flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors", statsEnabled ? "bg-emerald-500/8 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-500/8 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300")}>
						{statsEnabled ? <CheckCircle2 className="size-3.5" /> : <PauseCircle className="size-3.5" />}{statsEnabled ? t("statsEnabled") : t("statsDisabled")}
					</button> : <span className={cn("inline-flex items-center gap-1.5 text-[11px]", statsEnabled ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>{statsEnabled ? <CheckCircle2 className="size-3.5" /> : <PauseCircle className="size-3.5" />}{statsEnabled ? t("statsEnabled") : t("statsDisabled")}</span>}
				</div>

				<div className="action-buttons flex items-center justify-end gap-1 border-t pt-3 lg:border-0 lg:pt-0">
					{canEdit && reviewStatus !== "locked" ? <>
						<Link href={`/nuevo-partido?matchId=${match.id}`} aria-label={t("edit")} title={t("edit")} className="grid size-8 place-items-center rounded-md text-blue-600 transition-colors hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-400"><Edit className="size-4" /></Link>
						<DeleteMatchButton matchId={match.id} onDeleted={onDeleted} className="hover:bg-red-500/10" />
					</> : <span className="text-xs text-muted-foreground">—</span>}
				</div>

				<ChevronRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary lg:block" />
			</div>
		</div>
	);
}
