import { useEffect, useState } from 'react'
import { adminService } from '../services/adminService.js'

type Tipo = 'ciudadanos' | 'abogados'
type Cuenta = { id: number; nombre: string | null; apellido: string | null; estadoCuenta: string }
type Listado = { contenido: Cuenta[]; total: number; paginas: number }
type Resumen = { matriculasAlmacenadas: number; filas: number; versiones: string[] }
type Importacion = { filas: number; matriculas: number; retiradas: number; versionArchivo: string }

export function AccionCuenta({ tipo, cuenta, actualizado }: { tipo: Tipo; cuenta: Cuenta; actualizado: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const accion = cuenta.estadoCuenta === 'SUSPENDIDO' ? 'rehabilitar' : 'suspender'
  if (!['REGISTRADO', 'PENDIENTE', 'SUSPENDIDO'].includes(cuenta.estadoCuenta)) return <p className="text-xs mt-2">Sin acciones para este estado.</p>
  async function ejecutar() {
    if (ocupado) return
    setOcupado(true); setError('')
    try { await adminService.cambiarCuenta(tipo, cuenta.id, accion, true); setConfirmando(false); actualizado() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.') }
    finally { setOcupado(false) }
  }
  return <div className="mt-3 space-y-2">
    {!confirmando ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setError(''); setConfirmando(true) }}>{accion === 'suspender' ? 'Suspender cuenta' : 'Rehabilitar cuenta'}</button> : <div className="border border-line rounded-lg p-3" role="group" aria-label="Confirmar cambio de cuenta">
      <p>¿Confirmás {accion} la cuenta de {cuenta.nombre || 'Sin nombre'} {cuenta.apellido} (#{cuenta.id})?</p>
      <p className="text-xs mt-1">{accion === 'suspender' ? 'Se bloqueará el acceso de esta cuenta mientras esté suspendida.' : 'Se volverán a comprobar los requisitos de registro y la matrícula, si corresponde. La cuenta puede quedar pendiente.'}</p>
      <div className="flex flex-wrap gap-2 mt-2"><button type="button" className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => void ejecutar()}>{ocupado ? 'Guardando…' : 'Confirmar'}</button><button type="button" className="btn btn-secondary btn-sm" disabled={ocupado} onClick={() => setConfirmando(false)}>Cancelar</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>
}

export function AdminUsuarios() {
  const [tipo, setTipo] = useState<Tipo>('ciudadanos')
  const [texto, setTexto] = useState('')
  const [filtros, setFiltros] = useState({ q: '', pagina: 0 })
  const [revision, setRevision] = useState(0)
  const [lista, setLista] = useState<Listado | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  function recargar() { setCargando(true); setError(''); setRevision(r => r + 1) }
  useEffect(() => {
    const controller = new AbortController()
    adminService[tipo]({ ...filtros, tamano: 20 }, controller.signal).then(datos => {
      if (!controller.signal.aborted) { setLista(datos); setCargando(false) }
    }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setCargando(false) } })
    return () => controller.abort()
  }, [tipo, filtros, revision])
  return <><h2 className="text-xl font-semibold mb-3">Suspender y rehabilitar usuarios</h2>
    <p className="mb-4 text-ink-2">La suspensión es temporal. La rehabilitación conserva las verificaciones y no reactiva cuentas dadas de baja.</p>
    <form className="flex flex-wrap gap-3 items-end mb-5" onSubmit={e => { e.preventDefault(); setCargando(true); setError(''); setFiltros({ q: texto.trim(), pagina: 0 }); setMensaje('') }}>
      <label>Tipo de cuenta<select className="field block" value={tipo} onChange={e => { setCargando(true); setError(''); setTipo(e.target.value as Tipo); setTexto(''); setLista(null); setFiltros({ q: '', pagina: 0 }); setMensaje('') }}><option value="ciudadanos">Ciudadanos</option><option value="abogados">Abogados</option></select></label>
      <label>Nombre o apellido<input className="field block" maxLength={100} value={texto} onChange={e => setTexto(e.target.value)} /></label>
      <button type="submit" className="btn btn-primary">Buscar usuarios</button>
      <button type="button" className="btn btn-secondary" onClick={recargar}>Actualizar listado</button>
    </form>
    {mensaje && <p role="status" className="mb-3">{mensaje}</p>}
    {cargando && <p role="status">Cargando usuarios…</p>}
    {error && <p role="alert">{error}</p>}
    {!cargando && !error && lista && <><p className="mb-3">{lista.total} resultados</p>
      {!lista.contenido.length ? <p>No se encontraron usuarios.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Gestión de cuentas de {tipo}</caption><thead><tr>{['Usuario', 'Estado de cuenta', 'Acciones'].map(t => <th key={t} className="p-3 border-b border-line" scope="col">{t}</th>)}</tr></thead><tbody>
        {lista.contenido.map(c => <tr key={`${tipo}-${c.id}`}><td className="p-3">{c.nombre || 'Sin nombre'} {c.apellido} <span className="text-ink-2">#{c.id}</span></td><td className="p-3">{c.estadoCuenta}</td><td className="p-3"><AccionCuenta tipo={tipo} cuenta={c} actualizado={() => { setMensaje('Operación completada. Se actualizó el estado de la cuenta.'); recargar() }} /></td></tr>)}
      </tbody></table></div>}
      <div className="flex gap-3 items-center my-5" aria-label="Paginación de usuarios"><button type="button" className="btn btn-secondary btn-sm" disabled={filtros.pagina === 0} onClick={() => { setCargando(true); setFiltros(f => ({ ...f, pagina: f.pagina - 1 })) }}>Anterior</button><span>Página {lista.paginas ? filtros.pagina + 1 : 0} de {lista.paginas}</span><button type="button" className="btn btn-secondary btn-sm" disabled={filtros.pagina + 1 >= lista.paginas} onClick={() => { setCargando(true); setFiltros(f => ({ ...f, pagina: f.pagina + 1 })) }}>Siguiente</button></div>
    </>}
  </>
}

export function AdminPadron() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [confirmacion, setConfirmacion] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [errorConsulta, setErrorConsulta] = useState('')
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [resultado, setResultado] = useState<Importacion | null>(null)
  const [revision, setRevision] = useState(0)
  function recargar() { setCargando(true); setErrorConsulta(''); setRevision(r => r + 1) }
  useEffect(() => {
    const controller = new AbortController()
    adminService.padron(controller.signal).then(datos => { if (!controller.signal.aborted) { setResumen(datos); setCargando(false) } })
      .catch(e => { if (!controller.signal.aborted) { setErrorConsulta(e.message); setCargando(false) } })
    return () => controller.abort()
  }, [revision])
  async function actualizar() {
    if (ocupado) return
    setOcupado(true); setError(''); setResultado(null)
    try { const datos = await adminService.actualizarPadron(archivo, confirmacion); setResultado(datos); setConfirmacion(false); recargar() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar el padrón.') }
    finally { setOcupado(false) }
  }
  return <><h2 className="text-xl font-semibold mb-3">Actualizar padrón profesional</h2>
    <p className="mb-4">Cargá un Excel .xlsx de hasta 8 MiB con el formato del padrón de Río Tercero: Hoja1, Hoja2, Hoja3, Hoja4 y Hoja5. No se admiten otros formatos de colegios.</p>
    <section className="card p-4 mb-5" aria-label="Estado del padrón">
      {cargando && <p role="status">Consultando padrón…</p>}{errorConsulta && <p role="alert">{errorConsulta}</p>}
      {!cargando && !errorConsulta && resumen && <><p>{resumen.filas} filas de evidencia actuales; {resumen.matriculasAlmacenadas} matrículas almacenadas, incluidas las retiradas.</p><p className="text-sm break-all">Versión del archivo: {resumen.versiones.join(', ') || 'Sin padrón cargado'}</p></>}
      <button type="button" className="btn btn-secondary btn-sm mt-3" disabled={ocupado} onClick={recargar}>Consultar estado actual</button>
    </section>
    <form className="card p-5 space-y-4" onSubmit={e => { e.preventDefault(); void actualizar() }}>
      <label className="block">Archivo del padrón<input className="field block w-full" type="file" accept=".xlsx" required disabled={ocupado} onChange={e => { setArchivo(e.target.files?.[0] || null); setConfirmacion(false); setError(''); setResultado(null) }} /></label>
      {archivo && <p>{archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MiB</p>}
      <p>El archivo se valida antes de reemplazar las evidencias. Las matrículas ausentes quedan inactivas y se conservan las referencias de las cuentas. La actualización se utilizará en registros, nuevos inicios de sesión y recomendaciones.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={confirmacion} disabled={ocupado} onChange={e => setConfirmacion(e.target.checked)} required /><span>Confirmo que quiero reemplazar el padrón actual por este archivo.</span></label>
      <button type="submit" className="btn btn-primary" disabled={ocupado || !archivo || !confirmacion}>{ocupado ? 'Validando y actualizando…' : 'Actualizar padrón'}</button>
      {error && <p role="alert">{error}</p>}
      {resultado && <div role="status"><p>Padrón actualizado: {resultado.filas} filas, {resultado.matriculas} matrículas en el archivo y {resultado.retiradas} matrículas anteriores ausentes.</p><p className="text-xs break-all">Versión: {resultado.versionArchivo}</p></div>}
    </form>
  </>
}
