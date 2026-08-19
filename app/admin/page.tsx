import { requireAuth, getCurrentProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserManagementForm } from "@/components/user-management-form"

import { Shield, Users, Building2 } from "lucide-react"
import { ClubManagementForm } from "@/components/admin-settings/ClubManagementForm"
import { getLocale, getTranslations } from "next-intl/server"

export default async function AdminPage() {
  const t = await getTranslations("Admin")
  const locale = await getLocale()
  await requireAuth()
  const profile = await getCurrentProfile()

  // Only super admins can access this page
  if (!profile?.is_super_admin) {
    redirect("/")
  }

  const supabase = await createClient()
  if (!supabase) {
    return <div>{t("configurationError")}</div>
  }

  // Get all users
  const { data: users } = await supabase
    .from("profiles")
    .select("*, clubs:club_id(name, short_name)")
    .order("created_at", { ascending: false })

  // Get all clubs
  const { data: clubs } = await supabase.from("clubs").select("*").order("name")

  // Get all competitions (para el formulario de crear club)
  const { data: competitions } = await supabase.from("competitions").select("*").order("name")

  // Get statistics
  const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  const { count: totalClubs } = await supabase.from("clubs").select("*", { count: "exact", head: true })

  const roleLabels: Record<string, string> = {
    admin: t("roles.admin"),
    coach: t("roles.coach"),
    viewer: t("roles.viewer"),
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalClubs")}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClubs || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("superAdmins")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.filter((u) => u.is_super_admin).length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Club Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("createClubTitle")}</CardTitle>
          <CardDescription>{t("createClubDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ClubManagementForm competitions={competitions || []} />
        </CardContent>
      </Card>

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("createUserTitle")}</CardTitle>
          <CardDescription>{t("createUserDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementForm clubs={clubs || []} />
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("registeredUsers", { count: users?.length || 0 })}</CardTitle>
          <CardDescription>{t("usersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.full_name || user.email}</p>
                    {user.is_super_admin && (
                      <Badge variant="destructive" className="text-xs">
                        {t("superAdmin")}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.clubs && (
                    <p className="text-sm text-muted-foreground">
                      {t("clubLabel")} <span className="font-medium">{user.clubs.short_name}</span>
                    </p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat(locale).format(new Date(user.created_at))}
                </div>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">{t("noUsers")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
