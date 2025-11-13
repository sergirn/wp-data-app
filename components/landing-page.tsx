import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, Users, TrendingUp, Shield, Activity, Target } from "lucide-react"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance leading-tight">
            Gestión completa de estadísticas de waterpolo
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 text-pretty leading-relaxed">
            Plataforma profesional para clubes de waterpolo. Registra partidos, analiza rendimiento y toma decisiones
            basadas en datos reales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 bg-transparent">
              <Link href="#features">Ver Funcionalidades</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">Multi-Club</div>
              <p className="text-muted-foreground">Gestión de múltiples equipos</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">Tiempo Real</div>
              <p className="text-muted-foreground">Estadísticas actualizadas al instante</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">Analytics</div>
              <p className="text-muted-foreground">Análisis avanzado de rendimiento</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-balance">
            Todo lo que necesitas para gestionar tu equipo
          </h2>
          <p className="text-xl text-muted-foreground text-center mb-16 text-pretty">
            Herramientas profesionales diseñadas específicamente para clubes de waterpolo
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Registro de Partidos</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Registra estadísticas completas de cada partido: goles, asistencias, exclusiones, paradas del portero
                  y más.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Gestión de Jugadores</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Perfil completo de cada jugador con estadísticas históricas, evolución y comparativas de rendimiento.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Analytics Avanzado</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gráficos interactivos, distribución de goles, tendencias por temporada y métricas de rendimiento del
                  equipo.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Multi-Club</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gestiona múltiples clubes desde una sola plataforma con datos completamente aislados y seguros.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Roles y Permisos</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sistema de roles (Admin, Entrenador, Visualizador) con permisos personalizados para cada usuario.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Seguimiento Temporal</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Analiza la evolución del equipo y jugadores a lo largo de la temporada con gráficos de tendencias.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">Empieza a gestionar tu club hoy mismo</h2>
          <p className="text-xl mb-8 text-pretty max-w-2xl mx-auto opacity-90">
            Únete a los clubes que ya están mejorando su rendimiento con datos profesionales
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8">
            <Link href="/auth/login">Acceder a la Plataforma</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 WaterpoloStats. Sistema de gestión profesional para clubes de waterpolo.</p>
        </div>
      </footer>
    </div>
  )
}
