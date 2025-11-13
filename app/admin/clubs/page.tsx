import { requireAuth, getCurrentProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClubManagementForm } from "@/components/club-management-form"
import { Building2, ArrowLeft, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export default async function ClubsManagementPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  // Only super admins can access this page
  if (!profile?.is_super_admin) {
    redirect("/")
  }

  const supabase = await createClient()
  if (!supabase) {
    return <div>Error de configuración</div>
  }

  // Get all clubs with user count
  const { data: clubs } = await supabase.from("clubs").select("*, profiles(count)").order("name")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Gestión de Clubes</h1>
          <p className="text-muted-foreground">Crea y administra clubes del sistema</p>
        </div>
      </div>

      {/* Create Club Form */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevo Club</CardTitle>
          <CardDescription>Añade un nuevo club de waterpolo al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <ClubManagementForm />
        </CardContent>
      </Card>

      {/* Clubs List */}
      <Card>
        <CardHeader>
          <CardTitle>Clubes Registrados ({clubs?.length || 0})</CardTitle>
          <CardDescription>Lista de todos los clubes del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clubs && clubs.length > 0 ? (
              clubs.map((club) => (
                <div key={club.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    {club.logo_url && (
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <Image
                          src={club.logo_url || "/placeholder.svg"}
                          alt={club.short_name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{club.short_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{club.name}</p>
                    </div>
                  </div>

                  {club.description && <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>}

                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: club.primary_color }}
                        title="Color primario"
                      />
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: club.secondary_color }}
                        title="Color secundario"
                      />
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      <Users className="h-3 w-3 mr-1" />
                      {club.profiles?.[0]?.count || 0} usuarios
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8 col-span-full">No hay clubes registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
