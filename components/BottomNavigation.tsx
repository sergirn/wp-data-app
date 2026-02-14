"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, PlusCircle, Calendar, UsersRound, BarChart3 } from "lucide-react";

const NAV_LINKS = [
	{ href: "/", icon: Home },
	{ href: "/partidos", icon: Calendar },
	{ href: "/nuevo-partido", icon: PlusCircle, isMain: true },
	{ href: "/jugadores", icon: UsersRound },
	{ href: "/analytics", icon: BarChart3 }
];

interface BottomNavigationProps {
	canEdit: boolean;
	/** Si se pasa, intercepta navegación (ideal para confirm modal en /nuevo-partido) */
	onNavigate?: (href: string) => void;
}

export function BottomNavigation({ canEdit, onNavigate }: BottomNavigationProps) {
	const pathname = usePathname();

	const handleClick = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
		// permitir abrir en nueva pestaña / new tab / botón central
		if (e.metaKey || e.ctrlKey || e.button === 1) return;

		if (!onNavigate) return; // sin guard, navega normal

		e.preventDefault();
		onNavigate(href);
	};

	return (
		<nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/90 backdrop-blur">
			<div className="flex h-16 items-center justify-around">
				{NAV_LINKS.map(({ href, icon: Icon, isMain }) => {
					if (href === "/nuevo-partido" && !canEdit) return null;

					const active = pathname === href;

					return (
						<Link
							key={href}
							href={href}
							onClick={handleClick(href)}
							className={cn("flex flex-col items-center justify-center transition-colors", isMain && "-mt-6")}
						>
							<div
								className={cn(
									"flex h-11 w-11 items-center justify-center rounded-full",
									isMain ? "bg-primary text-primary-foreground shadow-lg" : active ? "text-primary" : "text-muted-foreground"
								)}
							>
								<Icon className={isMain ? "h-6 w-6" : "h-5 w-5"} />
							</div>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
