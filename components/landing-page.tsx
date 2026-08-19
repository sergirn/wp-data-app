import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Shield, Activity, Target, CheckCircle2, ArrowRight, Clock3, Database } from "lucide-react";
import { useTranslations } from "next-intl";

export function LandingPage() {
	const t = useTranslations("Landing");
	const features = [
		{
			icon: Activity,
			title: t("features.matchRecording.title"),
			description: t("features.matchRecording.description")
		},
		{
			icon: Users,
			title: t("features.playerManagement.title"),
			description: t("features.playerManagement.description")
		},
		{
			icon: BarChart3,
			title: t("features.advancedAnalytics.title"),
			description: t("features.advancedAnalytics.description")
		},
		{
			icon: Shield,
			title: t("features.secureMultiClub.title"),
			description: t("features.secureMultiClub.description")
		},
		{
			icon: Target,
			title: t("features.roles.title"),
			description: t("features.roles.description")
		},
		{
			icon: TrendingUp,
			title: t("features.tracking.title"),
			description: t("features.tracking.description")
		}
	];

	const benefits = [
		t("benefits.centralize"),
		t("benefits.saveTime"),
		t("benefits.improveAnalysis"),
		t("benefits.dataDecisions")
	];

	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* Header */}
			<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
						<div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border bg-card shadow-sm">
							<Image
								src="/icons/icon-192.png"
								alt={t("logoAlt")}
								width={40}
								height={40}
								className="h-full w-full object-cover"
								priority
							/>
						</div>
						<span className="text-lg">WaterpoloStats</span>
					</Link>

					<nav className="hidden items-center gap-6 md:flex">
						<Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
							{t("navFeatures")}
						</Link>
						<Link href="#benefits" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
							{t("navBenefits")}
						</Link>
						<Link href="#cta" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
							{t("navAccess")}
						</Link>
					</nav>

					<div className="flex items-center gap-3">
						<Button asChild variant="outline" className="hidden sm:inline-flex">
							<a href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats">{t("requestDemo")}</a>
						</Button>

						<Button asChild>
							<Link href="/auth/login">{t("signIn")}</Link>
						</Button>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="relative overflow-hidden">
				<div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-background to-background" />
				<div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

				<div className="container mx-auto px-4 py-20 md:py-28">
					<div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
						<div className="text-center lg:text-left">
							<div className="mb-6 inline-flex items-center rounded-full border bg-background/80 px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
								<CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
								{t("heroBadge")}
							</div>

							<h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
								{t("heroTitle")} <span className="text-primary">{t("heroHighlight")}</span>
							</h1>

							<p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
								{t("heroDescription")}
							</p>

							<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
								<Button asChild size="lg" className="text-base px-8">
									<Link href="/auth/login">
										{t("openPlatform")}
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>

								<Button asChild size="lg" variant="outline" className="text-base px-8 bg-background/60">
									<a href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats">{t("requestDemo")}</a>
								</Button>
							</div>

							<div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>{t("proofRealtime")}</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>{t("proofMultiTeam")}</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>{t("proofPlayerHistory")}</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>{t("proofRoleAccess")}</span>
								</div>
							</div>
						</div>

						<div className="relative">
							<div className="rounded-3xl border bg-card p-4 shadow-2xl shadow-primary/10">
								<div className="rounded-2xl border bg-background p-5">
									<div className="mb-4 flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">{t("teamSummary")}</p>
											<h3 className="text-xl font-semibold">{t("sampleTeam")}</h3>
										</div>
										<div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{t("sampleSeason")}</div>
									</div>

									<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Activity className="h-4 w-4" />
													<span className="text-xs">{t("matches")}</span>
												</div>
												<p className="mt-3 text-2xl font-bold">28</p>
											</CardContent>
										</Card>

										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Target className="h-4 w-4" />
													<span className="text-xs">{t("goals")}</span>
												</div>
												<p className="mt-3 text-2xl font-bold">312</p>
											</CardContent>
										</Card>

										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Users className="h-4 w-4" />
													<span className="text-xs">{t("players")}</span>
												</div>
												<p className="mt-3 text-2xl font-bold">21</p>
											</CardContent>
										</Card>

										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<TrendingUp className="h-4 w-4" />
													<span className="text-xs">{t("wins")}</span>
												</div>
												<p className="mt-3 text-2xl font-bold">71%</p>
											</CardContent>
										</Card>
									</div>

									<div className="mt-5 grid gap-4 md:grid-cols-2">
										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<p className="text-sm font-medium">{t("recentPerformance")}</p>
												<div className="mt-4 flex h-24 items-end gap-2">
													<div className="h-10 w-full rounded-t-md bg-primary/30" />
													<div className="h-14 w-full rounded-t-md bg-primary/50" />
													<div className="h-20 w-full rounded-t-md bg-primary/70" />
													<div className="h-16 w-full rounded-t-md bg-primary/50" />
													<div className="h-24 w-full rounded-t-md bg-primary" />
												</div>
											</CardContent>
										</Card>

										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<p className="text-sm font-medium">{t("keyIndicators")}</p>
												<div className="mt-4 space-y-4">
													<div>
														<div className="mb-1 flex justify-between text-xs text-muted-foreground">
															<span>{t("attackEfficiency")}</span>
															<span>78%</span>
														</div>
														<div className="h-2 rounded-full bg-muted">
															<div className="h-2 w-[78%] rounded-full bg-primary" />
														</div>
													</div>

													<div>
														<div className="mb-1 flex justify-between text-xs text-muted-foreground">
															<span>{t("goalkeeperSaves")}</span>
															<span>69%</span>
														</div>
														<div className="h-2 rounded-full bg-muted">
															<div className="h-2 w-[69%] rounded-full bg-primary" />
														</div>
													</div>

													<div>
														<div className="mb-1 flex justify-between text-xs text-muted-foreground">
															<span>{t("convertedAdvantages")}</span>
															<span>74%</span>
														</div>
														<div className="h-2 rounded-full bg-muted">
															<div className="h-2 w-[74%] rounded-full bg-primary" />
														</div>
													</div>
												</div>
											</CardContent>
										</Card>
									</div>
								</div>
							</div>

							<div className="absolute -bottom-5 -left-5 hidden rounded-2xl border bg-background p-4 shadow-lg md:block">
								<div className="flex items-center gap-3">
									<div className="rounded-xl bg-primary/10 p-2">
										<Clock3 className="h-5 w-5 text-primary" />
									</div>
									<div>
										<p className="text-sm font-medium">{t("instantUpdate")}</p>
										<p className="text-xs text-muted-foreground">{t("instantData")}</p>
									</div>
								</div>
							</div>

							<div className="absolute -right-5 -top-5 hidden rounded-2xl border bg-background p-4 shadow-lg md:block">
								<div className="flex items-center gap-3">
									<div className="rounded-xl bg-primary/10 p-2">
										<Database className="h-5 w-5 text-primary" />
									</div>
									<div>
										<p className="text-sm font-medium">{t("centralHistory")}</p>
										<p className="text-xs text-muted-foreground">{t("seasonInOnePanel")}</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Stats */}
			<section className="border-y bg-muted/30">
				<div className="container mx-auto px-4 py-14">
					<div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 text-center md:grid-cols-3">
						<div>
							<p className="text-3xl font-bold tracking-tight md:text-4xl">{t("statsMultiClubTitle")}</p>
							<p className="mt-2 text-muted-foreground">{t("statsMultiClubDescription")}</p>
						</div>
						<div>
							<p className="text-3xl font-bold tracking-tight md:text-4xl">{t("statsRealtimeTitle")}</p>
							<p className="mt-2 text-muted-foreground">{t("statsRealtimeDescription")}</p>
						</div>
						<div>
							<p className="text-3xl font-bold tracking-tight md:text-4xl">{t("statsAnalyticsTitle")}</p>
							<p className="mt-2 text-muted-foreground">{t("statsAnalyticsDescription")}</p>
						</div>
					</div>
				</div>
			</section>

			{/* Features */}
			<section id="features" className="container mx-auto px-4 py-20 md:py-24">
				<div className="mx-auto max-w-6xl">
					<div className="mx-auto max-w-3xl text-center">
						<h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
							{t("featuresTitle")}
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							{t("featuresDescription")}
						</p>
					</div>

					<div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
						{features.map((feature) => {
							const Icon = feature.icon;

							return (
								<Card
									key={feature.title}
									className="group rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
								>
									<CardContent className="p-7">
										<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
											<Icon className="h-6 w-6" />
										</div>
										<h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
										<p className="mt-3 leading-relaxed text-muted-foreground">{feature.description}</p>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			</section>

			{/* Benefits */}
			<section id="benefits" className="bg-muted/30 py-20 md:py-24">
				<div className="container mx-auto px-4">
					<div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
						<div>
							<h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
								{t("benefitsTitle")}
							</h2>
							<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
								{t("benefitsDescription")}
							</p>

							<div className="mt-8 space-y-4">
								{benefits.map((benefit) => (
									<div key={benefit} className="flex items-start gap-3">
										<CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
										<p className="text-base text-muted-foreground">{benefit}</p>
									</div>
								))}
							</div>
						</div>

						<Card className="rounded-3xl border bg-card shadow-lg">
							<CardContent className="p-8">
								<p className="text-sm font-medium text-primary">{t("designedFor")}</p>
								<h3 className="mt-2 text-2xl font-semibold tracking-tight">{t("audienceTitle")}</h3>
								<p className="mt-3 leading-relaxed text-muted-foreground">
									{t("audienceDescription")}
								</p>

								<div className="mt-8 grid gap-4 sm:grid-cols-2">
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">{t("coaches")}</p>
										<p className="mt-1 text-sm text-muted-foreground">{t("coachesDescription")}</p>
									</div>
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">{t("coordination")}</p>
										<p className="mt-1 text-sm text-muted-foreground">{t("coordinationDescription")}</p>
									</div>
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">{t("analysts")}</p>
										<p className="mt-1 text-sm text-muted-foreground">{t("analystsDescription")}</p>
									</div>
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">{t("multiSiteClubs")}</p>
										<p className="mt-1 text-sm text-muted-foreground">{t("multiSiteClubsDescription")}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section id="cta" className="py-20 md:py-24">
				<div className="container mx-auto px-4">
					<div className="mx-auto max-w-5xl rounded-[2rem] border bg-primary px-6 py-14 text-center text-primary-foreground shadow-2xl shadow-primary/20 md:px-12">
						<h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
							{t("ctaTitle")}
						</h2>
						<p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed opacity-90">
							{t("ctaDescription")}
						</p>

						<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
							<Button asChild size="lg" variant="secondary" className="text-base px-8">
								<Link href="/auth/login">
									{t("openPlatform")}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>

							<Button
								asChild
								size="lg"
								variant="outline"
								className="border-primary-foreground/30 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
							>
								<a href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats">{t("requestDemo")}</a>
							</Button>
						</div>

						<p className="mt-4 text-sm opacity-80">
							{t("ctaHint")}
						</p>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t">
				<div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
					<p>{t("footer")}</p>
				</div>
			</footer>
		</div>
	);
}
