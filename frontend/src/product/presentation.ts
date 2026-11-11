import { formatDate, formatFee, t, uiText } from "../i18n/core.ts"

/** Localize units and structured values, never names, identifiers or authored prose. */
export function profileValue(label: string, value: string) {
  if (label === "auth.dateOfBirth" && value) {
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    const iso = dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : value
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso)))
      return formatDate(iso)
  }
  if (label === "auth.age" || label === "auth.experience") {
    const years = /^(\d+)\s+años?$/.exec(value)
    if (years) return t("common.years", { count: Number(years[1]) })
  }
  if (label === "auth.indicativeFees") return formatFee(value)
  if (label === "auth.gender" || label === "auth.identity") return uiText(value)
  return value
}
