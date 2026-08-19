import { requireAuth, getCurrentProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserManagementForm } from "@/components/user-management-form"
import { Users, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"

export default async function UsersManagementPage() {
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

  // Get all clubs for the form
  const { data: clubs } = await supabase.from("clubs").select("*").order("name")

  const roleLabels: Record<string, string> = {
    admin: t("roles.admin"),
    coach: t("roles.coach"),
    viewer: t("roles.viewer"),
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin" aria-label={t("backToAdmin")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{t("usersTitle")}</h1>
          <p className="text-muted-foreground">{t("usersSubtitle")}</p>
        </div>
      </div>

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
            {users && users.length > 0 ? (
              users.map((user) => (
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
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">{t("noUsers")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
