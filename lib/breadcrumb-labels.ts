import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config"
import { translate } from "@/lib/i18n/translate"

function isLikelyId(segment: string): boolean {
  return (segment.length > 15 && !segment.includes("-")) || /^\d+$/.test(segment)
}

function getTranslatedRouteLabel(segment: string, locale: Locale): string | null {
  const messageKey = `breadcrumb.routes.${segment}`
  const translated = translate(locale, messageKey)
  if (translated === messageKey) return null
  return translated
}

export function getLabelForSegment(segment: string, locale: Locale = DEFAULT_LOCALE): string {
  if (isLikelyId(segment)) return translate(locale, "breadcrumb.detail")
  return getTranslatedRouteLabel(segment, locale) ?? segment
}

export function getLabelForPath(pathname: string, locale: Locale = DEFAULT_LOCALE): string {
  if (pathname === "/") return translate(locale, "breadcrumb.home")
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1]
  return last ? getLabelForSegment(last, locale) : translate(locale, "breadcrumb.home")
}

export function pathToHistoryEntries(
  pathname: string,
  locale: Locale = DEFAULT_LOCALE
): { path: string; label: string }[] {
  if (!pathname || pathname === "/") {
    return [{ path: "/", label: translate(locale, "breadcrumb.home") }]
  }

  const segments = pathname.split("/").filter(Boolean)
  const entries: { path: string; label: string }[] = [
    { path: "/", label: translate(locale, "breadcrumb.home") },
  ]
  let accumulatedPath = ""

  for (const segment of segments) {
    accumulatedPath += (accumulatedPath ? "/" : "/") + segment
    entries.push({ path: accumulatedPath, label: getLabelForSegment(segment, locale) })
  }

  return entries
}
