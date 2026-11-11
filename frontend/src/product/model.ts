import { formatMoney, formatDate } from "../i18n/core"
export type { Page } from "../ui"

/** Usuario con sesión, armado a partir del JWT y del perfil del microservicio correspondiente. */
export interface SessionUser {
  nombre: string
  apellido: string
  email: string
  role: "citizen" | "lawyer" | "admin"
  cuentaPrueba?: boolean
}

/** Perfil público tal como lo devuelve /api/abogados/catalogo (ver contactoService.adaptarPerfil). */
export interface PerfilContacto {
  referencia: { tipo: string; id: string }
  idAbogado: number | string
  nombre: string
  apellido: string
  especialidades: string[]
  perfilPrueba: boolean
  contactoHabilitado: boolean
  telefonoEnmascarado?: string | null
  cuentaPrueba?: boolean
  matriculaVerificada?: boolean
  ubicacion?: string | null
  provincia?: string | null
  descripcionProfesional?: string | null
  honorarios?: number | string | null
  aniosExperiencia?: number | null
  colegioProfesional?: string | null
}

export interface Lawyer {
  id: string
  name: string
  initials: string
  specialty: string
  specialties: string[]
  location: string
  description: string
  fee: number | null
  years: number | null
  verified: boolean
  test: boolean
  contactEnabled: boolean
  maskedPhone: string | null
  college: string | null
  perfil: PerfilContacto
}

export function toLawyer(p: PerfilContacto): Lawyer {
  const fee = p.honorarios == null || p.honorarios === "" ? null : Number(p.honorarios)
  return {
    id: `${p.referencia.tipo}:${p.referencia.id}`,
    name: `${p.nombre} ${p.apellido ?? ""}`.trim(),
    initials: `${p.nombre?.[0] ?? ""}${p.apellido?.[0] ?? ""}`.toUpperCase(),
    specialty: p.especialidades[0] ?? "",
    specialties: p.especialidades,
    location: [p.ubicacion, p.provincia].filter(Boolean).join(", ") || "Córdoba",
    description: p.descripcionProfesional?.trim() || "",
    fee: fee != null && Number.isFinite(fee) ? fee : null,
    years: p.aniosExperiencia ?? null,
    verified: !p.perfilPrueba && !!p.matriculaVerificada,
    test: !!p.perfilPrueba,
    contactEnabled: !!p.contactoHabilitado,
    maskedPhone: p.telefonoEnmascarado ?? null,
    college: p.colegioProfesional ?? null,
    perfil: p,
  }
}

export interface ProfessionalCase {
  id?: number
  titulo: string
  area: string
  descripcion: string
  situacion: string
  intervencion: string
  resultado: string
  periodo: string
  imagenes: string[]
  publicado: boolean
  consentimiento: boolean
  actualizadoEn?: string
}

export interface ContactoGuardado {
  id: number
  idAbogado?: number
  abogado?: string
  especialidades?: string
  nombre: string
  telefono: string
  resumen: string
  creadoEn: string
}

export const AREAS = [
  "Derecho de Familia",
  "Derecho Laboral",
  "Derecho Penal",
  "Derecho Civil",
  "Derecho Comercial",
  "Derecho Inmobiliario",
  "Derecho Administrativo",
  "Derecho Tributario",
]

export const money = formatMoney
export const localDate = formatDate
export const localDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

export const dateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)

export const PERIODS = ["Hoy", "Esta semana", "Este mes", "Últimos 3 meses", "Este año", "Personalizado"] as const
export type Period = (typeof PERIODS)[number]
export interface DateRange {
  start: string
  end: string
}
export function periodRange(period: Period, custom: DateRange, today = dateKey()): DateRange {
  const d = new Date(`${today}T12:00:00Z`)
  if (period === "Personalizado") return custom
  if (period === "Hoy") return { start: today, end: today }
  if (period === "Esta semana") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  if (period === "Este mes") d.setUTCDate(1)
  if (period === "Últimos 3 meses") {
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() - 2)
  }
  if (period === "Este año") d.setUTCMonth(0, 1)
  return { start: d.toISOString().slice(0, 10), end: today }
}
export const inRange = (value: string | undefined, range: DateRange) => {
  if (!value) return false
  const k = dateKey(new Date(value))
  return k >= range.start && k <= range.end
}
