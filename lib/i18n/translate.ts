import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config"
import { MESSAGES } from "@/lib/i18n/messages"

export type TranslationValues = Record<string, string | number>

class TranslationService {
  private getValueByKey(locale: Locale, key: string): unknown {
    const pathSegments = key.split(".")
    let cursor: unknown = MESSAGES[locale]

    for (const segment of pathSegments) {
      if (typeof cursor !== "object" || cursor === null || !(segment in cursor)) {
        return undefined
      }
      cursor = (cursor as Record<string, unknown>)[segment]
    }

    return cursor
  }

  private interpolate(template: string, values?: TranslationValues): string {
    if (!values) return template

    return template.replace(/\{(\w+)\}/g, (_, token: string) => {
      const replacement = values[token]
      return replacement == null ? `{${token}}` : String(replacement)
    })
  }

  translate(locale: Locale, key: string, values?: TranslationValues): string {
    const localeValue = this.getValueByKey(locale, key)
    const fallbackValue = this.getValueByKey(DEFAULT_LOCALE, key)

    const message =
      typeof localeValue === "string"
        ? localeValue
        : typeof fallbackValue === "string"
          ? fallbackValue
          : key

    return this.interpolate(message, values)
  }
}

const translationService = new TranslationService()

export function translate(locale: Locale, key: string, values?: TranslationValues): string {
  return translationService.translate(locale, key, values)
}
