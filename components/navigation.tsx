"use client";

import { memo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, PlusCircle, Calendar, UsersRound, BarChart3, Shield, Menu, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { ClubSelector } from "@/components/club-selector";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useClub } from "@/lib/club-context";
import type { Profile } from "@/lib/types";
import { BottomNavigation } from "@/components/BottomNavigation";

interface NavigationProps {
	profile?: Profile | null;
}

const NAV_LINKS = [
	{ href: "/", label: "Inicio", icon: Home },
	{ href: "/nuevo-partido", label: "Nuevo Partido", icon: PlusCircle, requiresEdit: true },
	{ href: "/partidos", label: "Partidos", icon: Calendar },
	{ href: "/jugadores", label: "Jugadores", icon: UsersRound },
	{ href: "/analytics", label: "Analytics", icon: BarChart3 }
];

export const Navigation = memo(function Navigation({ profile }: NavigationProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { currentClub } = useClub();
	const [open, setOpen] = useState(false);

	const canEdit = profile?.role === "admin" || profile?.role === "coach";
	const isActive = (href: string) => pathname === href;

	const handleLogout = async () => {
		const supabase = createClient();
		await supabase.auth.signOut();
		setOpen(false);
		router.replace("/auth/login");
	};

	return (
		<>
			{/* ===== TOP NAVBAR (desktop + mobile header) ===== */}
			<header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur-xl">
				<div className="container mx-auto px-4">
					<div className="flex h-14 items-center justify-between">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-3">
							<div className="relative h-9 w-9 rounded-full overflow-hidden border shadow-sm">
								<Image src={currentClub?.logo_url || "/none"} alt="Club Logo" fill className="object-cover" priority />
							</div>
							<span className="hidden sm:block font-semibold tracking-tight">{currentClub?.short_name || "WaterpoloStats"}</span>
						</Link>

						{/* Desktop nav */}
						<nav className="hidden lg:flex items-center gap-1">
							{NAV_LINKS.map(({ href, label, icon: Icon, requiresEdit }) => {
								if (requiresEdit && !canEdit) return null;
								const active = isActive(href);

								return (
									<Button
										key={href}
										asChild
										size="sm"
										variant="ghost"
										className={[
											"relative gap-2 rounded-full px-3",
											"hover:bg-muted",
											active ? "text-blue-600 dark:text-blue-400" : "text-foreground"
										].join(" ")}
									>
										<Link href={href} className="relative flex items-center gap-2">
											<Icon className={["h-4 w-4", active ? "text-blue-600 dark:text-blue-400" : ""].join(" ")} />
											<span className="hidden xl:inline">{label}</span>

											{active ? (
												<span className="pointer-events-none absolute left-1 right-1 bottom-0 h-[4px] rounded-full bg-blue-600 dark:bg-blue-400" />
											) : null}
										</Link>
									</Button>
								);
							})}

							{profile?.is_super_admin &&
								(() => {
									const active = pathname.startsWith("/admin");
									return (
										<Button
											asChild
											size="sm"
											variant="ghost"
											className={[
												"relative gap-2 rounded-full px-3",
												"hover:bg-muted",
												active ? "text-blue-600 dark:text-blue-400" : "text-foreground"
											].join(" ")}
										>
											<Link href="/admin" className="relative flex items-center gap-2">
												<Shield className={["h-4 w-4", active ? "text-blue-600 dark:text-blue-400" : ""].join(" ")} />
												<span className="hidden xl:inline">Admin</span>

												{active ? (
													<span className="pointer-events-none absolute left-3 right-3 bottom-0 h-[2px] rounded-full bg-blue-600 dark:bg-blue-400" />
												) : null}
											</Link>
										</Button>
									);
								})()}
						</nav>

						{/* Right actions */}
						<div className="flex items-center gap-2">
							<ThemeToggle />
							<ClubSelector className="hidden md:flex" />
							{profile && <UserMenu profile={profile} />}

							{/* Sheet SOLO tablet / desktop pequeño (no móvil) */}
							<Sheet open={open} onOpenChange={setOpen}>
								<SheetTrigger asChild>
									<Button size="icon" variant="ghost" className="hidden md:inline-flex lg:hidden">
										<Menu />
									</Button>
								</SheetTrigger>

								<SheetContent side="right" className="w-[320px]">
									<div className="flex flex-col gap-6 mt-6">
										{profile && (
											<div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
												<div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
													{profile.full_name?.[0] ?? "U"}
												</div>
												<div className="min-w-0">
													<p className="text-sm font-semibold truncate">{profile.full_name}</p>
													<p className="text-xs text-muted-foreground truncate">{profile.email}</p>
												</div>
											</div>
										)}

										<div className="space-y-1">
											{NAV_LINKS.map(({ href, label, icon: Icon, requiresEdit }) => {
												if (requiresEdit && !canEdit) return null;
												const active = isActive(href);

												return (
													<Button
														key={href}
														asChild
														variant="ghost"
														className={[
															"w-full justify-between rounded-lg relative",
															active ? "text-blue-600 dark:text-blue-400 bg-muted" : ""
														].join(" ")}
														onClick={() => setOpen(false)}
													>
														<Link href={href} className="relative flex w-full items-center justify-between">
															<span className="flex items-center gap-3">
																<Icon
																	className={[
																		"relative gap-2 rounded-full px-3",
																		active ? "text-blue-600 dark:text-blue-400" : "text-foreground"
																	].join(" ")}
																/>
																{label}
															</span>
															<ChevronRight className="h-4 w-4 opacity-50" />

															{active ? (
																<span className="pointer-events-none absolute left-1 right-1 bottom-0 h-[4px] rounded-full bg-blue-600 dark:bg-blue-400" />
															) : null}
														</Link>
													</Button>
												);
											})}
										</div>
									</div>
								</SheetContent>
							</Sheet>
						</div>
					</div>
				</div>
			</header>

			{/* ===== MOBILE BOTTOM NAV (Instagram style) ===== */}
			<BottomNavigation canEdit={canEdit} />
		</>
	);
});
