import { useEffect, useState } from 'react'
import { DemoHint, Icon, Notice, type Page } from '../ui'
import { SPECIALTIES } from '../demoData'
import { Card, CodeInput, DiditStart, DiditWaiting, SectionLabel, Stepper, esperandoDidit, type Aviso, type EstadoIdentidad } from '../identidad'
import { accesoRegistroVigente, avisoIdentidad, cerrarAccesoRegistro, confirmarAbogado, consultarIdentidad,
  crearCuentaAbogado, estadoIdentidad, iniciarIdentidad, iniciarSolicitudAbogado } from '../services/abogadoService'

const STEPS = ['Datos básicos', 'Validación Didit', 'Datos profesionales', 'Crear cuenta', 'Confirmar email']
const COLEGIOS = ['Colegio de Abogados de Córdoba', 'Colegio de Abogados de Río Cuarto', 'Colegio de Abogados de Villa María', 'Colegio de Abogados de Río Tercero']
// Formato provisional hasta definir la fuente de matrículas (igual que el backend).
const MATRICULA = /^([0-9]{1,3}-)?[0-9]{1,6}$/
// Sobrevive a la redirección a Didit; no guarda contraseñas ni datos de Didit.
const PROGRESO = 'abogacia-registro-abogado'

interface Progreso { step: number; dni: string; email: string; telefono: string }
function leerProgreso(): Progreso | null {
  try {
    const p: Progreso | null = JSON.parse(sessionStorage.getItem(PROGRESO) ?? 'null')
    // El paso 5 ya no usa el acceso temporal: solo falta confirmar el correo.
    return p && (p.step === 5 || accesoRegistroVigente()) ? p : null
  } catch { return null }
}

function edad(fecha: string) {
  const n = new Date(fecha), h = new Date()
  return h.getFullYear() - n.getFullYear() - (h < new Date(h.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0)
}
const fechaAr = (fecha: string) => fecha.split('-').reverse().join('/')

export default function RegisterLawyerPage({ navigate }: { navigate: (p: Page) => void }) {
  const inicial = leerProgreso()
  const [step, setStep] = useState(inicial?.step ?? 1)
  const [basicos, setBasicos] = useState({ dni: inicial?.dni ?? '', email: inicial?.email ?? '', telefono: inicial?.telefono ?? '' })
  const [pro, setPro] = useState({ especialidades: [] as string[], matricula: '', colegio: '', experiencia: '', honorarios: '', ubicacion: '', direccion: '', descripcion: '' })
  const [acceso, setAcceso] = useState({ password: '', confirmPassword: '' })
  const [codigo, setCodigo] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [estado, setEstado] = useState<EstadoIdentidad | null>(null)

  useEffect(() => {
    if (step === 1) sessionStorage.removeItem(PROGRESO)
    else sessionStorage.setItem(PROGRESO, JSON.stringify({ step, ...basicos }))
  }, [step, basicos])

  // Al volver de Didit se consulta el resultado; el regreso del navegador por sí solo no aprueba nada.
  useEffect(() => {
    if (step !== 2) return
    let activo = true
    avisoIdentidad().then((a: Aviso) => { if (activo) setAviso(a) }).catch(() => {})
    estadoIdentidad()
      .then((e: EstadoIdentidad) => (e.sesionEstado === 'SIN_SESION' ? e : consultarIdentidad()))
      .then((e: EstadoIdentidad) => { if (activo) setEstado(e) })
      .catch((e: Error) => { if (activo) { setError(e.message); if (!accesoRegistroVigente()) setStep(1) } })
    return () => { activo = false }
  }, [step])

  async function ejecutar(accion: () => Promise<void>) {
    setCargando(true); setError('')
    try { await accion() } catch (e) { setError((e as Error).message) } finally { setCargando(false) }
  }

  function continuarBasicos(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!/^\d{7,8}$/.test(basicos.dni)) e.dni = 'Ingresá un DNI válido (7 u 8 dígitos, sin puntos)'
    if (!/\S+@\S+\.\S+/.test(basicos.email)) e.email = 'Ingresá un email válido'
    if (!basicos.telefono.trim()) e.telefono = 'Requerido'
    setErrors(e)
    if (Object.keys(e).length) return
    ejecutar(async () => {
      await iniciarSolicitudAbogado(basicos.dni, basicos.email.trim(), basicos.telefono.trim())
      setEstado(null); setStep(2)
    })
  }

  function iniciarDidit(consentimiento: boolean) {
    ejecutar(async () => {
      const r: EstadoIdentidad = await iniciarIdentidad(consentimiento, aviso!.version)
      setEstado(r)
      if (r.url) window.location.assign(r.url)
    })
  }

  function continuarProfesionales(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!pro.especialidades.length) e.especialidades = 'Seleccioná al menos una especialidad'
    if (!MATRICULA.test(pro.matricula.trim())) e.matricula = 'Usá solo números, con un prefijo opcional (ej. 12345 o 10-123)'
    if (!pro.colegio) e.colegio = 'Seleccioná el colegio'
    if (!/^\d{1,2}$/.test(pro.experiencia.trim())) e.experiencia = 'Ingresá los años (número)'
    if (!pro.honorarios.replace(/\D/g, '')) e.honorarios = 'Ingresá un monto'
    if (!pro.ubicacion.trim()) e.ubicacion = 'Requerido'
    if (!pro.direccion.trim()) e.direccion = 'Requerido'
    if (!pro.descripcion.trim()) e.descripcion = 'Requerido'
    setErrors(e)
    if (!Object.keys(e).length) setStep(4)
  }

  function crearCuenta(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (acceso.password.length < 8) e.password = 'La contraseña debe tener al menos 8 caracteres'
    if (acceso.password !== acceso.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    setErrors(e)
    if (Object.keys(e).length) return
    ejecutar(async () => {
      await crearCuentaAbogado({
        especialidades: pro.especialidades, nroMatricula: pro.matricula.trim(), colegioProfesional: pro.colegio, provincia: 'Córdoba',
        aniosExperiencia: Number(pro.experiencia), honorarios: Number(pro.honorarios.replace(/\D/g, '')),
        ubicacion: pro.ubicacion.trim(), direccionProfesional: pro.direccion.trim(), descripcionProfesional: pro.descripcion.trim(),
        contrasena: acceso.password, confirmarContrasena: acceso.confirmPassword,
      })
      setAcceso({ password: '', confirmPassword: '' }); cerrarAccesoRegistro(); setStep(5)
    })
  }

  function confirmar(ev: React.FormEvent) {
    ev.preventDefault()
    ejecutar(async () => {
      await confirmarAbogado(basicos.email.trim(), codigo)
      sessionStorage.removeItem(PROGRESO); navigate('lawyer-pending')
    })
  }

  function volverAlInicio() { cerrarAccesoRegistro(); setErrors({}); setError(''); setEstado(null); setStep(1) }

  function campo(id: string, label: string, value: string, onChange: (v: string) => void, opts: { type?: string; placeholder?: string; autoComplete?: string } = {}) {
    return (
      <div>
        <label htmlFor={`lw-${id}`} className="label">{label}</label>
        <input id={`lw-${id}`} type={opts.type ?? 'text'} value={value} placeholder={opts.placeholder} autoComplete={opts.autoComplete}
          onChange={e => onChange(e.target.value)} aria-invalid={!!errors[id]} className="field" />
        {errors[id] && <p className="mt-1.5 text-[13px] text-err">{errors[id]}</p>}
      </div>
    )
  }
  const spinner = <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
  const aprobada = estado?.cuenta.verificacionDni === 'APROBADA' && estado.datos

  return (
    <div className="min-h-screen px-5 sm:px-8 pt-24 pb-20">
      <Stepper steps={STEPS} current={step} />
      <div className="mx-auto mt-10 w-full max-w-[560px]">

        {step === 1 && (
          <Card>
            <h1 className="text-[26px] sm:text-[28px] font-bold leading-tight">Registrate como profesional</h1>
            <p className="mt-2 text-ink-2">Ingresá tus datos de contacto para iniciar la validación de identidad.</p>
            <form onSubmit={continuarBasicos} className="mt-6 space-y-4" noValidate>
              <SectionLabel>Datos básicos</SectionLabel>
              {campo('dni', 'DNI', basicos.dni, v => setBasicos(b => ({ ...b, dni: v.replace(/\D/g, '').slice(0, 8) })), { placeholder: '12345678' })}
              {campo('email', 'Email', basicos.email, v => setBasicos(b => ({ ...b, email: v })), { type: 'email', placeholder: 'abogada@estudio.com', autoComplete: 'email' })}
              {campo('telefono', 'Teléfono', basicos.telefono, v => setBasicos(b => ({ ...b, telefono: v })), { type: 'tel', placeholder: '+54 351 123 4567', autoComplete: 'tel' })}
              <Notice kind="info" title="Validación de identidad">En el siguiente paso serás redirigido a <span className="font-semibold text-ink">Didit</span>, nuestro proveedor de validación de identidad.</Notice>
              {error && <Notice kind="err" title="No pudimos continuar">{error}</Notice>}
              <button type="submit" disabled={cargando} className="btn btn-primary btn-lg w-full">{cargando ? <>{spinner}Procesando…</> : 'Continuar con Didit'}</button>
            </form>
            <p className="mt-6 text-sm text-ink-2 text-center">¿Ya tenés una cuenta? <button onClick={() => navigate('login')} className="link">Iniciá sesión</button></p>
          </Card>
        )}

        {step === 2 && !estado && !error && <Card><Notice kind="wait" title="Consultando tu verificación…" /></Card>}
        {step === 2 && !estado && error && <Card><Notice kind="err" title="No pudimos consultar la verificación">{error}</Notice><button onClick={volverAlInicio} className="btn btn-secondary mt-6">Empezar de nuevo</button></Card>}
        {step === 2 && estado && aprobada && (
          <Card>
            <Notice kind="ok" title="Identidad verificada">Didit confirmó que el documento es tuyo.</Notice>
            <h2 className="mt-6 text-xl font-bold">Datos obtenidos de Didit</h2>
            <p className="mt-1 text-[13px] text-ink-3">Revisá el resumen antes de continuar con tus datos profesionales.</p>
            <dl className="mt-4 rounded-xl border border-line divide-y divide-line overflow-hidden">
              {([
                ['Identidad', 'Verificada'],
                ['Email', basicos.email],
                ['Número de documento', estado.datos!.dni],
                ['Nombre y apellido', [estado.datos!.nombre, estado.datos!.apellido].filter(Boolean).join(' ') || '—'],
                ['Fecha de nacimiento', estado.datos!.fechaNacimiento ? fechaAr(estado.datos!.fechaNacimiento) : '—'],
                ['Edad', estado.datos!.fechaNacimiento ? `${edad(estado.datos!.fechaNacimiento)} años` : '—'],
                ['Género', estado.datos!.genero ?? '—'],
                ['Domicilio', estado.datos!.domicilio ?? '—'],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 bg-navy-950/40">
                  <dt className="text-[13px] text-ink-3">{k}</dt>
                  <dd className={`text-[13px] font-semibold text-right wrap-break-word ${k === 'Identidad' ? 'text-ok' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-3 mt-6">
              <button onClick={volverAlInicio} className="btn btn-secondary btn-lg">Atrás</button>
              <button onClick={() => { setErrors({}); setStep(3) }} className="btn btn-primary btn-lg flex-1">Continuar con datos profesionales</button>
            </div>
          </Card>
        )}
        {step === 2 && estado && estado.cuenta.verificacionDni === 'RECHAZADA' && (
          <Card>
            <Notice kind="err" title="No pudimos validar tu identidad">Didit rechazó la verificación o el DNI del documento no coincide con el que ingresaste. Si creés que es un error, escribinos al contacto del aviso de privacidad.</Notice>
            <button onClick={volverAlInicio} className="btn btn-secondary mt-6">Empezar de nuevo</button>
          </Card>
        )}
        {step === 2 && estado && !aprobada && estado.cuenta.verificacionDni !== 'RECHAZADA' && (esperandoDidit(estado)
          ? <DiditWaiting estado={estado} cargando={cargando} error={error} onCheck={() => ejecutar(async () => setEstado(await consultarIdentidad()))} />
          : <DiditStart aviso={aviso} cargando={cargando} error={error} onStart={iniciarDidit} onBack={volverAlInicio} />)}

        {step === 3 && (
          <Card>
            <form onSubmit={continuarProfesionales} className="space-y-5" noValidate>
              <div>
                <SectionLabel>Datos profesionales</SectionLabel>
                <p className="mt-1.5 text-ink-2">Completá la información que se mostrará en tu perfil profesional.</p>
              </div>
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div><p className="label mb-0">Especialidades</p><p className="text-[12px] text-ink-3">Podés elegir todas las áreas en las que ejercés.</p></div>
                  <span className="text-[12px] font-semibold text-ink-2 border border-line-strong rounded-full px-2.5 py-0.5 tabular">{pro.especialidades.length} seleccionadas</span>
                </div>
                <div role="group" aria-label="Especialidades" className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SPECIALTIES.map((s, i) => {
                    const activa = pro.especialidades.includes(s)
                    return (
                      <button key={s} type="button" aria-pressed={activa}
                        onClick={() => setPro(p => ({ ...p, especialidades: activa ? p.especialidades.filter(x => x !== s) : [...p.especialidades, s] }))}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${activa ? 'border-gold-500 bg-gold-500/[0.08]' : 'border-line-strong bg-navy-950/40 hover:border-white/25'}`}>
                        <span className={`w-8 h-8 rounded-lg grid place-items-center text-[12px] font-bold tabular shrink-0 ${activa ? 'bg-gold-500 text-[#0b1020]' : 'bg-navy-700 text-sky-400'}`}>
                          {activa ? <Icon name="check" className="w-4 h-4" stroke={2.5} /> : String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[14px] font-semibold">{s}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.especialidades && <p className="mt-1.5 text-[13px] text-err">{errors.especialidades}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {campo('matricula', 'Número de matrícula', pro.matricula, v => setPro(p => ({ ...p, matricula: v })), { placeholder: 'Ej: 12345' })}
                  {!errors.matricula && pro.matricula && MATRICULA.test(pro.matricula.trim()) && <p className="mt-1.5 text-[13px] text-ok">Formato válido</p>}
                </div>
                <div>
                  <label htmlFor="lw-colegio" className="label">Colegio de Abogados</label>
                  <select id="lw-colegio" className="field" aria-invalid={!!errors.colegio} value={pro.colegio} onChange={e => setPro(p => ({ ...p, colegio: e.target.value }))}>
                    <option value="">Seleccioná el colegio</option>
                    {COLEGIOS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  {errors.colegio && <p className="mt-1.5 text-[13px] text-err">{errors.colegio}</p>}
                </div>
              </div>
              <Notice kind="info" title="Verificación de matrícula">Tu matrícula quedará pendiente de revisión hasta que podamos verificarla con el Colegio. Mientras tanto no podrás iniciar sesión como profesional.</Notice>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campo('experiencia', 'Años de experiencia', pro.experiencia, v => setPro(p => ({ ...p, experiencia: v })), { placeholder: 'Ej: 10' })}
                {campo('honorarios', 'Honorarios aprox.', pro.honorarios, v => setPro(p => ({ ...p, honorarios: v })), { placeholder: 'Ej: $15.000' })}
              </div>
              {campo('ubicacion', 'Ubicación', pro.ubicacion, v => setPro(p => ({ ...p, ubicacion: v })), { placeholder: 'Córdoba Capital' })}
              {campo('direccion', 'Dirección profesional', pro.direccion, v => setPro(p => ({ ...p, direccion: v })), { placeholder: 'Av. Colón 123, piso 2' })}
              <div>
                <label htmlFor="lw-descripcion" className="label">Descripción profesional</label>
                <textarea id="lw-descripcion" rows={4} value={pro.descripcion} onChange={e => setPro(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describí tu experiencia y enfoque…" aria-invalid={!!errors.descripcion} className="field resize-none" />
                {errors.descripcion && <p className="mt-1.5 text-[13px] text-err">{errors.descripcion}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary btn-lg">Atrás</button>
                <button type="submit" className="btn btn-primary btn-lg flex-1">Continuar</button>
              </div>
            </form>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <form onSubmit={crearCuenta} className="space-y-4" noValidate>
              <div>
                <SectionLabel>Creá tus datos de acceso</SectionLabel>
                <p className="mt-1.5 text-ink-2">Tu identidad ya fue validada. Definí una contraseña para crear la cuenta profesional.</p>
              </div>
              {campo('password', 'Contraseña', acceso.password, v => setAcceso(a => ({ ...a, password: v })), { type: 'password', placeholder: 'Mínimo 8 caracteres', autoComplete: 'new-password' })}
              {campo('confirmPassword', 'Confirmar contraseña', acceso.confirmPassword, v => setAcceso(a => ({ ...a, confirmPassword: v })), { type: 'password', placeholder: 'Repetí tu contraseña', autoComplete: 'new-password' })}
              <Notice kind="ok" title="Identidad verificada por Didit">Al crear la cuenta quedarán pendientes la confirmación de tu email y la verificación de tu matrícula profesional.</Notice>
              {error && <Notice kind="err" title="No pudimos crear la cuenta">{error}</Notice>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(3)} disabled={cargando} className="btn btn-secondary btn-lg">Atrás</button>
                <button type="submit" disabled={cargando} className="btn btn-primary btn-lg flex-1">{cargando ? <>{spinner}Creando cuenta…</> : 'Crear cuenta profesional'}</button>
              </div>
            </form>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <Notice kind="ok" title="Cuenta creada">Solo falta confirmar tu dirección de email.</Notice>
            <form onSubmit={confirmar} className="mt-6 text-center">
              <span className="mx-auto w-12 h-12 rounded-xl border border-line-strong bg-white/[0.04] grid place-items-center text-sky-400"><Icon name="mail" className="w-5 h-5" /></span>
              <h2 className="mt-4 text-2xl font-bold">Confirmá tu cuenta</h2>
              <p className="mt-2 text-ink-2">Enviamos un código de 6 dígitos a <span className="font-semibold text-ink">{basicos.email}</span>.</p>
              <label htmlFor="lw-codigo" className="label mt-6">Código de confirmación</label>
              <CodeInput id="lw-codigo" value={codigo} onChange={v => { setCodigo(v); setError('') }} invalid={!!error} />
              {error && <div className="mt-3 text-left"><Notice kind="err" title="El código es incorrecto">{error}</Notice></div>}
              <button type="submit" disabled={cargando || codigo.length !== 6} className="btn btn-primary btn-lg w-full mt-5">{cargando ? <>{spinner}Confirmando…</> : 'Confirmar cuenta'}</button>
            </form>
            <DemoHint>en desarrollo el código no se envía por email: aparece en los logs (<code>docker compose logs abogados</code>).</DemoHint>
          </Card>
        )}
      </div>
    </div>
  )
}
