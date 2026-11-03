import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useSesion } from '../AuthContext'
import { adminService, puedeAdministrar } from '../services/adminService.js'
import { AccionCuenta } from './AdminGestion'
import { crearSelectorIdentidad } from '../services/selectorIdentidad.js'

type Indicadores = { total: number; porEstado: { estado: string; cantidad: number }[]; consultadoEn: string }
type Fila = { id: number; nombre: string | null; apellido: string | null; estadoCuenta: string; estadoIdentidad: string | null; estadoMatricula: string | null; matriculaVerificada: boolean | null; fechaRegistro: string | null }
type Listado = { contenido: Fila[]; pagina: number; tamano: number; total: number; paginas: number }
type Identidad = { id: number; estadoCuenta: string; estadoIdentidad: string; estadoSesion: string; inicio: string | null; ultimaConsulta: string | null; consentimientoFecha: string | null }
type Recurso<T> = { cargando: boolean; datos?: T; error?: string }
const fecha = (valor: string | null) => valor ? new Date(valor).toLocaleString('es-AR') : 'No disponible'
const estado = (valor: string | null) => valor || 'SIN_RESULTADO'

export function AdminProtegido({ children, soloLectura = false }: { children: ReactNode; soloLectura?: boolean }) {
  const sesion = useSesion()
  if (!sesion) return <Navigate to="/admin/iniciar-sesion" replace />
  if (!puedeAdministrar(sesion)) return <div className="pt-24 px-6" role="alert">Acceso exclusivo para administradores.</div>
  return <div className="max-w-7xl mx-auto pt-24 pb-12 px-5 sm:px-8">
    <h1 className="text-2xl font-semibold">Administración</h1>
    <nav aria-label="Administración" className="flex flex-wrap gap-4 my-5">
      <Link className="link" to="/admin">Panel de control</Link>
      <Link className="link" to="/admin/abogados">Abogados registrados</Link>
      {!soloLectura && <><Link className="link" to="/admin/usuarios">Gestionar usuarios</Link><Link className="link" to="/admin/padron">Actualizar padrón</Link></>}
      <Link className="link" to="/admin/identidad">Verificación de identidad</Link>
    </nav>
    {children}
  </div>
}

function ErrorConsulta({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }) {
  return <div role="alert" className="border border-line rounded-xl p-4 space-y-3"><p>{mensaje}</p><button type="button" className="btn btn-secondary btn-sm" onClick={reintentar}>Reintentar</button></div>
}

function Indicador({ tipo }: { tipo: 'ciudadanos' | 'abogados' }) {
  const [recurso, setRecurso] = useState<Recurso<Indicadores>>({ cargando: true })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    adminService.indicadores(tipo, controller.signal).then(datos => {
      if (!controller.signal.aborted) setRecurso({ cargando: false, datos })
    }).catch(error => { if (!controller.signal.aborted) setRecurso({ cargando: false, error: error.message }) })
    return () => controller.abort()
  }, [tipo, revision])
  return <section aria-label={`Indicadores de ${tipo}`} className="card p-5 space-y-3">
    <h3 className="text-lg font-semibold capitalize">{tipo}</h3>
    {recurso.cargando && <p role="status">Cargando indicadores…</p>}
    {recurso.error && <ErrorConsulta mensaje={recurso.error} reintentar={() => { setRecurso({ cargando: true }); setRevision(r => r + 1) }} />}
    {recurso.datos && <><p className="text-3xl font-semibold">{recurso.datos.total} <span className="text-sm">cuentas en total</span></p>
      <dl>{recurso.datos.porEstado.map(c => <div key={c.estado} className="flex justify-between gap-4 py-1"><dt>{c.estado}</dt><dd>{c.cantidad}</dd></div>)}</dl>
      <p className="text-xs text-ink-2">Consultado: {fecha(recurso.datos.consultadoEn)}</p></>}
  </section>
}

export function AdminPanel() {
  return <><h2 className="text-xl font-semibold mb-4">Panel de control</h2>
    <p className="text-ink-2 mb-4">Totales de cuentas por estado. Los indicadores de cada servicio se consultan por separado.</p>
    <div className="grid md:grid-cols-2 gap-4"><Indicador tipo="ciudadanos" /><Indicador tipo="abogados" /></div></>
}

export function AdminAbogados({ soloLectura = false }: { soloLectura?: boolean }) {
  const vacios = { q: '', estado: '', identidad: '', matricula: '', tamano: 20 }
  const [formulario, setFormulario] = useState(vacios)
  const [filtros, setFiltros] = useState({ ...vacios, pagina: 0 })
  const [recurso, setRecurso] = useState<Recurso<Listado>>({ cargando: true })
  const [revision, setRevision] = useState(0)
  function buscar(siguiente: typeof filtros) { setRecurso({ cargando: true }); setFiltros(siguiente) }
  useEffect(() => {
    const controller = new AbortController()
    adminService.abogados(filtros, controller.signal).then(datos => {
      if (!controller.signal.aborted) setRecurso({ cargando: false, datos })
    }).catch(error => { if (!controller.signal.aborted) setRecurso({ cargando: false, error: error.message }) })
    return () => controller.abort()
  }, [filtros, revision])
  return <><h2 className="text-xl font-semibold mb-4">Abogados registrados</h2>
    <form className="card p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5" onSubmit={e => { e.preventDefault(); buscar({ ...formulario, pagina: 0 }) }}>
      <label>Nombre o apellido<input className="field w-full" maxLength={100} value={formulario.q} onChange={e => setFormulario({ ...formulario, q: e.target.value })} /></label>
      {([
        ['estado', 'Estado de cuenta', ['PENDIENTE', 'REGISTRADO', 'SUSPENDIDO', 'BAJA']],
        ['identidad', 'Identidad', ['PENDIENTE', 'APROBADA', 'RECHAZADA']],
        ['matricula', 'Matrícula', ['VALIDADA', 'INEXISTENTE', 'INACTIVA', 'DNI_DISTINTO', 'PENDIENTE_REVISION']],
      ] as const).map(([campo, label, valores]) => <label key={campo}>{label}<select className="field w-full" value={formulario[campo]} onChange={e => setFormulario({ ...formulario, [campo]: e.target.value })}>
        <option value="">Todos</option>{valores.map(valor => <option key={valor}>{valor}</option>)}
      </select></label>)}
      <label>Resultados por página<select className="field w-full" value={formulario.tamano} onChange={e => setFormulario({ ...formulario, tamano: Number(e.target.value) })}>{[10, 20, 50].map(n => <option key={n}>{n}</option>)}</select></label>
      <div className="flex flex-wrap gap-2 items-end"><button className="btn btn-primary" type="submit">Buscar</button><button className="btn btn-secondary" type="button" onClick={() => { setFormulario(vacios); buscar({ ...vacios, pagina: 0 }) }}>Limpiar</button></div>
    </form>
    {recurso.cargando && <p role="status">Cargando abogados…</p>}
    {recurso.error && <ErrorConsulta mensaje={recurso.error} reintentar={() => { setRecurso({ cargando: true }); setRevision(r => r + 1) }} />}
    {recurso.datos && <>
      <p className="mb-3" role="status">{recurso.datos.total} resultados</p>
      {!recurso.datos.contenido.length ? <p>No se encontraron abogados para estos filtros.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">Cuentas de abogados y estados de verificación</caption>
        <thead><tr>{['Abogado', 'Cuenta', 'Identidad', 'Matrícula', 'Fecha de registro', 'Detalle'].map(c => <th key={c} scope="col" className="p-3 border-b border-line">{c}</th>)}</tr></thead>
        <tbody>{recurso.datos.contenido.map(a => <tr key={a.id}>
          <td className="p-3">{a.nombre || 'Sin nombre'} {a.apellido} <span className="text-ink-2">#{a.id}</span></td>
          <td className="p-3">{estado(a.estadoCuenta)}</td><td className="p-3">{estado(a.estadoIdentidad)}</td>
          <td className="p-3">{estado(a.estadoMatricula)}<br /><span className="text-ink-2">Sello: {a.matriculaVerificada ? 'Verificado' : 'No verificado'}</span></td>
          <td className="p-3">{a.fechaRegistro || 'No disponible'}</td><td className="p-3"><Link className="link" to={`/admin/identidad?tipo=abogados&id=${a.id}`}>Ver identidad<span className="sr-only"> de {a.nombre} {a.apellido}</span></Link>{!soloLectura && <AccionCuenta tipo="abogados" cuenta={a} actualizado={() => setRevision(r => r + 1)} />}</td>
        </tr>)}</tbody></table></div>}
      <div className="flex flex-wrap items-center gap-3 mt-5" aria-label="Paginación">
        <button type="button" className="btn btn-secondary btn-sm" disabled={filtros.pagina === 0} onClick={() => buscar({ ...filtros, pagina: filtros.pagina - 1 })}>Anterior</button>
        <span>Página {recurso.datos.paginas ? filtros.pagina + 1 : 0} de {recurso.datos.paginas}</span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={filtros.pagina + 1 >= recurso.datos.paginas} onClick={() => buscar({ ...filtros, pagina: filtros.pagina + 1 })}>Siguiente</button>
      </div>
    </>}
  </>
}

export function AdminIdentidad() {
  const { search } = useLocation()
  const parametros = new URLSearchParams(search)
  return <SelectorIdentidad key={search} tipoInicial={parametros.get('tipo') === 'abogados' ? 'abogados' : 'ciudadanos'} idInicial={parametros.get('id')} />
}

type CuentaIdentidad = Pick<Fila, 'id' | 'nombre' | 'apellido' | 'estadoCuenta' | 'estadoIdentidad'>
type EstadoSelector = {
  tipo: 'ciudadanos' | 'abogados'; q: string; pagina: number;
  lista: Recurso<{ contenido: CuentaIdentidad[]; total: number; paginas: number }>;
  seleccion: CuentaIdentidad | null; detalle: Recurso<Identidad>;
}

function SelectorIdentidad({ tipoInicial, idInicial }: { tipoInicial: 'ciudadanos' | 'abogados'; idInicial: string | null }) {
  const [selector] = useState(() => crearSelectorIdentidad(adminService, tipoInicial, idInicial))
  const { tipo, pagina, lista, seleccion, detalle } = useSyncExternalStore(selector.subscribe, selector.getSnapshot, selector.getSnapshot) as EstadoSelector
  const [busqueda, setBusqueda] = useState('')
  useEffect(() => { void selector.iniciar(); return () => selector.cancelar() }, [selector])
  const nombre = (cuenta: CuentaIdentidad) => [cuenta.nombre, cuenta.apellido].filter(Boolean).join(' ') || `Cuenta #${cuenta.id}`
  return <><h2 className="text-xl font-semibold mb-3">Resultado local de identidad</h2>
    <p className="text-ink-2 mb-4">Esta consulta muestra datos ya almacenados. No inicia verificaciones ni sincroniza con Didit.</p>
    <form className="flex flex-wrap gap-3 items-end mb-5" onSubmit={e => { e.preventDefault(); void selector.buscar(busqueda) }}>
      <label>Tipo de cuenta<select className="field block" value={tipo} onChange={e => { setBusqueda(''); void selector.cambiarTipo(e.target.value) }}><option value="ciudadanos">Ciudadano</option><option value="abogados">Abogado</option></select></label>
      <label>Nombre o apellido<input className="field block" maxLength={100} value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
      <button className="btn btn-primary" type="submit">Buscar cuentas</button>
    </form>
    {lista.cargando && <p role="status">Buscando cuentas…</p>}
    {lista.error && <ErrorConsulta mensaje={lista.error} reintentar={() => void selector.reintentarLista()} />}
    {lista.datos && <>
      <p className="mb-3" role="status">{lista.datos.total} cuentas encontradas</p>
      {!lista.datos.contenido.length ? <p>No se encontraron cuentas para esta búsqueda.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <caption className="sr-only">Seleccionar una cuenta para consultar su resultado local</caption>
          <thead><tr>{['Nombre', 'Apellido', 'Estado de cuenta', 'Estado de identidad', 'Acción'].map(label => <th className="p-3 border-b border-line" scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{lista.datos.contenido.map(cuenta => <tr key={cuenta.id} className={seleccion?.id === cuenta.id ? 'bg-navy-800' : ''}>
            <td className="p-3">{cuenta.nombre || 'Sin nombre'}</td><td className="p-3">{cuenta.apellido || 'Sin apellido'}</td>
            <td className="p-3">{estado(cuenta.estadoCuenta)}</td><td className="p-3">{estado(cuenta.estadoIdentidad)}</td>
            <td className="p-3"><button className="btn btn-secondary btn-sm" type="button" aria-pressed={seleccion?.id === cuenta.id} onClick={() => void selector.seleccionar(cuenta)}>
              Ver resultado local<span className="sr-only"> de {nombre(cuenta)}</span>
            </button></td>
          </tr>)}</tbody>
        </table></div>}
      <div className="flex flex-wrap items-center gap-3 my-5" aria-label="Paginación de cuentas">
        <button type="button" className="btn btn-secondary btn-sm" disabled={pagina === 0} onClick={() => void selector.pagina(pagina - 1)}>Anterior</button>
        <span>Página {lista.datos.paginas ? pagina + 1 : 0} de {lista.datos.paginas}</span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={pagina + 1 >= lista.datos.paginas} onClick={() => void selector.pagina(pagina + 1)}>Siguiente</button>
      </div>
    </>}
    {seleccion && <section className="card p-5" aria-label="Resultado de la cuenta seleccionada">
      <h3 className="font-semibold mb-3">{tipo === 'abogados' ? 'Abogado' : 'Ciudadano'}: {nombre(seleccion)}</h3>
      {detalle.cargando && <p role="status">Consultando resultado local…</p>}
      {detalle.error && <ErrorConsulta mensaje={detalle.error} reintentar={() => void selector.reintentarDetalle()} />}
      {detalle.datos && <>
        <dl className="space-y-2">{[
          ['Estado de cuenta', detalle.datos.estadoCuenta], ['Resultado de identidad', detalle.datos.estadoIdentidad],
          ['Estado local de sesión', detalle.datos.estadoSesion], ['Inicio de verificación', fecha(detalle.datos.inicio)],
          ['Última consulta registrada', fecha(detalle.datos.ultimaConsulta)], ['Consentimiento registrado', fecha(detalle.datos.consentimientoFecha)],
        ].map(([label, valor]) => <div key={label}><dt className="text-sm text-ink-2">{label}</dt><dd>{valor}</dd></div>)}</dl>
        <p className="text-xs text-ink-2 mt-4">La última consulta no equivale a la fecha de aprobación. Las fechas ausentes no se estiman.</p>
      </>}
    </section>}
  </>
}
