import { useState } from 'react'
import { AuthLayout, Field, Notice, type Page } from '../ui'
import { iniciarSesion } from '../services/authService'

type Tipo = 'CIUDADANO' | 'ABOGADO'

export default function LoginPage({ navigate, admin = false }: { navigate: (p: Page) => void; admin?: boolean }) {
  const [tipo, setTipo] = useState<Tipo>('CIUDADANO')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completá todos los campos.'); return }
    setLoading(true)
    try {
      await iniciarSesion(email.trim(), password, admin ? 'ADMIN' : tipo)
      navigate('home')
    } catch (ex) {
      setError(ex instanceof TypeError ? 'No se pudo conectar con el servicio. Intentá nuevamente.' : (ex as Error).message)
    } finally {
      setPassword(''); setLoading(false)
    }
  }

  const opcion = (t: Tipo, label: string) => (
    <button type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)}
      className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${tipo === t ? 'bg-gold-500 text-[#0b1020]' : 'text-ink-2 hover:text-ink'}`}>{label}</button>
  )

  return (
    <AuthLayout title={admin ? 'Acceso de administrador' : 'Iniciá sesión'} subtitle="Accedé a tu cuenta de AbogacIA.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!admin && (
          <div role="radiogroup" aria-label="Tipo de cuenta" className="flex gap-1 rounded-xl border border-line-strong bg-navy-950 p-1">
            {opcion('CIUDADANO', 'Ciudadano')}{opcion('ABOGADO', 'Abogado')}
          </div>
        )}
        <Field label="Email" id="email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" autoComplete="email" />
        <Field label="Contraseña" id="password" type="password" value={password} onChange={setPassword} placeholder="Tu contraseña" autoComplete="current-password" />
        {error && <Notice kind="err" title="No pudimos iniciar sesión">{error} Si todavía no validaste tu identidad o confirmaste tu email, tu cuenta sigue pendiente.</Notice>}
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Ingresando…</> : 'Iniciar sesión'}
        </button>
      </form>
      {!admin && <>
        <p className="mt-6 text-sm text-ink-2 text-center">¿No tenés cuenta? <button onClick={() => navigate('register-citizen')} className="link">Registrate gratis</button></p>
        <p className="mt-2 text-sm text-ink-3 text-center">¿Te falta validar tu identidad? <button onClick={() => navigate('verify-citizen')} className="link">Retomar la verificación</button></p>
      </>}
    </AuthLayout>
  )
}
