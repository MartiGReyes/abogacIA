import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSesion } from './AuthContext'
import { Notice } from './ui'
import { AVISO_CONTACTO, mensajeWhatsApp, prepararContacto } from './services/contactoService.js'
export type PerfilContacto = {
  referencia: { tipo: string; id: string }; idAbogado: number | string; nombre: string; apellido: string;
  especialidades: string[]; perfilPrueba: boolean; contactoHabilitado: boolean; telefonoEnmascarado?: string;
  cuentaPrueba?: boolean; matriculaVerificada?: boolean; ubicacion?: string; provincia?: string; descripcionProfesional?: string;
  honorarios?: number | string | null; aniosExperiencia?: number; tipoPerfil?: string;
}
export default function FormularioContacto({ abogado, consulta = '' }: { abogado: PerfilContacto; consulta?: string }) {
  const id = useId()
  const sesion = useSesion() as { rol: string } | null
  const ciudadano = sesion?.rol === 'CIUDADANO'
  const location = useLocation()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState({ nombre: '', telefono: '', resumen: consulta.slice(0, 800) })
  const [consentimiento, setConsentimiento] = useState('')
  const [preparado, setPreparado] = useState<{ url: string; aviso: string; firma: string; continuar: boolean } | null>(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const ventana = useRef<Window | null>(null)
  const montado = useRef(true)
  const revision = useRef(0)
  const mensaje = mensajeWhatsApp(abogado, datos)
  const firma = `${abogado.referencia.tipo}:${abogado.referencia.id}:${mensaje}`
  const firmaActual = useRef(firma)
  useEffect(() => { firmaActual.current = firma }, [firma])
  useEffect(() => { montado.current = true; return () => { montado.current = false; ventana.current?.close() } }, [])
  useEffect(() => {
    const cambiar = (e: Event) => {
      if ((e as CustomEvent<{ id: string }>).detail.id === id) return
      revision.current++; ventana.current?.close(); ventana.current = null
      setAbierto(false); setDatos({ nombre: '', telefono: '', resumen: '' }); setConsentimiento(''); setPreparado(null); setError('')
    }
    window.addEventListener('seleccion-contacto', cambiar)
    return () => window.removeEventListener('seleccion-contacto', cambiar)
  }, [id])
  const completo = Object.values(datos).every(v => v.trim())
  function editar(campo: keyof typeof datos, valor: string) { revision.current++; setDatos(d => ({ ...d, [campo]: valor })); setConsentimiento(''); setPreparado(null); setError('') }
  function cerrar() { revision.current++; ventana.current?.close(); ventana.current = null; setAbierto(false); setDatos({ nombre: '', telefono: '', resumen: '' }); setConsentimiento(''); setPreparado(null); setError('') }
  const abrirFormulario = useCallback(() => { window.dispatchEvent(new CustomEvent('seleccion-contacto', { detail: { id } })); revision.current++; setDatos({ nombre: '', telefono: '', resumen: consulta.slice(0, 800) }); setConsentimiento(''); setPreparado(null); setError(''); setAbierto(true) }, [id, consulta])
  useEffect(() => {
    const pendiente = location.state?.contactoPendiente
    if (!ciudadano || !abogado.contactoHabilitado || pendiente?.tipo !== abogado.referencia.tipo || pendiente?.id !== abogado.referencia.id) return
    // oxlint-disable-next-line react/set-state-in-effect -- Resume an explicitly selected contact after login.
    abrirFormulario()
    navigate(location.pathname + location.search + location.hash, { replace: true, state: null })
  }, [ciudadano, abogado.contactoHabilitado, abogado.referencia.tipo, abogado.referencia.id, location, navigate, abrirFormulario])
  function seleccionar() {
    if (!ciudadano) { navigate('/iniciar-sesion', { state: { contactoPendiente: abogado.referencia } }); return }
    abrirFormulario()
  }
  async function abrir(e: React.FormEvent) {
    e.preventDefault(); if (!ciudadano || !completo || consentimiento !== firma) return
    const version = revision.current
    ventana.current = window.open('about:blank', '_blank')
    if (ventana.current) ventana.current.opener = null
    setOcupado(true); setError('')
    try {
      const data = await prepararContacto(abogado, datos, consentimiento === firma ? mensaje : '')
      if (!montado.current || firmaActual.current !== firma || revision.current !== version) { ventana.current?.close(); return }
      setPreparado({ ...data, firma, continuar: !ventana.current || ventana.current.closed })
      if (ventana.current && !ventana.current.closed) { ventana.current.location.replace(data.url); ventana.current = null }
    } catch (e) { ventana.current?.close(); ventana.current = null; if (montado.current) { setError((e as Error).message); setPreparado(null) } } finally { if (montado.current) setOcupado(false) }
  }
  if (!abogado.contactoHabilitado) return <div className="mt-3"><button type="button" className="btn btn-primary btn-sm" disabled>Contactar</button><p className="text-sm text-ink-2 mt-2" role="status">Contacto no disponible</p></div>
  return <div className="mt-3 min-w-0 break-words [&_.btn]:max-w-full [&_.btn]:whitespace-normal [&_.btn]:h-auto [&_.btn]:min-h-10 [&_.btn]:py-2">
    <button type="button" className="btn btn-primary btn-sm" aria-expanded={abierto && ciudadano} aria-controls={ciudadano ? `${id}-form` : undefined} onClick={() => abierto && ciudadano ? cerrar() : seleccionar()}>Contactar</button>
    {!ciudadano && <p className="text-xs text-ink-2 mt-2">Iniciá sesión como ciudadano para completar el formulario.</p>}
    {abierto && ciudadano && <form id={`${id}-form`} aria-label="Formulario de contacto" data-componente="FormularioContacto" className="mt-4 space-y-3 border-t border-line pt-4" onSubmit={abrir} autoComplete="off">
      <h3 className="font-semibold">Contactar a {abogado.nombre} {abogado.apellido}</h3>
      {abogado.perfilPrueba && <p className="text-gold-400 font-semibold">Cuenta de prueba — matrícula no verificada</p>}
      <p className="text-sm text-ink-2">Destino registrado: {abogado.telefonoEnmascarado || 'Disponible al confirmar'}</p>
      <label className="block" htmlFor={`${id}-nombre`}>Nombre del ciudadano</label><input id={`${id}-nombre`} className="field w-full" required maxLength={100} value={datos.nombre} onChange={e => editar('nombre', e.target.value)} />
      <label className="block" htmlFor={`${id}-telefono`}>Número de contacto del ciudadano</label><input id={`${id}-telefono`} type="tel" className="field w-full" required maxLength={35} placeholder="+54 9, área y número" value={datos.telefono} onChange={e => editar('telefono', e.target.value)} />
      <label className="block" htmlFor={`${id}-resumen`}>Resumen editable de la consulta</label><textarea id={`${id}-resumen`} className="field w-full" rows={4} required maxLength={800} value={datos.resumen} onChange={e => editar('resumen', e.target.value)} />
      <p className="text-xs text-ink-2">No incluyas DNI, matrícula ni información sensible innecesaria. La respuesta de Lexi no se agrega automáticamente.</p>
      <section className="rounded-xl bg-navy-800 p-3" aria-label="Vista previa del mensaje"><h4 className="font-semibold mb-2">Vista previa del mensaje</h4><p className="whitespace-pre-wrap">{mensaje}</p></section>
      <label className="flex gap-2 text-sm"><input type="checkbox" className="mt-1 shrink-0" disabled={!completo || ocupado} checked={consentimiento === firma} onChange={e => { setConsentimiento(e.target.checked ? firma : ''); setPreparado(null) }} /><span>Revisé el destinatario y el mensaje y autorizo compartir estos datos con WhatsApp/Meta y el destinatario. WhatsApp mostrará mi cuenta remitente; el enlace con el texto puede quedar en el historial. Aviso {AVISO_CONTACTO}.</span></label>
      <div className="flex flex-wrap gap-2"><button type="submit" className="btn btn-primary btn-sm" disabled={!completo || consentimiento !== firma || ocupado}>{ocupado ? 'Preparando…' : 'Abrir WhatsApp'}</button><button type="button" className="btn btn-secondary btn-sm" disabled={ocupado} onClick={cerrar}>Cerrar y descartar</button></div>
      {error && <Notice kind="err" title={error} />}
      {preparado && preparado.firma === firma && consentimiento === firma && <Notice kind="info" title="Mensaje preparado"><p>{preparado.aviso}</p>{preparado.continuar && <a href={preparado.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="btn btn-primary btn-sm mt-3">Continuar en WhatsApp</a>}</Notice>}
    </form>}
  </div>
}
