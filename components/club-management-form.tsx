"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export function ClubManagementForm() {
  const t = useTranslations("AdminForms")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      shortName: formData.get("short_name") as string,
      logoUrl: (formData.get("logo_url") as string) || null,
      primaryColor: formData.get("primary_color") as string,
      secondaryColor: formData.get("secondary_color") as string,
      competitionIds: [],
    }

    try {
      const response = await fetch("/api/admin/create-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(t("clubCreateError"))
      }

      setSuccess(t("clubCreatedGeneric"))
      e.currentTarget.reset()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("clubCreateError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" placeholder={t("clubNamePlaceholder")} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="short_name">{t("shortName")}</Label>
          <Input id="short_name" name="short_name" placeholder={t("clubShortNamePlaceholder")} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo_url">{t("logoUrl")}</Label>
          <Input id="logo_url" name="logo_url" type="url" placeholder={t("logoPlaceholder")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary_color">{t("primaryColor")}</Label>
          <div className="flex gap-2">
            <Input id="primary_color" name="primary_color" type="color" defaultValue="#1e40af" className="w-20" />
            <Input type="text" placeholder="#1e40af" className="flex-1" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondary_color">{t("secondaryColor")}</Label>
          <div className="flex gap-2">
            <Input id="secondary_color" name="secondary_color" type="color" defaultValue="#dc2626" className="w-20" />
            <Input type="text" placeholder="#dc2626" className="flex-1" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-md">
          {success}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? t("creating") : t("createClub")}
      </Button>
    </form>
  )
}
