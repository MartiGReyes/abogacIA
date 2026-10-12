import { useEffect, useState } from 'react'
import { Field, Icon, Notice, useEscape, type Page } from '../ui'
import { darDeBajaCiudadano, modificarCiudadano, obtenerMisDatos } from '../services/ciudadanoService'
import { cerrarSesion } from '../services/authService'

interface Ciudadano { nombre: string; apellido: string; dni: string; fechaNacimiento: string; direccion: string | null; mail: string; nroCelular: string | null; verificacionDni?: string }

const fechaAr = (fecha: string) => fecha ? fecha.split('-').reverse().join('/') : '—'

export default function ProfilePage({ navigate, onUpdated }: { navigate: (p: Page) => void; onUpdated: () => void }) {
  const [user, setUser] = useState<Ciudadano | null>(null)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Ciudadano | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    obtenerMisDatos().then((c: Ciudadano) => { setUser(c); setForm(c) }).catch((e: Error) => setLoadError(e.message))
  }, [])

  function set(k: keyof Ciudadano, v: string) { setForm(f => f && ({ ...f, [k]: v })) }

  function validate(f: Ciudadano) {
    const e: Record<string, string> = {}
    if (!f.nombre.trim()) e.nombre = 'Requerido'
    if (!f.apellido.trim()) e.apellido = 'Requerido'
    if (!/\S+@\S+\.\S+/.test(f.mail)) e.mail = 'Email inválido'
    return e
  }

  async function handleSave() {
    if (!form || !user) return
    const e = validate(form); setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true); setError('')
    try {
      const actualizado: Ciudadano = await modificarCiudadano(user.dni, {
        nombre: form.nombre.trim(), apellido: form.apellido.trim(), fechaNacimiento: form.fechaNacimiento,
        direccion: user.direccion, mail: form.mail.trim(), nroCelular: form.nroCelular?.trim() ?? '',
      })
      setUser(actualizado); setForm(actualizado); setEditing(false); setSaved(true); onUpdated()
      setTimeout(() => setSaved(false), 3000)
    } catch (ex) { setError((ex as Error).message) } finally { setSaving(false) }
  }

  function closeDelete() { setShowDeleteModal(false); setDeleteConfirm('') }

  async function handleDelete() {
    if (!user || deleteConfirm !== user.mail) return
    try { await darDeBajaCiudadano(user.dni); cerrarSesion(); navigate('home') }
    catch (ex) { setError((ex as Error).message); closeDelete() }
  }

  useEscape(showDeleteModal, closeDelete)

  if (loadError) return <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20"><Notice kind="err" title="No pudimos cargar tus datos">{loadError}</Notice></div>
  if (!user || !form) return <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20"><Notice kind="wait" title="Cargando tus datos…" /></div>

  function renderField(id: keyof Ciudadano, label: string, type = 'text') {
    return <Field label={label} id={`pf-${id}`} type={type} value={(form![id] as string) ?? ''} onChange={v => set(id, v)} error={errors[id]} />
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20 fade-up">
      <div className="flex flex-wrap items-center gap-5">
        <span className="w-16 h-16 rounded-full bg-gold-500 text-[#0b1020] text-xl font-bold grid place-items-center" aria-hidden="true">{user.nombre[0]}{user.apellido[0]}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-bold leading-tight">{user.nombre} {user.apellido}</h1>
          <p className="text-ink-2 text-sm mt-1 flex flex-wrap items-center gap-2">{user.mail}
            <span className="text-[12px] font-semibold text-sky-400 bg-sky-400/10 rounded-full px-2 py-0.5">Ciudadano</span>
            {user.verificacionDni === 'APROBADA' && <span className="text-[12px] font-semibold text-ok bg-ok/10 rounded-full px-2 py-0.5 inline-flex items-center gap-1"><Icon name="shield" className="w-3.5 h-3.5" />Identidad verificada</span>}
          </p>
        </div>
        <button onClick={() => navigate('history')} className="btn btn-secondary btn-sm"><Icon name="list" className="w-4 h-4" />Historial de consultas</button>
      </div>

      {saved && <div className="mt-6"><Notice kind="ok" title="Datos actualizados correctamente" /></div>}
      {error && <div className="mt-6"><Notice kind="err" title="No pudimos completar la operación">{error}</Notice></div>}

      <section aria-labelledby="datos-title" className="card mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-line">
          <div>
            <h2 id="datos-title" className="text-lg font-semibold">Datos personales</h2>
            <p className="text-[13px] text-ink-3 mt-0.5">Consultá y modificá tu información.</p>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm"><Icon name="edit" className="w-4 h-4" />Editar</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setForm(user); setErrors({}); setError('') }} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField('nombre', 'Nombre')}
            {renderField('apellido', 'Apellido')}
            <div>
              <label htmlFor="pf-dni" className="label">DNI</label>
              <input id="pf-dni" disabled value={user.dni} className="field" aria-describedby="pf-dni-hint" />
              <p id="pf-dni-hint" className="mt-1.5 text-[13px] text-ink-3">El DNI no puede modificarse: fue validado con Didit.</p>
            </div>
            {renderField('fechaNacimiento', 'Fecha de nacimiento', 'date')}
            {renderField('mail', 'Email', 'email')}
            {renderField('nroCelular', 'Teléfono', 'tel')}
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            {([
              ['Nombre', user.nombre],
              ['Apellido', user.apellido],
              ['DNI', user.dni],
              ['Fecha de nacimiento', fechaAr(user.fechaNacimiento)],
              ['Email', user.mail],
              ['Teléfono', user.nroCelular || '—'],
            ] as const).map(([label, value], i) => (
              <div key={label} className={`px-6 py-4 border-line ${i < 4 ? 'border-b' : 'max-sm:border-b max-sm:last:border-b-0'} ${i % 2 === 0 ? 'sm:border-r' : ''}`}>
                <dt className="text-[13px] text-ink-3">{label}</dt>
                <dd className="mt-0.5 font-medium tabular wrap-break-word">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="danger-title" className="mt-14 rounded-2xl border border-err/20 px-6 py-6 flex flex-wrap items-center justify-between gap-5">
        <div className="max-w-lg">
          <h2 id="danger-title" className="font-semibold">Dar de baja la cuenta</h2>
          <p className="text-sm text-ink-2 mt-1">Tu cuenta queda deshabilitada y no podrás volver a iniciar sesión con ella.</p>
        </div>
        <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger btn-sm"><Icon name="trash" className="w-4 h-4" />Dar de baja mi cuenta</button>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-60 grid place-items-center p-4 bg-black/70 backdrop-blur-sm fade-in" onClick={e => { if (e.target === e.currentTarget) closeDelete() }}>
          <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="card w-full max-w-md p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
            <span className="w-11 h-11 rounded-full bg-err/10 text-err grid place-items-center"><Icon name="warn" /></span>
            <h3 id="delete-title" className="mt-4 text-lg font-semibold">¿Dar de baja tu cuenta?</h3>
            <label htmlFor="delete-confirm" className="block text-sm text-ink-2 mt-1.5">Esta acción no se puede deshacer. Para confirmar, escribí tu email.</label>
            <input id="delete-confirm" autoFocus autoComplete="off" className="field mt-4" placeholder={user.mail} value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={closeDelete} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteConfirm !== user.mail} className="btn btn-danger-solid">Dar de baja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
