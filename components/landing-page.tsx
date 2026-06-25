import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Shield, Activity, Target, CheckCircle2, ArrowRight, Clock3, Database } from "lucide-react";

export function LandingPage() {
	const features = [
		{
			icon: Activity,
			title: "Registro de partidos",
			description: "Captura goles, asistencias, exclusiones, paradas, superioridades y mucho más, con una interfaz rápida y clara."
		},
		{
			icon: Users,
			title: "Gestión de jugadores",
			description: "Consulta perfiles completos, histórico de rendimiento, progresión individual y comparativas entre jugadores."
		},
		{
			icon: BarChart3,
			title: "Analítica avanzada",
			description: "Visualiza tendencias, ratios clave y métricas de equipo para convertir datos en decisiones deportivas."
		},
		{
			icon: Shield,
			title: "Multi-club seguro",
			description: "Administra varios clubes o categorías desde una sola plataforma, con datos aislados y permisos controlados."
		},
		{
			icon: Target,
			title: "Roles y permisos",
			description: "Define accesos por perfil: administración, cuerpo técnico, analistas o visualización únicamente."
		},
		{
			icon: TrendingUp,
			title: "Seguimiento temporal",
			description: "Analiza la evolución del equipo a lo largo de la temporada y detecta patrones de mejora o caída de rendimiento."
		}
	];

	const benefits = [
		"Centraliza toda la información del club en un solo lugar",
		"Ahorra tiempo en el registro y consulta de estadísticas",
		"Mejora el análisis del rendimiento individual y colectivo",
		"Facilita decisiones técnicas basadas en datos reales"
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
								alt="Logo WaterpoloStats"
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
							Funcionalidades
						</Link>
						<Link href="#benefits" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
							Beneficios
						</Link>
						<Link href="#cta" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
							Acceso
						</Link>
					</nav>

					<div className="flex items-center gap-3">
						<Button asChild variant="outline" className="hidden sm:inline-flex">
							<a href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats">Solicitar demo</a>
						</Button>

						<Button asChild>
							<Link href="/auth/login">Acceder</Link>
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
								Plataforma profesional para clubes de waterpolo
							</div>

							<h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
								Las estadísticas de tu club, <span className="text-primary">claras, centralizadas y accionables</span>
							</h1>

							<p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
								Registra partidos, analiza jugadores y toma decisiones con datos reales. Todo en una única plataforma diseñada para el
								día a día del waterpolo.
							</p>

							<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
								<Button asChild size="lg" className="text-base px-8">
									<Link href="/auth/login">
										Acceder a la plataforma
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>

								<Button asChild size="lg" variant="outline" className="text-base px-8 bg-background/60">
									<a href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats">Solicitar demo</a>
								</Button>
							</div>

							<div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>Estadísticas en tiempo real</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>Gestión multi-equipo</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>Histórico por jugador</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>Control de acceso por roles</span>
								</div>
							</div>
						</div>

						<div className="relative">
							<div className="rounded-3xl border bg-card p-4 shadow-2xl shadow-primary/10">
								<div className="rounded-2xl border bg-background p-5">
									<div className="mb-4 flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">Resumen del equipo</p>
											<h3 className="text-xl font-semibold">Equipo 1</h3>
										</div>
										<div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Temporada 2025/26</div>
									</div>

									<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Activity className="h-4 w-4" />
													<span className="text-xs">Partidos</span>
												</div>
												<p className="mt-3 text-2xl font-bold">28</p>
											</CardContent>
										</Card>

										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Target className="h-4 w-4" />
													<span className="text-xs">Goles</span>
												</div>
												<p className="mt-3 text-2xl font-bold">312</p>
											</CardContent>
										</Card>

										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Users className="h-4 w-4" />
													<span className="text-xs">Jugadores</span>
												</div>
												<p className="mt-3 text-2xl font-bold">21</p>
											</CardContent>
										</Card>

										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<div className="flex items-center gap-2 text-muted-foreground">
													<TrendingUp className="h-4 w-4" />
													<span className="text-xs">Victorias</span>
												</div>
												<p className="mt-3 text-2xl font-bold">71%</p>
											</CardContent>
										</Card>
									</div>

									<div className="mt-5 grid gap-4 md:grid-cols-2">
										<Card className="rounded-2xl border shadow-none">
											<CardContent className="p-4">
												<p className="text-sm font-medium">Rendimiento reciente</p>
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
												<p className="text-sm font-medium">Indicadores clave</p>
												<div className="mt-4 space-y-4">
													<div>
														<div className="mb-1 flex justify-between text-xs text-muted-foreground">
															<span>Eficacia ofensiva</span>
															<span>78%</span>
														</div>
														<div className="h-2 rounded-full bg-muted">
															<div className="h-2 w-[78%] rounded-full bg-primary" />
														</div>
													</div>

													<div>
														<div className="mb-1 flex justify-between text-xs text-muted-foreground">
															<span>Paradas del portero</span>
															<span>69%</span>
														</div>
														<div className="h-2 rounded-full bg-muted">
															<div className="h-2 w-[69%] rounded-full bg-primary" />
														</div>
													</div>

													<div>
														<div className="mb-1 flex justify-between text-xs text-muted-foreground">
															<span>Superioridades convertidas</span>
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
										<p className="text-sm font-medium">Actualización instantánea</p>
										<p className="text-xs text-muted-foreground">Datos disponibles al momento</p>
									</div>
								</div>
							</div>

							<div className="absolute -right-5 -top-5 hidden rounded-2xl border bg-background p-4 shadow-lg md:block">
								<div className="flex items-center gap-3">
									<div className="rounded-xl bg-primary/10 p-2">
										<Database className="h-5 w-5 text-primary" />
									</div>
									<div>
										<p className="text-sm font-medium">Histórico centralizado</p>
										<p className="text-xs text-muted-foreground">Toda la temporada en un solo panel</p>
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
							<p className="text-3xl font-bold tracking-tight md:text-4xl">Multi-club</p>
							<p className="mt-2 text-muted-foreground">Gestiona varios equipos y categorías desde un mismo entorno</p>
						</div>
						<div>
							<p className="text-3xl font-bold tracking-tight md:text-4xl">Tiempo real</p>
							<p className="mt-2 text-muted-foreground">Actualización inmediata para seguimiento técnico y análisis</p>
						</div>
						<div>
							<p className="text-3xl font-bold tracking-tight md:text-4xl">Analítica</p>
							<p className="mt-2 text-muted-foreground">Convierte estadísticas en decisiones deportivas más precisas</p>
						</div>
					</div>
				</div>
			</section>

			{/* Features */}
			<section id="features" className="container mx-auto px-4 py-20 md:py-24">
				<div className="mx-auto max-w-6xl">
					<div className="mx-auto max-w-3xl text-center">
						<h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
							Todo lo que necesitas para gestionar tu equipo
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							Herramientas diseñadas específicamente para la realidad diaria de los clubes de waterpolo.
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
								Menos intuición. Más decisiones basadas en datos.
							</h2>
							<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
								La plataforma te ayuda a profesionalizar el análisis del rendimiento, simplificar la gestión y dar contexto real a
								cada partido y cada jugador.
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
								<p className="text-sm font-medium text-primary">Pensado para</p>
								<h3 className="mt-2 text-2xl font-semibold tracking-tight">Clubes, entrenadores y analistas</h3>
								<p className="mt-3 leading-relaxed text-muted-foreground">
									Desde el seguimiento de categorías base hasta el análisis competitivo del primer equipo.
								</p>

								<div className="mt-8 grid gap-4 sm:grid-cols-2">
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">Entrenadores</p>
										<p className="mt-1 text-sm text-muted-foreground">Evalúa rendimiento y detecta áreas de mejora.</p>
									</div>
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">Coordinación deportiva</p>
										<p className="mt-1 text-sm text-muted-foreground">Centraliza datos de todos los equipos.</p>
									</div>
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">Analistas</p>
										<p className="mt-1 text-sm text-muted-foreground">Explora patrones, comparativas y evolución.</p>
									</div>
									<div className="rounded-2xl bg-muted p-4">
										<p className="font-medium">Clubes multi-sede</p>
										<p className="mt-1 text-sm text-muted-foreground">Trabaja con estructura segura y escalable.</p>
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
							Empieza a gestionar tu club con una visión mucho más clara
						</h2>
						<p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed opacity-90">
							Accede a una plataforma creada para convertir estadísticas dispersas en información útil para competir mejor.
						</p>

						<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
							<Button asChild size="lg" variant="secondary" className="text-base px-8">
								<Link href="/auth/login">
									Acceder a la plataforma
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>

							<Button
								asChild
								size="lg"
								variant="outline"
								className="border-primary-foreground/30 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
							>
								<a href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats">Solicitar demo</a>
							</Button>
						</div>

						<p className="mt-4 text-sm opacity-80">
							¿Aún no tienes acceso? Solicita una demo personalizada y descubre la plataforma en acción.
						</p>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t">
				<div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
					<p>© 2026 WaterpoloStats. Plataforma de gestión y análisis para clubes de waterpolo.</p>
				</div>
			</footer>
		</div>
	);
}
