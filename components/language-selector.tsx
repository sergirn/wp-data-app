"use client"

import {useLocale, useTranslations} from "next-intl"
import {useRouter} from "next/navigation"
import {startTransition} from "react"
import {Languages} from "lucide-react"

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {isAppLocale, type AppLocale} from "@/i18n/routing"

export function LanguageSelector() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("LanguageSwitcher")

  const changeLocale = (nextLocale: string) => {
    if (!isAppLocale(nextLocale) || nextLocale === locale) return

    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
    document.documentElement.lang = nextLocale
    startTransition(() => router.refresh())
  }

  return (
    <Select value={locale} onValueChange={changeLocale}>
      <SelectTrigger className="h-9 w-[82px] gap-1 rounded-full px-2" aria-label={t("label")}>
        <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="es">{t("spanishOption")}</SelectItem>
        <SelectItem value="en">{t("englishOption")}</SelectItem>
      </SelectContent>
    </Select>
  )
}
