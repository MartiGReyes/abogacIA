import es from "./locales/es-AR.json" with { type: "json" }
import en from "./locales/en.json" with { type: "json" }
import pt from "./locales/pt-BR.json" with { type: "json" }
import fr from "./locales/fr.json" with { type: "json" }
import it from "./locales/it.json" with { type: "json" }
import de from "./locales/de.json" with { type: "json" }
import labels from "./labels.json" with { type: "json" }

export const languages = [
  { locale: "es-AR", code: "ES", name: "Español (Argentina)" },
  { locale: "en", code: "EN", name: "English" },
  { locale: "pt-BR", code: "PT", name: "Português (Brasil)" },
  { locale: "fr", code: "FR", name: "Français" },
  { locale: "it", code: "IT", name: "Italiano" },
  { locale: "de", code: "DE", name: "Deutsch" },
] as const
export type Locale = typeof languages[number]["locale"]
export type MessageKey = keyof typeof es
export type Parameters = Record<string, string | number>
export const STORAGE_KEY = "abogacia.language"
export const TIME_ZONE = "America/Argentina/Cordoba"
export const catalogs: Record<Locale, Record<string, string>> = {
  "es-AR": es,
  en,
  "pt-BR": pt,
  fr,
  it,
  de,
}
export const isLocale = (value: unknown): value is Locale =>
  languages.some((language) => language.locale === value)
function initialLocale(): Locale {
  try {
    const saved =
      typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)
    return isLocale(saved) ? saved : "es-AR"
  } catch {
    return "es-AR"
  }
}
let locale = initialLocale()
const listeners = new Set<() => void>()
export const getLocale = () => locale
export const intlLocale = (language = locale) =>
  language === "en" ? "en-US" : language
const own = (record: object, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key)
export function translate(
  key: string,
  language: Locale,
  params: Parameters = {},
): string {
  if (typeof params.count === "number") {
    const category = new Intl.PluralRules(intlLocale(language)).select(
      params.count,
    )
    if (own(catalogs[language], `${key}.${category}`))
      key = `${key}.${category}`
  }
  const template = own(catalogs[language], key)
    ? catalogs[language][key]
    : own(catalogs["es-AR"], key)
      ? catalogs["es-AR"][key]
      : key
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined
      ? match
      : typeof params[name] === "number"
        ? new Intl.NumberFormat(intlLocale(language)).format(params[name])
        : String(params[name]),
  )
}
const DEFERRED = "abogacia:i18n:"
/** Keeps transient errors/notifications translatable without replacing form state. */
export function message(key: MessageKey, params: Parameters = {}) {
  return DEFERRED + JSON.stringify({ key, params })
}
export function t(key: string, params: Parameters = {}): string {
  if (key.startsWith(DEFERRED)) {
    try {
      const deferred = JSON.parse(key.slice(DEFERRED.length)) as {
        key: string
        params: Parameters
      }
      return translate(
        deferred.key,
        locale,
        Object.fromEntries(
          Object.entries(deferred.params).map(([name, value]) => [
            name,
            typeof value === "string" && (name === "status" || name === "role")
              ? uiText(value)
              : value,
          ]),
        ),
      )
    } catch {
      return key
    }
  }
  return translate(key, locale, params)
}
/** Only registered UI keys and canonical enum labels are translated, never arbitrary prose. */
export function uiText(value: string): string {
  if (typeof value !== "string") return value
  const key = own(labels, value)
    ? (labels as Record<string, string>)[value]
    : value
  return t(key)
}
export const subscribeLocale = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function applyDocumentLanguage() {
  if (typeof document === "undefined") return
  document.documentElement.lang = locale
  document.title = t("metadata.title")
}
// Optional adapter for a future authenticated preference service; no auth coupling.
let preferenceWriter: ((locale: Locale) => void | Promise<void>) | undefined
export function registerLanguagePreferenceWriter(
  writer?: typeof preferenceWriter,
) {
  preferenceWriter = writer
  return () => {
    if (preferenceWriter === writer) preferenceWriter = undefined
  }
}
export function setLocale(next: Locale, persist = true) {
  if (!isLocale(next)) return
  const changed = next !== locale
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    const writePreference = preferenceWriter
    if (writePreference)
      Promise.resolve()
        .then(() => writePreference(next))
        .catch(() => {})
  }
  if (!changed) return
  locale = next
  applyDocumentLanguage()
  listeners.forEach((listener) => listener())
}
if (typeof window !== "undefined") {
  applyDocumentLanguage()
  window.addEventListener("storage", (event) => {
    if (event.storageArea && event.storageArea !== window.localStorage) return
    if (event.key === STORAGE_KEY || event.key === null)
      setLocale(isLocale(event.newValue) ? event.newValue : "es-AR", false)
  })
}
export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(intlLocale(), options).format(value)
export const formatMoney = (value: number) =>
  formatNumber(value, {
    style: "currency",
    currency: "ARS",
    currencyDisplay: locale === "es-AR" ? "symbol" : "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value.includes("T") ? value : `${value}T12:00:00-03:00`))
export const formatMonth = (value: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T12:00:00-03:00`))
export function formatFee(source: string) {
  const value = Number(
    source
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  )
  return Number.isFinite(value) && /\d/.test(source)
    ? formatMoney(value)
    : source
}
/** Prepared for a future model integration; the current assistant remains rule-based. */
export function lexiLanguageContext() {
  return {
    locale,
    language: languages.find((language) => language.locale === locale)!.name,
    instruction: `Respond in ${languages.find((language) => language.locale === locale)!.name}. Keep names, professional licence numbers and quoted user content unchanged. Argentine jurisdiction and ARS currency remain unchanged.`,
  }
}
