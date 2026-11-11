import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useSesion } from '../AuthContext'
import { Notice } from '../ui'
import { consultarDashboard, periodoDashboard } from '../services/dashboardAbogadoService.js'

type Fila = Record<string, string | number | null>
type Lista = { contenido: Fila[]; total: number; pagina: number; tamano: number; totales?: Fila[] }
type Resumen = { aceptadas: number; finalizados: number; valoraciones: { promedio: string | null; cantidad: number; distribucion: Fila[] }; historico: Fila[]; periodo: Fila[] }
type Mensual = { serie: Fila[]; total: string; anterior: string; moneda: string; mes: string; variacion: string | null }
const moneda = (importe: unknown, divisa = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency: divisa }).format(Number(importe)) + ` ${divisa}`
const fecha = (v: unknown) => v ? new Date(String(v)).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—'
function useConsulta<T>(recurso: string, filtros: Record<string, unknown>) {
  const clave = JSON.stringify(filtros)
  const [revision, setRevision] = useState(0)
  const consulta = `${recurso}:${clave}:${revision}`
  const [estado, setEstado] = useState<{ consulta?: string; datos?: T; error?: string; cargando: boolean }>({ cargando: true })
  useEffect(() => {
    const abort = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect -- A new remote query invalidates the previous result.
    setEstado({ consulta, cargando: true })
    consultarDashboard(recurso, JSON.parse(clave), abort.signal).then((datos: T) => { if (!abort.signal.aborted) setEstado({ consulta, datos, cargando: false }) })
      .catch((e: Error) => { if (!abort.signal.aborted) setEstado({ consulta, error: e.message, cargando: false }) })
    return () => abort.abort()
  }, [recurso, clave, revision, consulta])
  return { ...(estado.consulta === consulta ? estado : { cargando: true }), reintentar: () => setRevision(n => n + 1) }
}
function Consulta({ recurso, children }: { recurso: { cargando: boolean; error?: string; reintentar: () => void }; children: ReactNode }) {
  if (recurso.cargando) return <Notice kind="wait" title="Cargando datos…" />
  if (recurso.error) return <Notice kind="err" title={recurso.error}><button className="btn btn-secondary mt-2" onClick={recurso.reintentar}>Reintentar</button></Notice>
  return <>{children}</>
}
export function AbogadoProtegido({ children }: { children: ReactNode }) {
  const sesion = useSesion() as { rol: string } | null
  if (!sesion) return <Navigate to="/iniciar-sesion" replace />
  if (sesion.rol !== 'ABOGADO') return <div className="pt-28 px-5"><Notice kind="err" title="Acceso exclusivo para abogados" /></div>
  return <>{children}</>
}
function Grafico({ titulo, filas, categoria, valor, pie, formato }: { titulo: string; filas: Fila[]; categoria: string; valor: string; pie: string; formato?: (n: unknown) => string }) {
  const max = Math.max(1, ...filas.map(f => Number(f[valor])))
  return <section className="card p-5 min-w-0"><h2 className="text-lg font-semibold">{titulo}</h2><p className="text-xs text-ink-2 my-2">{pie}</p>
    {!filas.length ? <p className="py-6 text-ink-2">Sin registros en este período.</p> : <div className="max-h-80 overflow-auto space-y-3" role="list" aria-label={titulo}>{filas.map((f, i) => <div role="listitem" key={i}>
      <div className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{String(f[categoria])}</span><span className="tabular shrink-0">{formato ? formato(f[valor]) : String(f[valor])}{f.porcentaje != null ? ` (${Number(f.porcentaje).toFixed(1)} %)` : ''}</span></div>
      <div className="mt-1 h-2 rounded bg-navy-800" aria-hidden="true"><div className="h-2 rounded bg-gold-400" style={{ width: `${Number(f[valor]) / max * 100}%` }} /></div>
    </div>)}</div>}
  </section>
}
function GraficoTemporal({ titulo, filas, mensual = false, divisa = 'ARS' }: { titulo: string; filas: Fila[]; mensual?: boolean; divisa?: string }) {
  const max = Math.max(1, ...filas.flatMap(f => mensual ? [Number(f.total)] : [Number(f.inicios), Number(f.finalizados)]))
  const ancho = 560 / Math.max(1, filas.length)
  const etiqueta = (f: Fila) => String(mensual ? f.mes : f.fecha).slice(0, mensual ? 7 : 10)
  return <section className="card p-5 min-w-0"><h2 className="text-lg font-semibold">{titulo}</h2>
    <p className="text-xs text-ink-2 mt-2">{mensual ? 'Fecha de cobro · últimos 12 meses completos · independiente del rango global' : 'Inicios por fecha de inicio · finalizaciones por fecha de finalización'}</p>
    <svg className="w-full h-44 mt-4" viewBox="0 0 600 180" role="img" aria-label={mensual ? 'Cobros por mes. Los valores exactos están en Ver datos del gráfico.' : 'Evolución de inicios y finalizaciones. Los valores exactos están en Ver datos del gráfico.'}>
      <path d="M20 10V160H580" fill="none" stroke="currentColor" opacity="0.3" />
      <text x="20" y="10" fill="currentColor" fontSize="10">{mensual ? moneda(max, divisa) : max}</text>
      {filas.map((f, i) => <g key={i}><title>{etiqueta(f)}: {mensual ? moneda(f.total, divisa) : `${f.inicios} inicios, ${f.finalizados} finalizaciones`}</title>
        <rect x={22 + i * ancho} y={160 - Number(mensual ? f.total : f.inicios) / max * 130} width={Math.max(1, ancho * (mensual ? 0.8 : 0.38))} height={Number(mensual ? f.total : f.inicios) / max * 130} fill="#f3b83c" />
        {!mensual && <rect x={22 + i * ancho + ancho * 0.4} y={160 - Number(f.finalizados) / max * 130} width={Math.max(1, ancho * 0.38)} height={Number(f.finalizados) / max * 130} fill="#8cc8f0" />}
      </g>)}
    </svg>
    {filas.length > 0 && <div className="flex justify-between text-xs text-ink-2"><span>{etiqueta(filas[0])}</span><span>{etiqueta(filas[filas.length - 1])}</span></div>}
    {!mensual && <p className="text-xs mt-3"><span className="text-gold-400">■ Inicios</span> · <span className="text-sky-400">■ Finalizaciones</span></p>}
    <details className="mt-4"><summary className="link cursor-pointer">Ver datos del gráfico</summary><div className="max-h-72 overflow-auto"><table className="w-full text-sm text-left"><caption className="sr-only">{titulo}</caption><thead><tr><th scope="col" className="py-2">Período</th><th scope="col">{mensual ? `Cobrado (${divisa})` : 'Inicios'}</th>{!mensual && <th scope="col">Finalizaciones</th>}</tr></thead><tbody>{filas.map((f, i) => <tr className="border-t border-line" key={i}><th scope="row" className="py-2 font-normal">{etiqueta(f)}</th><td>{mensual ? moneda(f.total, divisa) : f.inicios}</td>{!mensual && <td>{f.finalizados}</td>}</tr>)}</tbody></table></div></details>
  </section>
}
function Tabla({ datos, ingresos, solicitudes, pagina, cambiar }: { datos?: Lista; ingresos: boolean; solicitudes: boolean; pagina: number; cambiar: (n: number) => void }) {
  if (!datos) return null
  if (!datos.contenido.length) return <p className="py-6 text-ink-2">No hay registros para estos filtros.</p>
  return <><div tabIndex={0} role="region" aria-label="Resultados del dashboard" className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{ingresos ? 'Ingresos cobrados por asesoramiento' : solicitudes ? 'Solicitudes aceptadas' : 'Asesoramientos propios'}</caption>
    <thead><tr>{['Identificador', 'Área jurídica', ingresos ? 'Total cobrado' : 'Estado', 'Fecha', 'Detalle'].map(t => <th scope="col" className="p-3 border-b border-line" key={t}>{t}</th>)}</tr></thead>
    <tbody>{datos.contenido.map(f => <tr key={f.id} className="border-b border-line"><td className="p-3">#{f.id}</td><td className="p-3">{f.area}</td><td className="p-3">{ingresos ? moneda(f.total, String(f.moneda)) : f.estado}</td><td className="p-3">{fecha(f.fecha ?? f.finalizado_en ?? f.iniciado_en)}</td><td className="p-3">{(!solicitudes || f.asesoramiento) ? <Link className="link" to={`/dashboard-abogado/asesoramientos/${solicitudes ? f.asesoramiento : f.id}`}>Ver asesoramiento #{solicitudes ? f.asesoramiento : f.id}</Link> : 'Sin asesoramiento asociado'}</td></tr>)}</tbody>
  </table></div><div className="flex flex-wrap items-center gap-3 mt-4"><button className="btn btn-secondary btn-sm" disabled={pagina === 0} onClick={() => cambiar(pagina - 1)}>Anterior</button><span>Página {pagina + 1} · {datos.total} resultados</span><button className="btn btn-secondary btn-sm" disabled={(pagina + 1) * datos.tamano >= datos.total} onClick={() => cambiar(pagina + 1)}>Siguiente</button></div></>
}
export default function LawyerDashboard({ nombre = 'profesional', cuentaPrueba = false }: { nombre?: string; cuentaPrueba?: boolean }) {
  const [periodo, setPeriodo] = useState('30')
  const [rango, setRango] = useState(() => periodoDashboard('30'))
  const [area, setArea] = useState('')
  const [divisa, setDivisa] = useState('ARS')
  const [mes, setMes] = useState(() => periodoDashboard('30').hasta.slice(0, 7))
  const [tabla, setTabla] = useState('asesoramientos')
  const [estado, setEstado] = useState('')
  const [base, setBase] = useState('inicio')
  const [orden, setOrden] = useState('fecha')
  const [direccion, setDireccion] = useState('desc')
  const [pagina, setPagina] = useState(0)
  const filtros = { ...rango, area }
  const resumen = useConsulta<Resumen>('resumen', filtros)
  const areas = useConsulta<Fila[]>('por-area', rango)
  const evol = useConsulta<Fila[]>('por-periodo', filtros)
  const mensual = useConsulta<Mensual>('ingresos/mensuales', { ...filtros, moneda: divisa, mes })
  const lista = useConsulta<Lista>(tabla, { ...filtros, moneda: divisa, pagina, orden, direccion, estado: tabla === 'asesoramientos' ? estado : '', fechaBase: base })
  const reset = () => setPagina(0)
  function cambiarPeriodo(p: string) { setPeriodo(p); if (p !== 'personalizado') setRango(periodoDashboard(p)); reset() }
  return <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-16 space-y-6">
    <header>{cuentaPrueba && <p className="text-gold-400 font-bold">Cuenta de prueba — matrícula no verificada</p>}<Link to="/mis-datos" className="btn btn-secondary float-right">Mi perfil</Link><p className="text-gold-400 font-semibold">Tu espacio profesional</p><h1 className="text-3xl font-bold mt-2">Hola, {nombre}</h1><p className="text-ink-2 mt-2">Solicitudes, asesoramientos e ingresos de tu cuenta.</p></header>
    <section aria-label="Filtros del dashboard" className="card p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <label className="label">Período<select className="field mt-1" value={periodo} onChange={e => cambiarPeriodo(e.target.value)}><option value="30">Últimos 30 días</option>{['3', '6', '12'].map(p => <option key={p} value={p}>Últimos {p} meses</option>)}<option value="personalizado">Rango personalizado</option></select></label>
      <label className="label">Desde<input className="field mt-1" type="date" value={rango.desde} max={rango.hasta} onChange={e => { setPeriodo('personalizado'); setRango({ ...rango, desde: e.target.value }); reset() }} /></label>
      <label className="label">Hasta<input className="field mt-1" type="date" value={rango.hasta} min={rango.desde} onChange={e => { setPeriodo('personalizado'); setRango({ ...rango, hasta: e.target.value }); reset() }} /></label>
      <label className="label">Área jurídica<select className="field mt-1" value={area} onChange={e => { setArea(e.target.value); reset() }}><option value="">Todas las áreas</option>{areas.datos?.map(a => <option key={a.area} value={String(a.area)}>{a.area}</option>)}</select></label>
    </section>
    <p className="text-xs text-ink-2">Fechas en Argentina. Aceptadas: fecha de aceptación. Finalizados: fecha de finalización. Valoraciones: fecha de valoración. Gráficos de áreas: fecha de inicio.</p>
    <Consulta recurso={resumen}>{resumen.datos && <><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[['Solicitudes aceptadas', resumen.datos.aceptadas], ['Asesoramientos finalizados', resumen.datos.finalizados], ['Valoración promedio', resumen.datos.valoraciones.promedio == null ? 'Sin valoraciones todavía' : `${Number(resumen.datos.valoraciones.promedio).toFixed(2)} / 5 · ${resumen.datos.valoraciones.cantidad} valoraciones`], ['Ingreso total acumulado · histórico', resumen.datos.historico.length ? resumen.datos.historico.map(p => moneda(p.total, String(p.moneda))).join(' · ') : 'Sin cobros registrados']].map(([titulo, valor]) => <section className="card p-5" key={titulo}><h2 className="text-sm text-ink-2">{titulo}</h2><p className="text-2xl font-semibold mt-3 tabular break-words">{valor}</p></section>)}
    </div><p className="text-sm text-ink-2">Ingresos del rango: {resumen.datos.periodo.length ? resumen.datos.periodo.map(p => moneda(p.total, String(p.moneda))).join(' · ') : 'Sin cobros en este período'}. Solo se incluyen pagos cobrados; los honorarios del perfil no se contabilizan.</p></>}</Consulta>
    <div className="grid lg:grid-cols-2 gap-4"><Consulta recurso={areas}><Grafico titulo="Asesoramientos por área jurídica" filas={areas.datos ?? []} categoria="area" valor="cantidad" pie="Inicios en el período · cantidad y porcentaje del total, antes del filtro de área" /></Consulta>
      <Consulta recurso={evol}><GraficoTemporal titulo="Evolución de asesoramientos" filas={evol.datos ?? []} /></Consulta></div>
    <section className="card p-5 space-y-4"><h2 className="text-lg font-semibold">Ingresos mensuales</h2><div className="flex flex-wrap gap-4"><label className="label">Mes completo<input className="field mt-1" type="month" value={mes} onChange={e => setMes(e.target.value)} /></label><label className="label">Moneda<select className="field mt-1" value={divisa} onChange={e => { setDivisa(e.target.value); reset() }}>{Array.from(new Set(['ARS', ...(resumen.datos?.historico.map(p => String(p.moneda)) ?? [])])).map(m => <option key={m}>{m}</option>)}</select></label></div>
      <Consulta recurso={mensual}>{mensual.datos && <><p className="text-xl font-semibold">{moneda(mensual.datos.total, divisa)}</p><p className="text-ink-2">Mes anterior: {moneda(mensual.datos.anterior, divisa)} · {mensual.datos.variacion == null ? 'Sin base de comparación' : `${mensual.datos.variacion} % respecto del mes anterior`}</p><GraficoTemporal titulo="Cobros de los últimos 12 meses" filas={mensual.datos.serie} mensual divisa={divisa} /></>}</Consulta>
    </section>
    <Consulta recurso={resumen}>{resumen.datos && <Grafico titulo="Distribución de valoraciones" filas={[1, 2, 3, 4, 5].map(n => ({ puntuacion: `${n} estrellas`, cantidad: resumen.datos?.valoraciones.distribucion.find(f => Number(f.puntuacion) === n)?.cantidad ?? 0 }))} categoria="puntuacion" valor="cantidad" pie={resumen.datos.valoraciones.cantidad ? 'Valoraciones persistidas en el rango seleccionado' : 'Sin valoraciones todavía'} />}</Consulta>
    <section className="card p-5"><h2 className="text-xl font-semibold">Detalle de tu actividad</h2><div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 my-4">
      <label className="label">Listado<select className="field" value={tabla} onChange={e => { setTabla(e.target.value); setOrden('fecha'); reset() }}><option value="asesoramientos">Asesoramientos</option><option value="solicitudes">Solicitudes aceptadas</option><option value="ingresos/por-asesoramiento">Ingresos por asesoramiento</option></select></label>
      {tabla === 'asesoramientos' && <><label className="label">Estado<select className="field" value={estado} onChange={e => { setEstado(e.target.value); reset() }}><option value="">Todos</option>{['EN_CURSO', 'FINALIZADO', 'CANCELADO'].map(s => <option key={s}>{s}</option>)}</select></label><label className="label">Fecha del filtro<select className="field" value={base} onChange={e => { setBase(e.target.value); reset() }}><option value="inicio">Inicio</option><option value="finalizacion">Finalización</option></select></label></>}
      <label className="label">Ordenar por<select className="field" value={orden} onChange={e => { setOrden(e.target.value); reset() }}><option value="fecha">Fecha</option><option value="id">Identificador</option>{tabla.startsWith('ingresos') && <option value="importe">Importe</option>}</select></label>
      <label className="label">Dirección<select className="field" value={direccion} onChange={e => { setDireccion(e.target.value); reset() }}><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label>
    </div><Consulta recurso={lista}><Tabla datos={lista.datos} ingresos={tabla.startsWith('ingresos')} solicitudes={tabla === 'solicitudes'} pagina={pagina} cambiar={setPagina} /></Consulta></section>
  </div>
}

export function LawyerAdviceDetail() {
  const { id } = useParams()
  const [rango, setRango] = useState(() => periodoDashboard('12'))
  const [pagina, setPagina] = useState(0)
  const [direccion, setDireccion] = useState('desc')
  const caso = useConsulta<{ area: string; estado: string; solicitud: number; referencia_ciudadano: number; descripcion: string; iniciado_en: string; finalizado_en: string | null; ingresos: Fila[] }>(`asesoramientos/${id}`, {})
  const pagos = useConsulta<Lista>(`asesoramientos/${id}/pagos`, { ...rango, pagina, orden: 'importe', direccion })
  return <div className="max-w-5xl mx-auto pt-28 pb-16 px-5 space-y-5"><Link to="/" className="link">Volver a mi Home</Link><h1 className="text-3xl font-bold">Asesoramiento #{id}</h1>
    <Consulta recurso={caso}>{caso.datos && <section className="card p-5 space-y-3"><p>{caso.datos.area} · {caso.datos.estado}</p><p>Solicitud #{caso.datos.solicitud} · Ciudadano: referencia #{caso.datos.referencia_ciudadano}</p><p className="whitespace-pre-wrap break-words">{caso.datos.descripcion}</p><p>Inicio: {fecha(caso.datos.iniciado_en)} · Fin: {fecha(caso.datos.finalizado_en)}</p>{caso.datos.finalizado_en && <p>Duración calendario: {Math.round((new Date(String(caso.datos.finalizado_en)).getTime() - new Date(String(caso.datos.iniciado_en)).getTime()) / 3600000)} horas transcurridas</p>}<p>Total histórico cobrado: {caso.datos.ingresos.map(p => moneda(p.total, String(p.moneda))).join(' · ') || 'Sin cobros registrados'}</p></section>}</Consulta>
    <section className="card p-5 space-y-4"><h2 className="text-xl font-semibold">Pagos por fecha de cobro</h2><p className="text-sm text-ink-2">Las operaciones pendientes no tienen fecha de cobro y no aparecen en este rango.</p><div className="flex flex-wrap gap-3"><label className="label">Desde<input className="field" type="date" value={rango.desde} onChange={e => { setRango({ ...rango, desde: e.target.value }); setPagina(0) }} /></label><label className="label">Hasta<input className="field" type="date" value={rango.hasta} onChange={e => { setRango({ ...rango, hasta: e.target.value }); setPagina(0) }} /></label><label className="label">Orden por importe<select className="field" value={direccion} onChange={e => { setDireccion(e.target.value); setPagina(0) }}><option value="desc">Mayor primero</option><option value="asc">Menor primero</option></select></label></div>
      <Consulta recurso={pagos}>{pagos.datos && <><p>{pagos.datos.total} operaciones</p><p>Total cobrado en el rango: {pagos.datos.totales?.map(p => moneda(p.total, String(p.moneda))).join(' | ') || 'Sin cobros'}</p>{!pagos.datos.contenido.length ? <p>Sin pagos en este período.</p> : <ul className="divide-y divide-line">{pagos.datos.contenido.map(p => <li className="py-3" key={p.id}>#{p.id} · {fecha(p.fecha)} · {moneda(p.importe, String(p.moneda))} · {p.estado}</li>)}</ul>}<div className="flex gap-3"><button className="btn btn-secondary" disabled={!pagina} onClick={() => setPagina(p => p - 1)}>Anterior</button><button className="btn btn-secondary" disabled={(pagina + 1) * pagos.datos.tamano >= pagos.datos.total} onClick={() => setPagina(p => p + 1)}>Siguiente</button></div></>}</Consulta>
    </section></div>
}
