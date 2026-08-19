import {defineRouting} from "next-intl/routing"

export const locales = ["es", "en"] as const
export type AppLocale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: "es",
  localePrefix: "never",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
})

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && locales.some((locale) => locale === value)
}
