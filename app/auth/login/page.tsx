"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
	AlertCircle,
	BarChart3,
	CheckCircle2,
	Eye,
	EyeOff,
	Loader2,
	ShieldCheck,
	Target,
	type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function ProductFeature({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
			<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200">
				<Icon className="size-4.5" aria-hidden="true" />
			</span>
			<span className="text-sm font-medium text-white/85">{label}</span>
		</div>
	);
}

export default function LoginPage() {
	const t = useTranslations("Auth");
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			const { data, error: loginError } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});

			if (loginError) throw loginError;

			if (data.session) {
				router.replace("/");
				router.refresh();
				return;
			}

			setError(t("loginFailed"));
			setIsLoading(false);
		} catch {
			setError(t("invalidCredentials"));
			setIsLoading(false);
		}
	};

	return (
		<main className="relative h-dvh overflow-hidden bg-background text-foreground">
			<div
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.11),transparent_28%),radial-gradient(circle_at_88%_92%,rgba(37,99,235,0.1),transparent_30%)]"
				aria-hidden="true"
			/>

			<div className="absolute right-3 top-3 z-30 flex items-center gap-2 sm:right-5 sm:top-5">
				<LanguageSelector />
				<ThemeToggle />
			</div>

			<div className="relative grid h-full lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
				<section className="relative hidden overflow-hidden bg-slate-950 px-10 py-9 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
					<div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-blue-600/25 blur-3xl" aria-hidden="true" />
					<div className="pointer-events-none absolute -bottom-44 -right-24 size-[30rem] rounded-full bg-cyan-400/15 blur-3xl" aria-hidden="true" />
					<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px]" />

					<div className="relative z-10 flex items-center gap-3">
						<div className="size-12 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-blue-950/40">
							<Image src="/icons/icon-192.png" alt="" width={48} height={48} priority className="size-full object-cover" />
						</div>
						<div>
							<p className="text-lg font-bold tracking-tight">WaterpoloStats</p>
							<p className="text-xs text-slate-400">{t("tagline")}</p>
						</div>
					</div>

					<div className="relative z-10 my-auto max-w-2xl py-8">
						<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
							<BarChart3 className="size-3.5" aria-hidden="true" />
							{t("heroBadge")}
						</div>
						<h1 className="max-w-xl text-balance text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">{t("heroTitle")}</h1>
						<p className="mt-5 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">{t("heroDescription")}</p>

						<div className="mt-8 grid max-w-xl gap-3 xl:grid-cols-2">
							<ProductFeature icon={BarChart3} label={t("features.analysis")} />
							<ProductFeature icon={Target} label={t("features.decisions")} />
							<ProductFeature icon={ShieldCheck} label={t("features.control")} />
						</div>
					</div>

					<div className="relative z-10 flex items-end justify-between gap-6">
						<p className="max-w-xs text-xs leading-5 text-slate-500">
							{t("poweredBy")} <span className="font-semibold text-slate-300">TFT</span> &amp; <span className="font-semibold text-slate-300">BWMF</span>
						</p>
						<div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5">
							<Image src="/images/logo-sponsor/TFT_LOGO.webp" alt="TFT" width={50} height={50} className="h-8 w-auto object-contain invert brightness-0 contrast-200" />
							<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={82} height={32} className="h-7 w-auto object-contain" />
						</div>
					</div>
				</section>

				<section className="flex h-full min-w-0 items-center justify-center px-3 pb-3 pt-16 sm:px-6 sm:pb-6 sm:pt-20 lg:px-8 lg:py-8">
					<div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500 [@media(max-height:600px)]:scale-[0.92]">
						<Card className="gap-0 overflow-hidden border-border/80 bg-card/95 py-0 shadow-2xl shadow-slate-950/10 backdrop-blur-xl sm:gap-0 sm:py-0 dark:shadow-black/30">
							<div className="flex items-center gap-3 border-b bg-muted/35 px-4 py-3 sm:px-6 lg:hidden">
								<div className="size-10 overflow-hidden rounded-xl border bg-background shadow-sm">
									<Image src="/icons/icon-192.png" alt="" width={40} height={40} priority className="size-full object-cover" />
								</div>
								<div className="min-w-0">
									<p className="truncate font-bold tracking-tight">WaterpoloStats</p>
									<p className="truncate text-xs text-muted-foreground">{t("tagline")}</p>
								</div>
							</div>

							<CardContent className="p-4 sm:p-6 [@media(max-height:650px)]:p-4">
								<div className="mb-5 [@media(max-height:650px)]:mb-3">
									<p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.16em] text-primary lg:block">WaterpoloStats</p>
									<h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
									<p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
								</div>

								<form onSubmit={handleLogin} className="space-y-4 [@media(max-height:650px)]:space-y-3">
									{searchParams.get("reset") === "success" ? (
										<Alert className="py-2.5">
											<CheckCircle2 className="size-4" />
											<AlertDescription>{t("passwordUpdated")}</AlertDescription>
										</Alert>
									) : null}

									<div className="space-y-1.5">
										<Label htmlFor="email">{t("email")}</Label>
										<Input id="email" type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} autoComplete="email" className="h-11 bg-background/80" required />
									</div>

									<div className="space-y-1.5">
										<div className="flex items-center justify-between gap-3">
											<Label htmlFor="password">{t("password")}</Label>
											<Link href="/auth/forgot-password" className="text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline sm:text-sm">
												{t("forgotPassword")}
											</Link>
										</div>
										<div className="relative">
											<Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} autoComplete="current-password" className="h-11 bg-background/80 pr-11" required />
											<button
												type="button"
												onClick={() => setShowPassword((visible) => !visible)}
												aria-label={showPassword ? t("hidePassword") : t("showPassword")}
												className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
											>
												{showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
											</button>
										</div>
									</div>

									{error ? (
										<Alert variant="destructive" className="py-2.5">
											<AlertCircle className="size-4" />
											<AlertDescription>{error}</AlertDescription>
										</Alert>
									) : null}

									<Button type="submit" className="h-11 w-full font-semibold shadow-sm" disabled={isLoading || !email.trim() || !password.trim()}>
										{isLoading ? (
											<span className="flex items-center gap-2">
												<Loader2 className="size-4 animate-spin" />
												{t("signingIn")}
											</span>
										) : (
											t("signIn")
										)}
									</Button>
								</form>

								<p className="mt-4 text-center text-sm text-muted-foreground [@media(max-height:650px)]:mt-3">
									{t("noAccess")} {" "}
									<a href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats" className="font-semibold text-primary underline underline-offset-4">
										{t("requestDemo")}
									</a>
								</p>
							</CardContent>

							<div className="flex items-center justify-center gap-4 border-t bg-muted/25 px-4 py-3 lg:hidden [@media(max-height:650px)]:hidden">
								<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("poweredBy")}</span>
								<Image src="/images/logo-sponsor/TFT_LOGO.webp" alt="TFT" width={38} height={38} className="h-7 w-auto object-contain dark:invert dark:brightness-0 dark:contrast-200" />
								<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={68} height={26} className="h-6 w-auto object-contain" />
							</div>
						</Card>
					</div>
				</section>
			</div>
		</main>
	);
}
