import { requireAuth, getCurrentProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserManagementForm } from "@/components/user-management-form"
import { Users, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function UsersManagementPage() {
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

  // Get all users
  const { data: users } = await supabase
    .from("profiles")
    .select("*, clubs:club_id(name, short_name)")
    .order("created_at", { ascending: false })

  // Get all clubs for the form
  const { data: clubs } = await supabase.from("clubs").select("*").order("name")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Crea y administra usuarios del sistema</p>
        </div>
      </div>

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevo Usuario</CardTitle>
          <CardDescription>
            Crea usuarios y asígnalos a clubes específicos con sus roles correspondientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementForm clubs={clubs || []} />
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados ({users?.length || 0})</CardTitle>
          <CardDescription>Lista de todos los usuarios del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name || user.email}</p>
                      {user.is_super_admin && (
                        <Badge variant="destructive" className="text-xs">
                          Super Admin
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.clubs && (
                      <p className="text-sm text-muted-foreground">
                        Club: <span className="font-medium">{user.clubs.short_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("es-ES")}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay usuarios registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
