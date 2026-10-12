import { useEffect, useState } from 'react'
import { Field, Notice, type Page } from '../ui'
import { Card, DiditStart, DiditWaiting, SectionLabel, Stepper, esperandoDidit, type Aviso, type EstadoIdentidad } from '../identidad'
import { identidadCiudadano } from '../services/ciudadanoService'

const { accesoRegistroVigente, accederRegistro, avisoIdentidad, cerrarRegistroRemoto, consultarIdentidad, estadoIdentidad, iniciarIdentidad } = identidadCiudadano
const STEPS = ['Crear cuenta', 'Confirmar email', 'Validación Didit']

export default function VerifyCitizenPage({ navigate }: { navigate: (p: Page) => void }) {
  const [acceso, setAcceso] = useState(() => !!accesoRegistroVigente())
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [estado, setEstado] = useState<EstadoIdentidad | null>(null)
  const [mail, setMail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Al volver de Didit se consulta el resultado en el backend; el regreso del navegador no aprueba nada.
  useEffect(() => {
    if (!acceso) return
    let activo = true
    avisoIdentidad().then((a: Aviso) => { if (activo) setAviso(a) }).catch(() => {})
    estadoIdentidad()
      .then((e: EstadoIdentidad) => (e.sesionEstado === 'SIN_SESION' ? e : consultarIdentidad()))
      .then((e: EstadoIdentidad) => { if (activo) setEstado(e) })
      .catch((e: Error) => { if (activo) { setError(e.message); setAcceso(!!accesoRegistroVigente()) } })
    return () => { activo = false }
  }, [acceso])

  async function ejecutar(accion: () => Promise<void>) {
    setCargando(true); setError('')
    try { await accion() } catch (e) { setError((e as Error).message); setAcceso(!!accesoRegistroVigente()) } finally { setCargando(false) }
  }

  function ingresar(ev: React.FormEvent) {
    ev.preventDefault()
    ejecutar(async () => { await accederRegistro(mail.trim(), contrasena); setContrasena(''); setEstado(null); setAcceso(true) })
  }

  function iniciar(consentimiento: boolean) {
    ejecutar(async () => {
      const r: EstadoIdentidad = await iniciarIdentidad(consentimiento, aviso!.version)
      setEstado(r)
      if (r.url) window.location.assign(r.url)
    })
  }

  const registrado = estado?.cuenta.estado === 'REGISTRADO'
  const rechazada = estado?.cuenta.verificacionDni === 'RECHAZADA'

  return (
    <div className="min-h-screen px-5 sm:px-8 pt-24 pb-20">
      <Stepper steps={STEPS} current={registrado ? 4 : 3} />
      <div className="mx-auto mt-10 w-full max-w-[560px]">
        {!acceso && (
          <Card>
            <SectionLabel>Validación de identidad</SectionLabel>
            <h1 className="mt-2 text-[26px] font-bold leading-tight">Retomá tu verificación</h1>
            <p className="mt-2 text-ink-2">Ingresá con el email y la contraseña de tu cuenta para validar tu identidad con Didit. Primero tenés que haber confirmado tu email.</p>
            <form onSubmit={ingresar} className="mt-6 space-y-4">
              <Field label="Email" id="vc-email" type="email" value={mail} onChange={setMail} placeholder="tu@email.com" autoComplete="username" />
              <Field label="Contraseña" id="vc-password" type="password" value={contrasena} onChange={setContrasena} placeholder="Tu contraseña" autoComplete="current-password" />
              {error && <Notice kind="err" title="No pudimos acceder">{error}</Notice>}
              <button disabled={cargando || !mail || !contrasena} className="btn btn-primary btn-lg w-full">{cargando ? 'Ingresando…' : 'Continuar'}</button>
            </form>
            <p className="mt-6 text-sm text-ink-2 text-center">¿Todavía no tenés cuenta? <button onClick={() => navigate('register-citizen')} className="link">Registrate</button></p>
          </Card>
        )}

        {acceso && !estado && (error
          ? <Card><Notice kind="err" title="No pudimos consultar la verificación">{error}</Notice></Card>
          : <Card><Notice kind="wait" title="Consultando tu verificación…" /></Card>)}

        {acceso && estado && registrado && (
          <Card>
            <Notice kind="ok" title="Identidad verificada">Didit confirmó tu identidad. Tu cuenta ya está habilitada.</Notice>
            <button onClick={() => { cerrarRegistroRemoto().catch(() => {}); navigate('login') }} className="btn btn-primary btn-lg w-full mt-6">Iniciar sesión</button>
          </Card>
        )}
        {acceso && estado && rechazada && (
          <Card>
            <Notice kind="err" title="No pudimos validar tu identidad">Didit rechazó la verificación o el DNI del documento no coincide con el de tu cuenta. Si creés que es un error, escribinos al contacto del aviso de privacidad.</Notice>
          </Card>
        )}
        {acceso && estado && !registrado && !rechazada && (esperandoDidit(estado)
          ? <DiditWaiting estado={estado} cargando={cargando} error={error} onCheck={() => ejecutar(async () => setEstado(await consultarIdentidad()))} />
          : <DiditStart aviso={aviso} cargando={cargando} error={error} onStart={iniciar} />)}
      </div>
    </div>
  )
}
