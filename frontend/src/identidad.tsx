// Piezas compartidas por los flujos de verificación de identidad con Didit (abogado y ciudadano).
/* oxlint-disable react/only-export-components -- comparte un helper con los componentes; solo afecta el fast refresh */
import { useEffect, useState, type ReactNode } from 'react'
import { Icon, Notice } from './ui'

export interface Aviso { disponible: boolean; version: string; texto: string }
export interface EstadoIdentidad {
  cuenta: { estado: string; correoConfirmado: boolean; verificacionDni: string; validacionMatricula?: string }
  sesionEstado: string
  url: string | null
  puedeReintentar: boolean
  seguimiento: string | null
  datos?: { dni: string; nombre: string | null; apellido: string | null; fechaNacimiento: string | null; genero: string | null; domicilio: string | null } | null
}

// El backend llama a Didit como máximo una vez cada 30 segundos por cuenta; antes devuelve lo guardado o rechaza.
const INTERVALO_REVISION_MS = 30_000

/** Una sesión de Didit creada que todavía no tiene decisión final. */
export function esperandoDidit(e: EstadoIdentidad | null) {
  return !!e && !['SIN_SESION', 'Expired', 'Abandoned', 'ERROR_CREACION'].includes(e.sesionEstado)
    && e.cuenta.verificacionDni !== 'APROBADA' && e.cuenta.verificacionDni !== 'RECHAZADA'
}

/** Tarjeta centrada con el estilo de los pasos del registro profesional. */
export function Card({ children }: { children: ReactNode }) {
  return <div className="card bg-navy-850 border-line-strong p-6 sm:p-8 fade-in">{children}</div>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-sky-400">{children}</p>
}

/** Paso de Didit: aviso de privacidad obligatorio, consentimiento expreso y salida al entorno de Didit. */
export function DiditStart({ aviso, onStart, onBack, cargando, error, retomarUrl }: {
  aviso: Aviso | null; onStart: (consentimiento: boolean) => void; onBack?: () => void; cargando: boolean; error: string; retomarUrl?: string | null
}) {
  const [consentimiento, setConsentimiento] = useState(false)
  const [verAviso, setVerAviso] = useState(false)
  // El backend rechaza otro intento durante 30 segundos desde el anterior; si falla, se espera acá en vez de mostrar "operación en curso".
  const [reintentoHasta, setReintentoHasta] = useState(0)
  const [ahora, setAhora] = useState(() => Date.now())
  const espera = Math.max(0, Math.ceil((reintentoHasta - ahora) / 1000))
  function iniciar() { const n = Date.now(); setAhora(n); setReintentoHasta(n + INTERVALO_REVISION_MS); onStart(consentimiento) }
  useEffect(() => {
    if (!espera) return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [espera])
  return (
    <Card>
      <div className="text-center">
        <span className="mx-auto w-14 h-14 rounded-2xl border border-line-strong bg-white/[0.04] grid place-items-center text-sky-400"><Icon name="shield" className="w-6 h-6" /></span>
        <div className="mt-5"><SectionLabel>Verificación segura</SectionLabel></div>
        <h2 className="mt-2 text-[26px] font-bold leading-tight">Validá tu identidad con Didit</h2>
        <p className="mt-3 text-ink-2 text-[15px] leading-relaxed max-w-md mx-auto">Didit comprobará tu DNI y que seas vos con una selfie y una prueba de vida. Al finalizar volverás automáticamente a AbogacIA.</p>
      </div>

      {aviso && !aviso.disponible && <div className="mt-6"><Notice kind="err" title="Verificación no disponible">{aviso.texto}</Notice></div>}
      {aviso?.disponible && (
        <div className="mt-6 rounded-xl border border-line bg-navy-950/60 p-4">
          <button type="button" onClick={() => setVerAviso(v => !v)} aria-expanded={verAviso} className="w-full flex items-center justify-between gap-3 text-left text-sm font-semibold">
            Aviso de privacidad (versión {aviso.version})
            <Icon name="chevron" className={`w-4 h-4 text-ink-3 transition-transform ${verAviso ? 'rotate-180' : ''}`} />
          </button>
          {verAviso && <p className="mt-3 max-h-56 overflow-y-auto pr-1 text-[13px] leading-relaxed text-ink-2">{aviso.texto}</p>}
          <label className="mt-4 flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentimiento} disabled={cargando} onChange={e => setConsentimiento(e.target.checked)} className="mt-0.5 w-4.5 h-4.5 accent-gold-500 shrink-0" />
            <span className="text-[13px] text-ink-2 leading-relaxed">Leí el aviso y consiento expresamente la verificación documental, la prueba de vida y la comparación facial por Didit.</span>
          </label>
        </div>
      )}

      {error && !cargando && <div className="mt-4"><Notice kind="err" title="No pudimos iniciar la verificación">{error}</Notice></div>}

      <button onClick={iniciar} disabled={cargando || espera > 0 || !aviso?.disponible || !consentimiento} className="btn btn-primary btn-lg w-full mt-6">
        {cargando ? <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Conectando con Didit… puede tardar unos segundos</>
          : espera > 0 ? `Reintentar en ${espera} s`
          : retomarUrl ? 'Retomar en Didit' : error ? 'Reintentar' : 'Continuar en Didit'}
      </button>
      <p className="mt-3 text-center text-[12px] text-ink-3">La verificación se realiza en el entorno seguro de Didit.</p>
      {onBack && <button onClick={onBack} disabled={cargando} className="btn btn-secondary mt-6">Atrás</button>}
    </Card>
  )
}

/** Didit ya tiene la sesión; se revisa el resultado automáticamente y también se puede pedir a mano. */
export function DiditWaiting({ estado, onCheck, cargando, error }: { estado: EstadoIdentidad; onCheck: () => void; cargando: boolean; error: string }) {
  const [proxima, setProxima] = useState(() => Date.now() + INTERVALO_REVISION_MS)
  const [ahora, setAhora] = useState(() => Date.now())
  const automatica = estado.seguimiento !== 'LIMITE_CONSULTAS'

  useEffect(() => {
    if (cargando || !automatica) return
    const t = setInterval(() => {
      const n = Date.now()
      setAhora(n)
      if (n >= proxima) { setProxima(n + INTERVALO_REVISION_MS); onCheck() }
    }, 1000)
    return () => clearInterval(t)
  }, [cargando, automatica, proxima, onCheck])

  function revisarAhora() { setProxima(Date.now() + INTERVALO_REVISION_MS); onCheck() }

  const segundos = Math.max(0, Math.ceil((proxima - ahora) / 1000))
  return (
    <Card>
      <div className="text-center">
        <span className="mx-auto w-14 h-14 rounded-2xl border border-line-strong bg-white/[0.04] grid place-items-center text-sky-400">
          <span className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
        </span>
        <div className="mt-5"><SectionLabel>Verificación en curso</SectionLabel></div>
        <h2 className="mt-2 text-[26px] font-bold leading-tight">Esperando el resultado de Didit</h2>
        <p className="mt-3 text-ink-2 text-[15px] leading-relaxed max-w-md mx-auto">
          {automatica
            ? <>Quedate en esta página: <strong className="text-ink">revisamos el resultado automáticamente cada 30 segundos</strong> y la pantalla se actualiza sola. No hace falta recargar.</>
            : 'El seguimiento automático se detuvo.'}
        </p>
      </div>

      {automatica && (
        <p role="status" className="mt-6 rounded-xl border border-line bg-navy-950/60 px-4 py-3 text-center text-[14px] text-ink-2 tabular">
          {cargando ? 'Revisando ahora…' : `Próxima revisión automática en ${segundos} s`}
        </p>
      )}

      {estado.seguimiento === 'DIDIT_NO_DISPONIBLE' && <div className="mt-3"><Notice kind="info" title="Didit no respondió">Seguimos intentando automáticamente.</Notice></div>}
      {estado.seguimiento === 'LIMITE_CONSULTAS' && <div className="mt-3"><Notice kind="err" title="Se agotó el seguimiento automático">Escribinos al contacto del aviso de privacidad para revisar tu caso.</Notice></div>}
      {error && <div className="mt-3"><Notice kind="err" title="No pudimos consultar">{error}</Notice></div>}

      <button onClick={revisarAhora} disabled={cargando} className="btn btn-primary btn-lg w-full mt-6">{cargando ? 'Revisando…' : 'Revisar ahora'}</button>
      {estado.url && (
        <>
          <a href={estado.url} className="btn btn-secondary w-full mt-3">Volver a Didit</a>
          <p className="mt-3 text-center text-[12px] text-ink-3">¿No terminaste todos los pasos en Didit? Volvé para completarlos.</p>
        </>
      )}
    </Card>
  )
}

/** Indicador de pasos horizontal del registro profesional. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Pasos del registro" className="flex items-start justify-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
      {steps.map((s, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'current' : 'todo'
        return (
          <li key={s} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-2 sm:gap-3 shrink-0">
            {i > 0 && <span aria-hidden="true" className={`hidden sm:block w-8 lg:w-14 h-px ${n <= current ? 'bg-gold-500' : 'bg-line-strong'}`} />}
            <span className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold shrink-0 ${state === 'done' ? 'bg-gold-500 text-[#0b1020]' : state === 'current' ? 'border-2 border-gold-500 text-gold-400' : 'border border-line-strong text-ink-3'}`}>
              {state === 'done' ? <Icon name="check" className="w-3.5 h-3.5" stroke={2.5} /> : n}
            </span>
            <span className={`text-[12px] leading-tight max-w-[5.5rem] ${state === 'current' ? 'text-ink font-semibold' : 'text-ink-3'}`}>{s}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Código de 6 dígitos con el estilo del diseño. */
export function CodeInput({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <input
      id={id} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
      value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000" aria-invalid={invalid}
      className="field h-16 text-center text-3xl font-bold tracking-[0.5em] tabular"
    />
  )
}
