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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

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

  const [openSheet, setOpenSheet] = useState(false);

  // ✅ confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const canEdit = profile?.role === "admin" || profile?.role === "coach";
  const isActive = (href: string) => pathname === href;

  // ✅ SOLO por ruta: SIEMPRE que estés en /nuevo-partido, confirmas al salir
  const isNewMatchPage = pathname === "/nuevo-partido";

  const guardedNavigate = (href: string) => {
    // si es la misma ruta, no hacemos nada
    if (href === pathname) return;

    // ✅ si estás en /nuevo-partido y quieres ir a otra ruta => modal SIEMPRE
    if (isNewMatchPage && href !== "/nuevo-partido") {
      setPendingHref(href);
      setConfirmOpen(true);
      return;
    }

    // resto: navegación normal
    setOpenSheet(false);
    router.push(href);
  };

  const handleLogout = async () => {
    // ✅ logout también pide confirmación si estás en /nuevo-partido
    if (isNewMatchPage) {
      setPendingHref("__logout__");
      setConfirmOpen(true);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    setOpenSheet(false);
    router.replace("/auth/login");
  };

  const confirmLeave = async () => {
    const href = pendingHref;

    setConfirmOpen(false);
    setOpenSheet(false);
    setPendingHref(null);

    if (!href) return;

    if (href === "__logout__") {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/auth/login");
      return;
    }

    router.push(href);
  };

  const cancelLeave = () => {
    setConfirmOpen(false);
    setPendingHref(null);
  };

  // helper para interceptar clicks en Link
  const onNavClick = (href: string) => (e: React.MouseEvent) => {
    // permite abrir en nueva pestaña con cmd/ctrl/click o botón central
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    guardedNavigate(href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo (también protegido si estás en nuevo partido) */}
            <Link href="/" onClick={onNavClick("/")} className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-full overflow-hidden border shadow-sm">
                <Image src={currentClub?.logo_url || "/none"} alt="Club Logo" fill className="object-cover" priority />
              </div>
              <span className="hidden sm:block font-semibold tracking-tight">
                {currentClub?.short_name || "WaterpoloStats"}
              </span>
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
                    className={[
                      "group relative gap-2 rounded-full px-3",
                      "bg-transparent hover:bg-transparent",
                      active ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                    ].join(" ")}
                  >
                    <Link href={href} onClick={onNavClick(href)} className="relative flex items-center gap-2">
                      <Icon className={["h-4 w-4", active ? "text-blue-600 dark:text-blue-400" : ""].join(" ")} />
                      <span className="hidden xl:inline">{label}</span>

                      <span
                        className={[
                          "pointer-events-none absolute left-2 right-2 -bottom-1 h-[3px] rounded-full",
                          "transition-opacity duration-200",
                          active
                            ? "bg-blue-600 dark:bg-blue-400 opacity-100"
                            : "bg-blue-600/40 dark:bg-blue-400/40 opacity-0 group-hover:opacity-100"
                        ].join(" ")}
                      />
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
                      variant="transparent"
                      className={[
                        "group relative gap-2 rounded-full px-3",
                        "bg-transparent hover:bg-transparent",
                        active ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                      ].join(" ")}
                    >
                      <Link href="/admin" onClick={onNavClick("/admin")} className="relative flex items-center gap-2">
                        <Shield className={["h-4 w-4", active ? "text-blue-600 dark:text-blue-400" : ""].join(" ")} />
                        <span className="hidden xl:inline">Admin</span>

                        <span
                          className={[
                            "pointer-events-none absolute left-2 right-2 -bottom-1 h-[3px] rounded-full",
                            "transition-opacity duration-200",
                            active
                              ? "bg-blue-600 dark:bg-blue-400 opacity-100"
                              : "bg-blue-600/40 dark:bg-blue-400/40 opacity-0 group-hover:opacity-100"
                          ].join(" ")}
                        />
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
              <Sheet open={openSheet} onOpenChange={setOpenSheet}>
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
                              "group w-full justify-between rounded-lg relative",
                              "bg-transparent hover:bg-transparent",
                              active ? "text-blue-600 dark:text-blue-400" : ""
                            ].join(" ")}
                          >
                            <Link
                              href={href}
                              onClick={(e) => {
                                e.preventDefault();
                                guardedNavigate(href);
                              }}
                              className="relative flex w-full items-center justify-between"
                            >
                              <span className="flex items-center gap-3">
                                <Icon
                                  className={[
                                    "h-4 w-4",
                                    active ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                                  ].join(" ")}
                                />
                                {label}
                              </span>

                              <ChevronRight className="h-4 w-4 opacity-50" />
                            </Link>
                          </Button>
                        );
                      })}

                      {/* si tienes logout en el sheet */}
                      {/* <Button variant="destructive" onClick={handleLogout}>Cerrar sesión</Button> */}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Bottom nav protegido igual */}
      <BottomNavigation canEdit={canEdit} onNavigate={guardedNavigate} />

      {/* ✅ Modal confirmación */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de Nuevo Partido?</AlertDialogTitle>
            <AlertDialogDescription>
              Si sales ahora, perderás el formulario actual.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmLeave();
              }}
            >
              Salir igualmente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
