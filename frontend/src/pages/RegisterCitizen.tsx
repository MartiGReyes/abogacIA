import { useState } from 'react'
import { Avatar, Field, Icon, Notice, lexiImg, type Page } from '../ui'
import { CodeInput, SectionLabel } from '../identidad'
import { confirmarRegistro, identidadCiudadano, registrarCiudadano } from '../services/ciudadanoService'

const BENEFICIOS = ['Buscar y contactar abogados', 'Consultar a Lexi sin límites', 'Guardar tus abogados favoritos', 'Ver el historial de consultas', 'Recibir notificaciones legales']

export default function RegisterCitizenPage({ navigate }: { navigate: (p: Page) => void }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', nacimiento: '', email: '', telefono: '', password: '', confirmPassword: '', terms: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState<'form' | 'verification'>('form')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  function set(k: keyof typeof form, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.apellido.trim()) e.apellido = 'Requerido'
    if (!/^\d{7,8}$/.test(form.dni)) e.dni = 'DNI inválido (7-8 dígitos)'
    if (!form.nacimiento) e.nacimiento = 'Requerido'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    if (!form.terms) e.terms = 'Debés aceptar los términos'
    return e
  }

  async function ejecutar(accion: () => Promise<void>) {
    setCargando(true); setError('')
    try { await accion() } catch (e) { setError((e as Error).message) } finally { setCargando(false) }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate(); setErrors(e)
    if (Object.keys(e).length) return
    ejecutar(async () => {
      await registrarCiudadano({
        nombre: form.nombre.trim(), apellido: form.apellido.trim(), dni: form.dni, fechaNacimiento: form.nacimiento,
        mail: form.email.trim(), nroCelular: form.telefono.trim(), contrasena: form.password,
      })
      setCodigo(''); setStep('verification')
    })
  }

  function handleVerify(ev: React.FormEvent) {
    ev.preventDefault()
    ejecutar(async () => {
      await confirmarRegistro(codigo)
      // La contraseña recién ingresada habilita el acceso temporal para Didit; después se descarta.
      // Si falla, la página de verificación pide ingresar de nuevo: el código ya fue usado.
      await identidadCiudadano.accederRegistro(form.email.trim(), form.password).catch(() => {})
      setForm(f => ({ ...f, password: '', confirmPassword: '' }))
      navigate('verify-citizen')
    })
  }

  const spinner = <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />

  if (step === 'verification') {
    return (
      <div className="min-h-screen px-5 sm:px-8 pt-32 pb-20 flex justify-center">
        <div className="w-full max-w-[420px] text-center fade-up">
          <span className="mx-auto w-14 h-14 rounded-2xl border border-line-strong bg-white/[0.04] grid place-items-center text-sky-400"><Icon name="mail" className="w-6 h-6" /></span>
          <p className="mt-5 text-[12px] font-bold tracking-[0.08em] uppercase text-gold-400">Verificación de email</p>
          <h1 className="mt-2 text-[30px] font-bold leading-tight">Revisá tu correo</h1>
          <p className="mt-3 text-ink-2">Enviamos un código de 6 dígitos a <span className="font-semibold text-ink">{form.email}</span>.<br />Ingresalo para continuar con tu cuenta.</p>
          <form onSubmit={handleVerify} className="card bg-navy-850 border-line-strong mt-8 p-6 text-left">
            <label htmlFor="verification-code" className="label text-center">Código de verificación</label>
            <CodeInput id="verification-code" value={codigo} onChange={v => { setCodigo(v); setError('') }} invalid={!!error} />
            {error && <div className="mt-3"><Notice kind="err" title="No pudimos verificar el código">{error}</Notice></div>}
            <button type="submit" disabled={cargando || codigo.length !== 6} className="btn btn-primary btn-lg w-full mt-5">{cargando ? <>{spinner}Verificando…</> : 'Verificar y continuar'}</button>
          </form>
          <p className="mt-4 rounded-xl border border-line bg-navy-850 px-4 py-3 text-[13px] text-ink-2">
            En desarrollo el código no se envía por email: aparece en los logs (<code className="text-sky-400">docker compose logs ciudadanos</code>).
          </p>
        </div>
      </div>
    )
  }

  function renderField(id: keyof typeof form, label: string, type = 'text', placeholder?: string, autoComplete?: string) {
    return <Field label={label} id={String(id)} type={type} value={form[id] as string} onChange={v => set(id, id === 'dni' ? v.replace(/\D/g, '').slice(0, 8) : v)} placeholder={placeholder} error={errors[id]} autoComplete={autoComplete} />
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-28 pb-20 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-10 lg:gap-14 items-start">
      <div className="fade-up">
        <h1 className="text-[32px] sm:text-[36px] font-bold leading-[1.1]">Creá tu cuenta en AbogacIA</h1>
        <p className="mt-3 text-ink-2 leading-relaxed">Registrate para encontrar abogados y realizar consultas de orientación legal.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{renderField('nombre', 'Nombre', 'text', 'Juan', 'given-name')}{renderField('apellido', 'Apellido', 'text', 'García', 'family-name')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{renderField('dni', 'DNI', 'text', '12345678')}{renderField('nacimiento', 'Fecha de nacimiento', 'date', undefined, 'bday')}</div>
          {renderField('email', 'Email', 'email', 'juan@email.com', 'email')}
          {renderField('telefono', 'Teléfono', 'tel', '+54 351 123 4567', 'tel')}
          {renderField('password', 'Contraseña', 'password', 'Mínimo 8 caracteres', 'new-password')}
          {renderField('confirmPassword', 'Confirmar contraseña', 'password', 'Repetí tu contraseña', 'new-password')}
          <div className="pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.terms} onChange={e => set('terms', e.target.checked)} className="mt-0.5 w-4.5 h-4.5 accent-gold-500 shrink-0" aria-invalid={!!errors.terms} />
              <span className="text-sm text-ink-2">Acepto los <a href="#" className="link">términos y condiciones</a> y la <a href="#" className="link">política de privacidad</a>.</span>
            </label>
            {errors.terms && <p className="mt-1.5 text-[13px] text-err ml-7.5">{errors.terms}</p>}
          </div>
          <Notice kind="info" title="Validación de identidad">Después de confirmar tu email vas a validar tu identidad con Didit, con tu DNI y una selfie.</Notice>
          {error && <Notice kind="err" title="No pudimos crear tu cuenta">{error}</Notice>}
          <button type="submit" disabled={cargando} className="btn btn-primary btn-lg w-full">{cargando ? <>{spinner}Creando cuenta…</> : 'Crear cuenta'}</button>
        </form>
        <p className="mt-6 text-sm text-ink-2 text-center">¿Ya tenés una cuenta? <button onClick={() => navigate('login')} className="link">Iniciá sesión</button></p>
      </div>
      <aside className="lg:sticky lg:top-24">
        <div className="card bg-navy-850 border-line-strong p-7 text-center">
          <Avatar src={lexiImg} className="mx-auto w-16 h-16 ring-1 ring-white/15" />
          <p className="mt-5 text-lg font-semibold">Con tu cuenta podés:</p>
          <ul className="mt-4 space-y-2.5 text-left inline-block">
            {BENEFICIOS.map(b => <li key={b} className="flex items-center gap-2.5 text-[14px] text-ink-2"><Icon name="check" className="w-4 h-4 text-gold-400" stroke={2.25} />{b}</li>)}
          </ul>
        </div>
        <p className="mt-4 text-[13px] text-ink-3 text-center">¿Sos abogado/a? <button onClick={() => navigate('register-lawyer')} className="link">Registrate como profesional</button></p>
        <div className="mt-6 hidden lg:block"><SectionLabel>Tus datos están protegidos</SectionLabel><p className="mt-1.5 text-[13px] text-ink-3 leading-relaxed">Usamos tu DNI solo para verificar que seas vos.</p></div>
      </aside>
    </div>
  )
}
