"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Player, Profile } from "@/lib/types";
import { useClub } from "@/lib/club-context";
import { CalendarRange, Info, Loader2, Mail, Palette, Settings2, Shield, User, Users } from "lucide-react";
import { StatWeightsConfig } from "@/components/StatWeightsConfig";
import { EditPlayersPanel } from "@/components/players-components/EditPlayersPanel";
import { SeasonManagementPanel } from "@/components/seasons/SeasonManagementPanel";
import { useTranslations } from "next-intl";

export default function AjustesPage() {
	const t = useTranslations("Pages");
	const settings = useTranslations("Settings");
	const common = useTranslations("Common");

	const { theme } = useTheme();
	const { currentClub } = useClub();

	const mounted = useSyncExternalStore(
		() => () => undefined,
		() => true,
		() => false
	);

	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

	const [players, setPlayers] = useState<Player[]>([]);
	const [playersLoading, setPlayersLoading] = useState(false);
	const [playersError, setPlayersError] = useState<string | null>(null);

	const managedClubId = currentClub?.id ?? profile?.club_id ?? null;
	const canManageClub = profile?.is_super_admin === true || profile?.role === "admin" || profile?.role === "coach";

	const loadClubPlayers = useCallback(
		async (clubId: number) => {
			setPlayersLoading(true);
			setPlayersError(null);

			try {
				const supabase = createClient();

				const { data, error } = await supabase.from("players").select("*").eq("club_id", clubId).order("number");

				if (error) throw error;

				setPlayers((data ?? []) as Player[]);
			} catch {
				setPlayersError(settings("playersLoadError"));
			} finally {
				setPlayersLoading(false);
			}
		},
		[settings]
	);

	useEffect(() => {
		const loadProfile = async () => {
			const supabase = createClient();

			if (!supabase) {
				setLoading(false);
				return;
			}

			const {
				data: { user }
			} = await supabase.auth.getUser();

			if (user) {
				const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();

				setProfile(profileData);
			}

			setLoading(false);
		};

		void loadProfile();
	}, []);

	useEffect(() => {
		if (!managedClubId) return;

		const loadTimer = window.setTimeout(() => void loadClubPlayers(managedClubId), 0);

		return () => window.clearTimeout(loadTimer);
	}, [loadClubPlayers, managedClubId]);

	const getRoleBadge = (role: string) => {
		const badges = {
			admin: {
				label: settings("roles.admin"),
				variant: "destructive" as const
			},
			coach: {
				label: settings("roles.coach"),
				variant: "default" as const
			},
			viewer: {
				label: settings("roles.viewer"),
				variant: "secondary" as const
			}
		};

		return badges[role as keyof typeof badges] || badges.viewer;
	};

	return (
		<div className="min-h-screen bg-background">
			<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				<div className="space-y-6">
					<header className="relative overflow-hidden rounded-2xl border bg-card px-6 py-7 shadow-sm sm:px-8">
						<div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

						<div className="relative max-w-3xl">
							<p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">WP Data App</p>

							<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("settings")}</h1>

							<p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{settings("subtitle")}</p>
						</div>
					</header>

					<Tabs defaultValue="general" className="min-w-0 space-y-5">
						<TabsList className="flex h-auto w-full justify-start overflow-x-auto rounded-xl p-1 lg:grid lg:max-w-4xl lg:grid-cols-4">
							<TabsTrigger value="general" className="gap-2 py-2.5">
								<User className="h-4 w-4" />
								{settings("generalTab")}
							</TabsTrigger>

							<TabsTrigger value="seasons" className="min-w-40 gap-2 py-2.5 lg:min-w-0">
								<CalendarRange className="h-4 w-4" />
								{settings("seasonsTab")}
							</TabsTrigger>

							<TabsTrigger value="statistics" className="gap-2 py-2.5">
								<Settings2 className="h-4 w-4" />
								{settings("statisticsTab")}
							</TabsTrigger>

							<TabsTrigger value="players" className="gap-2 py-2.5">
								<Users className="h-4 w-4" />
								{settings("playersTab")}
							</TabsTrigger>
						</TabsList>

						{/* GENERAL */}
						<TabsContent value="general" className="min-w-0">
							<div className="grid items-start gap-6 lg:grid-cols-12">
								{/* PROFILE */}
								<div className="lg:col-span-7">
									{loading ? (
										<Card className="min-h-64">
											<CardContent className="flex min-h-64 items-center justify-center">
												<Loader2 className="h-6 w-6 animate-spin text-primary" />
											</CardContent>
										</Card>
									) : profile ? (
										<Card className="overflow-hidden shadow-sm">
											<div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

											<CardHeader>
												<CardTitle>{settings("profileTitle")}</CardTitle>
												<CardDescription>{settings("profileDescription")}</CardDescription>
											</CardHeader>

											<CardContent className="space-y-6">
												<div className="flex min-w-0 items-center gap-4 rounded-xl border bg-muted/25 p-4 sm:p-5">
													<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
														<User className="h-8 w-8 text-primary" />
													</div>

													<div className="min-w-0 flex-1">
														<p className="truncate text-xl font-semibold">{profile.full_name || common("user")}</p>

														<div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
															<Mail className="h-4 w-4 shrink-0" />
															<span className="truncate">{profile.email}</span>
														</div>
													</div>
												</div>

												<div className="rounded-xl border p-4 sm:p-5">
													<div className="flex items-center justify-between gap-4">
														<div className="flex items-center gap-2">
															<Shield className="h-4 w-4 text-primary" />

															<span className="text-sm font-medium">{settings("role")}</span>
														</div>

														<Badge variant={getRoleBadge(profile.role).variant}>{getRoleBadge(profile.role).label}</Badge>
													</div>

													<p className="mt-3 text-sm leading-6 text-muted-foreground">
														{profile.role === "admin" && settings("permissions.admin")}

														{profile.role === "coach" && settings("permissions.coach")}

														{profile.role === "viewer" && settings("permissions.viewer")}
													</p>
												</div>
											</CardContent>
										</Card>
									) : null}
								</div>

								{/* APPEARANCE + INFORMATION */}
								<div className="grid gap-6 lg:col-span-5">
									<Card className="overflow-hidden shadow-sm">
										<CardHeader>
											<div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
												<Palette className="h-5 w-5 text-primary" />
											</div>

											<CardTitle>{settings("appearance")}</CardTitle>

											<CardDescription>{settings("appearanceDescription")}</CardDescription>
										</CardHeader>

										<CardContent className="space-y-4">
											<div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/25 p-4">
												<div className="space-y-0.5">
													<Label className="text-base">{settings("theme")}</Label>

													<p className="text-sm text-muted-foreground">
														{mounted
															? theme === "dark"
																? settings("darkEnabled")
																: settings("lightEnabled")
															: common("loading")}
													</p>
												</div>

												<ThemeToggle />
											</div>

											<p className="text-sm leading-6 text-muted-foreground">{settings("darkHint")}</p>
										</CardContent>
									</Card>

									<Card className="overflow-hidden shadow-sm">
										<CardHeader>
											<div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
												<Info className="h-5 w-5 text-primary" />
											</div>

											<CardTitle>{settings("information")}</CardTitle>

											<CardDescription>{settings("informationDescription")}</CardDescription>
										</CardHeader>

										<CardContent>
											<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
												{[
													[settings("version"), "1.0.0"],
													[settings("club"), currentClub?.short_name ?? "-"],
													[settings("sport"), "Waterpolo"]
												].map(([label, value]) => (
													<div key={label} className="rounded-xl border bg-muted/25 p-3">
														<p className="text-xs text-muted-foreground">{label}</p>

														<p className="mt-1 truncate text-sm font-semibold" title={value}>
															{value}
														</p>
													</div>
												))}
											</div>
										</CardContent>
									</Card>
								</div>
							</div>
						</TabsContent>

						{/* SEASONS */}
						<TabsContent value="seasons" className="min-w-0">
							<SeasonManagementPanel
								clubId={managedClubId}
								players={players}
								canManage={canManageClub}
								onChanged={async () => {
									if (managedClubId) await loadClubPlayers(managedClubId);
								}}
							/>
						</TabsContent>

						{/* STATISTICS */}
						<TabsContent value="statistics" className="min-w-0">
							<StatWeightsConfig />
						</TabsContent>

						{/* PLAYERS */}
						<TabsContent value="players" className="min-w-0">
							{playersLoading ? (
								<Card>
									<CardContent className="flex min-h-48 items-center justify-center">
										<Loader2 className="h-6 w-6 animate-spin text-primary" />
									</CardContent>
								</Card>
							) : playersError ? (
								<Card>
									<CardContent className="p-6">
										<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
											{playersError}
										</div>
									</CardContent>
								</Card>
							) : (
								<EditPlayersPanel
									players={players}
									clubId={managedClubId}
									onSaved={() => managedClubId && void loadClubPlayers(managedClubId)}
								/>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</main>
		</div>
	);
}
