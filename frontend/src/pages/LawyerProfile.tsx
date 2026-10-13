import { useNavigate } from 'react-router-dom'
import { cerrarSesion } from '../services/authService'
import { useEffect, useState } from 'react'

import { Field, Icon, Notice, useEscape, type Page } from '../ui'

import { darDeBajaAbogado, modificarMiPerfilAbogado, obtenerMiPerfilAbogado } from '../services/abogadoService'





interface Abogado { estado: string; fechaRegistro: string; genero: string | null; correoConfirmado: boolean; validacionMatricula: string; domicilio: string; nroMatricula: string; colegioProfesional: string; provincia: string; especialidades: string[]; aniosExperiencia: number; honorarios: number; ubicacion: string; direccionProfesional: string; descripcionProfesional: string; nombre: string; apellido: string; dni: string; fechaNacimiento: string; direccion: string | null; mail: string; nroCelular: string | null; verificacionDni?: string }



const fechaAr = (fecha: string) => fecha ? fecha.split('-').reverse().join('/') : '—'



export default function LawyerProfilePage({ navigate, onUpdated }: { navigate: (p: Page) => void; onUpdated: () => void }) {

  const [user, setUser] = useState<Abogado | null>(null)

  const [loadError, setLoadError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)

  const [editing, setEditing] = useState(false)

  const [form, setForm] = useState<Abogado | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [saved, setSaved] = useState(false)

  const [error, setError] = useState('')

  const [saving, setSaving] = useState(false)
  const routeNavigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  function closeDelete() {
    if (deleting) return
    setShowDeleteModal(false); setDeleteConfirm(''); setDeleteError('')
  }
  useEscape(showDeleteModal, closeDelete)
  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (!user || deleting) return
    if (deleteConfirm.trim().toLowerCase() !== user.mail.toLowerCase()) {
      setDeleteError('El correo no coincide con el de tu cuenta.'); return
    }
    setDeleting(true); setDeleteError('')
    try {
      await darDeBajaAbogado(deleteConfirm.trim())
      cerrarSesion()
      routeNavigate('/iniciar-sesion', { replace: true, state: { bajaExitosa: true } })
    } catch (ex) { setDeleteError((ex as Error).message) }
    finally { setDeleting(false) }
  }




  useEffect(() => {

    let active = true
    obtenerMiPerfilAbogado().then((c: Abogado) => { if (active) { setUser(c); setForm(c) } }).catch((e: Error) => { if (active) setLoadError(e.message) })
    return () => { active = false }

  }, [loadVersion])



  function set(k: keyof Abogado, v: string) { setForm(f => f && ({ ...f, [k]: v })) }



  function validate(f: Abogado) {

    const e: Record<string, string> = {}

    if (!f.nombre.trim()) e.nombre = 'Requerido'

    if (!f.apellido.trim()) e.apellido = 'Requerido'

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.mail.trim())) e.mail = 'Email inválido'

    for (const key of ['domicilio', 'ubicacion', 'direccionProfesional', 'descripcionProfesional'] as const) {

      if (!f[key]?.trim()) e[key] = 'Requerido'

      else if (f[key].trim().length > (key === 'descripcionProfesional' ? 2000 : 255)) e[key] = 'Texto demasiado largo'

    }

    if (f.nombre.trim().length > 100) e.nombre = 'Máximo 100 caracteres'

    if (f.apellido.trim().length > 100) e.apellido = 'Máximo 100 caracteres'

    if (f.mail.trim().length > 255) e.mail = 'Máximo 255 caracteres'

    if (!f.fechaNacimiento || f.fechaNacimiento >= new Date().toLocaleDateString('sv-SE')) e.fechaNacimiento = 'Ingresá una fecha anterior a hoy'

    if (!/^[+0-9() .-]{6,30}$/.test(f.nroCelular?.trim() ?? '')) e.nroCelular = 'Ingresá un teléfono válido (6 a 30 caracteres)'

    if (!f.especialidades.length || f.especialidades.length > 8 || f.especialidades.some(x => !x.trim() || x.length > 100)) e.especialidades = 'Ingresá entre 1 y 8 especialidades de hasta 100 caracteres'

    if (String(f.aniosExperiencia).trim() === '' || !Number.isInteger(Number(f.aniosExperiencia)) || Number(f.aniosExperiencia) < 0 || Number(f.aniosExperiencia) > 80) e.aniosExperiencia = 'Ingresá entre 0 y 80 años'

    if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(f.honorarios))) e.honorarios = 'Ingresá un importe válido, con hasta 2 decimales'

    return e

  }



  async function handleSave() {

    if (!form || !user) return

    const e = validate(form); setErrors(e)

    if (Object.keys(e).length) return

    setSaving(true); setError('')

    try {

      const actualizado: Abogado = await modificarMiPerfilAbogado({

        nombre: form.nombre.trim(), apellido: form.apellido.trim(), fechaNacimiento: form.fechaNacimiento,

        mail: form.mail.trim(), nroCelular: form.nroCelular?.trim(), domicilio: form.domicilio.trim(),

        especialidades: form.especialidades, aniosExperiencia: Number(form.aniosExperiencia), honorarios: Number(form.honorarios),

        ubicacion: form.ubicacion.trim(), direccionProfesional: form.direccionProfesional.trim(), descripcionProfesional: form.descripcionProfesional.trim(),

      })

      setUser(actualizado); setForm(actualizado); setEditing(false); setSaved(true); onUpdated()

      setTimeout(() => setSaved(false), 3000)

    } catch (ex) { setError((ex as Error).message) } finally { setSaving(false) }

  }



  if (loadError) return <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20"><Notice kind="err" title="No pudimos cargar tus datos">{loadError}</Notice><button onClick={() => { setLoadError(''); setLoadVersion(v => v + 1) }} className="btn btn-secondary mt-4">Reintentar consulta</button></div>

  if (!user || !form) return <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20"><Notice kind="wait" title="Cargando tus datos…" /></div>



  function renderField(id: keyof Abogado, label: string, type = 'text') {

    return <Field label={label} id={`pf-${id}`} type={type} value={String(form![id] ?? '')} onChange={v => set(id, v)} error={errors[id]} />

  }



  return (

    <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20 fade-up">

      <div className="flex flex-wrap items-center gap-5">

        <span className="w-16 h-16 rounded-full bg-gold-500 text-[#0b1020] text-xl font-bold grid place-items-center" aria-hidden="true">{user.nombre[0]}{user.apellido[0]}</span>

        <div className="flex-1 min-w-0">

          <h1 className="text-[28px] font-bold leading-tight">{user.nombre} {user.apellido}</h1>

          <p className="text-ink-2 text-sm mt-1 flex flex-wrap items-center gap-2">{user.mail}

            <span className="text-[12px] font-semibold text-sky-400 bg-sky-400/10 rounded-full px-2 py-0.5">Abogado</span>

            {user.verificacionDni === 'APROBADA' && <span className="text-[12px] font-semibold text-ok bg-ok/10 rounded-full px-2 py-0.5 inline-flex items-center gap-1"><Icon name="shield" className="w-3.5 h-3.5" />Identidad verificada</span>}

          </p>

        </div>

        <button onClick={() => navigate('history')} className="btn btn-secondary btn-sm"><Icon name="list" className="w-4 h-4" />Historial de consultas</button>

      </div>



      {saved && <div className="mt-6"><Notice kind="ok" title="Datos actualizados correctamente" /></div>}

      {error && <div className="mt-6"><Notice kind="err" title="No pudimos completar la operación">{error}</Notice></div>}




      <section aria-labelledby="estado-title" className="card mt-8 px-6 py-5">
        <h2 id="estado-title" className="text-lg font-semibold">Estado de la cuenta</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {[
            ['Estado', ({ REGISTRADO: 'Registrado', PENDIENTE: 'Pendiente', BAJA: 'De baja' } as Record<string, string>)[user.estado] || user.estado],
            ['Fecha de registro', fechaAr(user.fechaRegistro)],
            ['Correo', user.correoConfirmado ? 'Confirmado' : 'Pendiente de confirmación'],
            ['Identidad', user.verificacionDni === 'APROBADA' ? 'Verificada' : 'Pendiente de verificación'],
            ['Matrícula profesional', user.validacionMatricula === 'VALIDADA' ? 'Validada' : 'Pendiente de validación'],
          ].map(([label, value]) => <div key={label}><dt className="text-[13px] text-ink-3">{label}</dt><dd className="mt-0.5 font-medium">{value || '—'}</dd></div>)}
        </dl>
      </section>

      <section aria-labelledby="datos-title" className="card mt-8">

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-line">

          <div>

            <h2 id="datos-title" className="text-lg font-semibold">Datos personales y profesionales</h2>

            <p className="text-[13px] text-ink-3 mt-0.5">Consultá y modificá tu información.</p>

          </div>

          {!editing ? (

            <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm"><Icon name="edit" className="w-4 h-4" />Editar</button>

          ) : (

            <div className="flex gap-2">

              <button onClick={() => { setEditing(false); setForm(user); setErrors({}); setError('') }} disabled={saving} className="btn btn-ghost btn-sm">Cancelar</button>

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

            {renderField('domicilio', 'Domicilio')}

            <div><label htmlFor="pf-matrícula" className="label">Matrícula profesional</label><input id="pf-matrícula" className="field" disabled value={user.nroMatricula} /><p className="mt-1.5 text-[13px] text-ink-3">La matrícula no puede modificarse.</p></div>

            <div><label className="label">Colegio profesional</label><input className="field" disabled value={user.colegioProfesional} /></div>

            <div><label className="label">Provincia de matrículacion</label><input className="field" disabled value={user.provincia} /><p className="mt-1.5 text-[13px] text-ink-3">Datos vinculados a la matrícula validada.</p></div>

            <Field label="Especialidades (separadas por coma)" id="pf-especialidades" value={form.especialidades.join(',')} onChange={v => setForm(f => f && ({ ...f, especialidades: v.split(',') }))} error={errors.especialidades} />

            {renderField('aniosExperiencia', 'Años de experiencia', 'number')}

            {renderField('honorarios', 'Honorarios', 'number')}

            {renderField('ubicacion', 'Ubicación profesional')}

            {renderField('direccionProfesional', 'Dirección profesional')}

            {renderField('descripcionProfesional', 'Descripción profesional')}



          </div>

        ) : (

          <dl className="grid grid-cols-1 sm:grid-cols-2">

            {([

              ['Domicilio', user.domicilio || '—'],

              ['Matrícula', user.nroMatricula],

              ['Colegio profesional', user.colegioProfesional],

              ['Provincia', user.provincia],

              ['Especialidades', user.especialidades.join(', ')],

              ['Años de experiencia', String(user.aniosExperiencia)],

              ['Honorarios', String(user.honorarios)],

              ['Ubicación', user.ubicacion],

              ['Dirección profesional', user.direccionProfesional],

              ['Descripción profesional', user.descripcionProfesional],

              ['Género', user.genero || '—'],
              ['Nombre', user.nombre],

              ['Apellido', user.apellido],

              ['DNI', user.dni],

              ['Fecha de nacimiento', fechaAr(user.fechaNacimiento)],

              ['Email', user.mail],

              ['Teléfono', user.nroCelular || '—'],

            ] as const).map(([label, value], i) => (

              <div key={label} className={`px-6 py-4 border-line border-b ${i % 2 === 0 ? 'sm:border-r' : ''}`}>

                <dt className="text-[13px] text-ink-3">{label}</dt>

                <dd className="mt-0.5 font-medium tabular wrap-break-word">{value}</dd>

              </div>

            ))}

          </dl>

        )}

      </section>




      <section aria-labelledby="baja-title" className="mt-14 rounded-2xl border border-err/20 px-6 py-6 flex flex-wrap items-center justify-between gap-5">
        <div className="max-w-lg">
          <h2 id="baja-title" className="font-semibold">Dar de baja la cuenta</h2>
          <p className="text-sm text-ink-2 mt-1">Tu cuenta quedará deshabilitada y no podrás volver a iniciar sesión con ella.</p>
        </div>
        <button disabled={saving} onClick={() => { setDeleteError(''); setShowDeleteModal(true) }} className="btn btn-danger btn-sm"><Icon name="trash" className="w-4 h-4" />Solicitar baja</button>
      </section>
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 grid place-items-center p-4 bg-black/70 backdrop-blur-sm fade-in" onClick={e => { if (e.target === e.currentTarget) closeDelete() }}>
          <form onSubmit={handleDelete} role="dialog" aria-modal="true" aria-labelledby="baja-confirm-title" className="card w-full max-w-md p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]" noValidate>
            <span className="w-11 h-11 rounded-full bg-err/10 text-err grid place-items-center"><Icon name="warn" /></span>
            <h3 id="baja-confirm-title" className="mt-4 text-lg font-semibold">Confirmar baja del abogado</h3>
            <p className="text-sm text-ink-2 mt-1.5">Al confirmar, tu cuenta quedará De baja y se cerrará tu sesión. Esta operación no se puede deshacer desde el perfil.</p>
            <label htmlFor="baja-correo" className="block text-sm text-ink-2 mt-4">Escribí tu correo para confirmar.</label>
            <input id="baja-correo" type="email" autoFocus autoComplete="off" disabled={deleting} className="field mt-2" placeholder={user.mail} value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} aria-describedby="baja-error" />
            {deleteError && <div id="baja-error" className="mt-4"><Notice kind="err" title="No pudimos registrar la baja">{deleteError}</Notice></div>}
            <div className="mt-5 flex gap-2 justify-end">
              <button type="button" disabled={deleting} onClick={closeDelete} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={deleting} className="btn btn-danger-solid">{deleting ? 'Registrando baja...' : 'Confirmar baja'}</button>
            </div>
          </form>
        </div>
      )}
    </div>

  )

}

