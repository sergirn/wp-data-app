"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Home, PlusCircle, Calendar, UsersRound, BarChart3, Swords } from "lucide-react";

const NAV_LINKS = [
	{ href: "/", labelKey: "home", icon: Home, requiresEdit: false },
	{ href: "/partidos", labelKey: "matches", icon: Calendar, requiresEdit: false },
	{ href: "/rivales", labelKey: "scouting", icon: Swords, requiresEdit: false },
	{ href: "/nuevo-partido", labelKey: "newMatch", icon: PlusCircle, requiresEdit: true },
	{ href: "/jugadores", labelKey: "players", icon: UsersRound, requiresEdit: false },
	{ href: "/analytics", labelKey: "analytics", icon: BarChart3, requiresEdit: false }
] as const;

interface BottomNavigationProps {
	canEdit: boolean;
	/** Si se pasa, intercepta navegación (ideal para confirm modal en /nuevo-partido) */
	onNavigate?: (href: string, transitionType?: "mobile-nav-forward" | "mobile-nav-back") => void;
}

export function BottomNavigation({ canEdit, onNavigate }: BottomNavigationProps) {
	const pathname = usePathname();
	const t = useTranslations("Navigation");
	const visibleLinks = NAV_LINKS.filter((link) => !link.requiresEdit || canEdit);
	const currentIndex = visibleLinks.findIndex(({ href }) =>
		href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
	);

	const handleClick = (href: string, targetIndex: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
		// permitir abrir en nueva pestaña / new tab / botón central
		if (e.metaKey || e.ctrlKey || e.button === 1) return;

		if (!onNavigate) return; // sin guard, navega normal

		e.preventDefault();
		const transitionType = currentIndex < 0 || currentIndex === targetIndex
			? undefined
			: targetIndex > currentIndex
				? "mobile-nav-forward"
				: "mobile-nav-back";
		onNavigate(href, transitionType);
	};

	return (
		<nav
			aria-label={t("mobileNavigation")}
			className="fixed inset-x-0 bottom-0 z-50 isolate border-t border-border/80 bg-background/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
		>
			<div className="flex h-16 w-full items-stretch px-1">
				{visibleLinks.map(({ href, labelKey, icon: Icon }, index) => {
					const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

					return (
						<Link
							key={href}
							href={href}
							onClick={handleClick(href, index)}
							aria-label={t(labelKey)}
							aria-current={active ? "page" : undefined}
							className="group relative flex h-full min-w-0 flex-1 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
						>
							<span
								className={cn(
									"relative grid size-11 place-items-center rounded-xl transition-[color,background-color,transform] duration-200 ease-out group-active:scale-90",
									active ? "scale-105 bg-primary/10 text-primary" : "text-muted-foreground group-hover:bg-muted/70 group-hover:text-foreground"
								)}
							>
								<Icon className="size-6" strokeWidth={active ? 2.5 : 2} />
								<span className="sr-only">{t(labelKey)}</span>
							</span>
							<span
								aria-hidden="true"
								className={cn(
									"pointer-events-none absolute inset-x-[30%] top-0 h-0.5 origin-center rounded-b-full bg-primary transition-[opacity,transform] duration-200",
									active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
								)}
							/>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
