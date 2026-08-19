import {getRequestConfig} from "next-intl/server"
import {cookies} from "next/headers"

import en from "@/messages/en.json"
import es from "@/messages/es.json"
import {isAppLocale, routing, type AppLocale} from "@/i18n/routing"

const messages: Record<AppLocale, typeof es> = {es, en}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value
  const locale = isAppLocale(cookieLocale) ? cookieLocale : routing.defaultLocale

  return {
    locale,
    timeZone: "Europe/Madrid",
    messages: messages[locale],
  }
})
