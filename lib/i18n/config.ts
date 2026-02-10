export const SUPPORTED_LOCALES = ["th", "en"] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "th"
export const LOCALE_COOKIE_NAME = "rmu_locale"
export const LOCALE_STORAGE_KEY = "rmu_locale"
export const LOCALE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function parseLocale(value: string | null | undefined): Locale | null {
  if (!value) return null
  const baseLocale = value.trim().toLowerCase().split("-")[0]
  return baseLocale && isLocale(baseLocale) ? baseLocale : null
}

export function resolveLocale(value: string | null | undefined): Locale {
  return parseLocale(value) ?? DEFAULT_LOCALE
}

export function localeFromAcceptLanguage(headerValue: string | null | undefined): Locale {
  if (!headerValue) return DEFAULT_LOCALE

  const weightedLocales = headerValue
    .split(",")
    .map((entry, index) => {
      const [rawLocale, ...params] = entry.trim().split(";")
      const locale = parseLocale(rawLocale)
      if (!locale) return null

      const qParam = params.find((param) => param.trim().startsWith("q="))
      const qValue = qParam ? Number(qParam.trim().slice(2)) : 1
      const weight = Number.isFinite(qValue) ? qValue : 1

      return { locale, weight, index }
    })
    .filter((item): item is { locale: Locale; weight: number; index: number } => item !== null)

  if (weightedLocales.length === 0) return DEFAULT_LOCALE

  weightedLocales.sort((a, b) => b.weight - a.weight || a.index - b.index)
  return weightedLocales[0]?.locale ?? DEFAULT_LOCALE
}
