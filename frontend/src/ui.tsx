// Componentes visuales compartidos, tomados del diseño de Figma Make (Responsive Legal Platform Design).
// Comparte componentes, íconos y rutas en un solo módulo, como el diseño original; solo afecta el fast refresh en desarrollo.
/* oxlint-disable react/only-export-components */
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logoImg from './imports/logoabogacIA.png'
import lexiImg from './imports/mazcotalexi.png'
import heroBg from './imports/caratula-V1.png'

export { logoImg, lexiImg, heroBg }

export type Page = 'home' | 'login' | 'register-citizen' | 'register-lawyer' | 'lawyer-pending' | 'verify-citizen' | 'profile' | 'history'

export const RUTAS: Record<Page, string> = {
  home: '/', login: '/iniciar-sesion', 'register-citizen': '/registro', 'register-lawyer': '/registro-abogado',
  'lawyer-pending': '/cuenta-profesional', 'verify-citizen': '/verificar-identidad-ciudadano', profile: '/mis-datos', history: '/historial',
}

/** Navega por nombre de página, como el diseño original, pero usando URLs reales (Didit vuelve a una URL). */
export function useNavegar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (p: Page) => {
    // Al cambiar de página se arranca arriba sin animación; en la misma página se sube suavemente.
    if (pathname === RUTAS[p]) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    navigate(RUTAS[p]); window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

/** Datos mínimos de la cuenta con sesión iniciada que muestra la barra de navegación. */
export interface User { nombre: string; apellido: string; email: string }

// ─── Shared UI ────────────────────────────────────────────────────────────────

/** Closes overlays with Escape while `active`. */
export function useEscape(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape)
  useEffect(() => { handler.current = onEscape })
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handler.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}

export const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

export const ICONS = {
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5 5-5-5 5-5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevron: 'M6 9l6 6 6-6',
  search: 'M20 20l-4.2-4.2M10.8 17.6a6.8 6.8 0 100-13.6 6.8 6.8 0 000 13.6z',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  shield: 'M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3zm-3 9l2 2 4-4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  logout: 'M15 16l4-4-4-4m4 4H9m4 8H6a2 2 0 01-2-2V6a2 2 0 012-2h7',
  chat: 'M4 5h16v11H8l-4 4V5z',
  scale: 'M12 4v16m-7 0h14M6 8l-3 6a3 3 0 006 0L6 8zm12 0l-3 6a3 3 0 006 0l-3-6zM5 8h14',
  idcard: 'M3 6h18v12H3zM7 10h4M7 14h6m4-4h.01',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8zm8 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  warn: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  info: 'M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zm9-13l4 4',
  trash: 'M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z',
  clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
  mail: 'M4 6h16v12H4V6zm0 1l8 6 8-6',
}

export function Icon({ name, className = 'w-5 h-5', stroke = 1.75 }: { name: keyof typeof ICONS; className?: string; stroke?: number }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} d={ICONS[name]} />
    </svg>
  )
}

/** The logo and Lexi ship as navy discs on white; crop them to the disc. */
export function Avatar({ src, alt = '', className }: { src: string; alt?: string; className: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}>
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover scale-[1.48]" />
    </span>
  )
}

export function Wordmark({ className = 'text-xl' }: { className?: string }) {
  return <span className={`font-bold tracking-[-0.03em] text-ink ${className}`}>abogac<span className="text-gold-400">IA</span></span>
}

export function Rating({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px]">
      <svg className="w-3.5 h-3.5 text-gold-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={ICONS.star} /></svg>
      <span className="font-semibold text-ink tabular">{rating.toFixed(1)}</span>
      {reviews !== undefined && <span className="text-ink-3">({reviews} opiniones)</span>}
      <span className="sr-only">de 5 estrellas</span>
    </span>
  )
}

export function Field({ label, id, type = 'text', value, onChange, placeholder, error, autoComplete }: {
  label: string; id: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id} name={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="field"
      />
      {error && <p id={`${id}-error`} className="mt-1.5 text-[13px] text-err">{error}</p>}
    </div>
  )
}

export type NoticeKind = 'ok' | 'err' | 'info' | 'wait'

export function Notice({ kind, title, children }: { kind: NoticeKind; title: string; children?: ReactNode }) {
  const tone = {
    ok: 'border-ok/30 bg-ok/[0.07] text-ok',
    err: 'border-err/30 bg-err/[0.07] text-err',
    info: 'border-sky-400/25 bg-sky-400/[0.06] text-sky-400',
    wait: 'border-line-strong bg-white/[0.03] text-ink-2',
  }[kind]
  return (
    <div role={kind === 'err' ? 'alert' : 'status'} className={`fade-in flex items-start gap-3 rounded-xl border px-4 py-3.5 ${tone}`}>
      <span className="mt-0.5 shrink-0">
        {kind === 'wait'
          ? <span className="block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
          : <Icon name={kind === 'ok' ? 'check' : kind === 'err' ? 'warn' : 'info'} className="w-4.5 h-4.5" stroke={2} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="text-[13px] text-ink-2 mt-0.5 leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}

export function DemoHint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-line-strong px-4 py-3 text-[13px] text-ink-2">
      <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-ink-3" />
      <span><span className="font-semibold text-ink">Demo · </span>{children}</span>
    </p>
  )
}

export const TRUST = [
  { icon: 'shield' as const, text: 'Matrícula verificada' },
  { icon: 'chat' as const, text: 'Orientación inicial gratuita' },
  { icon: 'pin' as const, text: 'Profesionales de Córdoba' },
]

/** Split layout for every form route: the task on the left, the brand on the right. */
export function AuthLayout({ title, subtitle, children, aside }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="px-5 sm:px-8 pt-28 pb-16 flex justify-center">
        <div className="w-full max-w-[460px] fade-up">
          <h1 className="text-[32px] sm:text-[36px] font-bold leading-[1.1]">{title}</h1>
          {subtitle && <p className="mt-3 text-ink-2 leading-relaxed">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <aside className="hidden lg:block relative overflow-hidden border-l border-line bg-navy-900">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-linear-to-t from-navy-900 via-navy-900/80 to-navy-900/40" />
        <div className="relative h-full flex flex-col justify-end p-12 xl:p-16">
          {aside ?? (
            <>
              <Avatar src={lexiImg} className="w-16 h-16 ring-1 ring-white/15" />
              <p className="mt-6 text-2xl font-semibold leading-snug tracking-[-0.02em] max-w-md">AbogacIA te conecta con profesionales del derecho de Córdoba y te brinda orientación legal mediante inteligencia artificial.</p>
              <ul className="mt-8 space-y-3">
                {TRUST.map(t => (
                  <li key={t.text} className="flex items-center gap-3 text-ink-2"><Icon name={t.icon} className="w-5 h-5 text-gold-400" />{t.text}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
