import { cookies, headers } from "next/headers"
import {
  LOCALE_COOKIE_NAME,
  localeFromAcceptLanguage,
  parseLocale,
  type Locale,
} from "@/lib/i18n/config"
import { type TranslationValues, translate } from "@/lib/i18n/translate"

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const localeFromCookie = parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value)
  if (localeFromCookie) return localeFromCookie

  const headerStore = await headers()
  return localeFromAcceptLanguage(headerStore.get("accept-language"))
}

export async function getServerTranslator() {
  const locale = await getServerLocale()

  return {
    locale,
    t: (key: string, values?: TranslationValues) => translate(locale, key, values),
  }
}
