import { useId, useState } from 'react'
import { crearBorradorContacto, mensajeContacto, simularContacto } from './services/contactoPrueba.js'

type Perfil = { nombre: string; apellido: string; perfilPrueba: boolean }

export default function ContactoPrueba({ abogado, consulta, orientacion }: {
  abogado: Perfil; consulta: string; orientacion: string;
}) {
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState(() => crearBorradorContacto(consulta, orientacion))
  const [confirmado, setConfirmado] = useState<string | null>(null)
  const [resultado, setResultado] = useState('')
  const [error, setError] = useState('')
  if (!abogado.perfilPrueba) return null
  const mensaje = mensajeContacto(abogado, datos)
  const completo = Object.values(datos).every(value => value.trim())

  function editar(campo: keyof typeof datos, valor: string) {
    setDatos(prev => ({ ...prev, [campo]: valor }))
    setConfirmado(null)
    setResultado('')
    setError('')
  }
  function cerrar() {
    setAbierto(false)
    setDatos(crearBorradorContacto(consulta, orientacion))
    setConfirmado(null)
    setResultado('')
    setError('')
  }

  return <div className="pt-2">
    <button type="button" className="btn btn-primary btn-sm" aria-expanded={abierto} aria-controls={`${id}-form`}
      onClick={() => abierto ? cerrar() : setAbierto(true)}>Contactar abogado</button>
    {abierto && <form id={`${id}-form`} className="mt-3 space-y-3 border-t border-line pt-3" onSubmit={e => {
      e.preventDefault()
      try {
        simularContacto(abogado, datos, confirmado)
        setResultado('Contacto simulado. No se envió ningún mensaje ni se abrió WhatsApp. Nadie recibió tus datos.')
        setConfirmado(null)
        setError('')
      } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo simular el contacto.') }
    }}>
      <p className="text-gold-400">Demostración: usá nombre y teléfono ficticios. No se contactará a ninguna persona.</p>
      <label className="block" htmlFor={`${id}-nombre`}>Nombre
        <input id={`${id}-nombre`} className="field mt-1 w-full" required maxLength={100} autoComplete="off"
          value={datos.nombre} onChange={e => editar('nombre', e.target.value)} />
      </label>
      <label className="block" htmlFor={`${id}-telefono`}>Teléfono
        <input id={`${id}-telefono`} className="field mt-1 w-full" type="tel" required maxLength={40} autoComplete="off"
          value={datos.telefono} onChange={e => editar('telefono', e.target.value)} />
      </label>
      <label className="block" htmlFor={`${id}-descripcion`}>Descripción del caso
        <textarea id={`${id}-descripcion`} className="field mt-1 w-full" rows={3} required maxLength={6000}
          value={datos.descripcion} onChange={e => editar('descripcion', e.target.value)} />
      </label>
      <label className="block" htmlFor={`${id}-resumen`}>Resumen breve y editable
        <textarea id={`${id}-resumen`} className="field mt-1 w-full" rows={5} required maxLength={2000}
          aria-describedby={`${id}-ayuda`} value={datos.resumen} onChange={e => editar('resumen', e.target.value)} />
      </label>
      <p id={`${id}-ayuda`} className="text-xs text-ink-2">Se incluyen extractos de tu consulta y de la orientación de Lexi, sin agregar hechos. Revisalos y editá lo que quieras compartir. La orientación no constituye asesoramiento profesional.</p>
      <section aria-label="Vista previa del mensaje para WhatsApp" className="rounded-lg border border-line p-3 space-y-2">
        <h4 className="font-semibold">Vista previa del mensaje para WhatsApp</h4>
        <p className="text-xs text-ink-2">Destinatario ficticio: {abogado.nombre} {abogado.apellido}. Sin número de destino.</p>
        <p className="whitespace-pre-wrap break-words">{mensaje}</p>
      </section>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={confirmado === mensaje} disabled={!completo || !!resultado}
          onChange={e => setConfirmado(e.target.checked ? mensaje : null)} />
        <span>Revisé el mensaje y confirmo que quiero compartir estos datos con el abogado seleccionado. En esta demostración, autorizo únicamente la simulación; no se enviará nada.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!completo || confirmado !== mensaje || !!resultado}>Simular contacto</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={cerrar}>Cerrar y descartar</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {resultado && <p role="status" className="text-gold-400">{resultado}</p>}
    </form>}
  </div>
}
