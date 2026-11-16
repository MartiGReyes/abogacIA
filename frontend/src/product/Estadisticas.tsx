import { useEffect, useState } from 'react'
import { consultarEstadisticas, consultarIngreso, guardarIngreso } from '../services/estadisticasService.js'
import { Button, Card, Empty, Field, Heading, Modal, Select } from './UI'
import { dateKey, localDate, localDateTime, PERIODS, periodRange, type Period } from './model'

const pesos=(valor:string|number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2,minimumFractionDigits:2}).format(valor as number)
type Ingreso={registrado:boolean;importe?:string;fechaIngreso?:string;creadoEn?:string;actualizadoEn?:string}
type Total={cantidad:number;total:string|null}
type Punto={periodo:string;valor:number|string;cantidad:number}
type Caso={id:number;ciudadano:string;motivo:string;areaJuridica:string;finalizadaEn:string;registrado:boolean;importe:string|null;fechaIngreso:string|null}
type Datos={indicadores:{recibidas:number;pendientes:number;en_curso:number;finalizadas:number};areas:{area:string;cantidad:number}[];valoraciones:{cantidad:number;promedio:number|null};acumulado:Total;mensual:Total;periodo:Total;consultas:Punto[];ingresos:Punto[];asesoramientos:Caso[];granularidad:string;consultadoEn:string}

export function IngresoEditor({id,onSaved}:{id:number;onSaved?:()=>void}){
  const [data,setData]=useState<Ingreso|null>(null);const [importe,setImporte]=useState('');const [fecha,setFecha]=useState(dateKey())
  const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [success,setSuccess]=useState('');const [version,setVersion]=useState(0)
  useEffect(()=>{let alive=true;consultarIngreso(id).then((r:Ingreso)=>{if(alive){setData(r);setImporte(r.importe||'');setFecha(r.fechaIngreso||dateKey());setError('')}}).catch((e:Error)=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[id,version])
  async function guardar(e:React.FormEvent){
    e.preventDefault();if(saving)return;setError('');setSuccess('')
    const numero=importe.trim().replace(',','.')
    if(!/^\d+(?:\.\d{1,2})?$/.test(numero)||!fecha){setError('Ingresá un importe no negativo con hasta dos decimales y una fecha válida. No uses separadores de miles.');return}
    setSaving(true)
    try{const r=await guardarIngreso(id,numero,fecha,!!data?.registrado);setData(r);setSuccess('Ingreso guardado correctamente. Los indicadores económicos se actualizaron.');window.dispatchEvent(new Event('ingreso-actualizado'));onSaved?.()}
    catch(ex){setError((ex as Error).message)}finally{setSaving(false)}
  }
  return <section className="review-editor"><Heading level={3}>Ingreso por asesoramiento</Heading><p className="ui-muted">Registro opcional en pesos argentinos. Es independiente de los honorarios publicados y no realiza cobros.</p>
    {loading?<p role="status">Cargando ingreso…</p>:data&&<><p>{data.registrado?<>Ingreso registrado: <strong>{pesos(data.importe!)}</strong> · Fecha de ingreso: {localDate(data.fechaIngreso!)}</>:'Sin ingreso registrado. Esto no significa que el asesoramiento haya generado $0.'}</p>
      <form onSubmit={guardar}><div className="form-grid"><Field label="Importe en pesos argentinos" inputMode="decimal" maxLength={16} value={importe} onChange={e=>setImporte(e.target.value)} placeholder="Ejemplo: 15000,50" required help="Se admite cero. Hasta dos decimales, sin separadores de miles."/><Field label="Fecha del ingreso" type="date" value={fecha} onChange={e=>setFecha(e.target.value)} required/></div><Button type="submit" disabled={saving}>{saving?'Guardando…':data.registrado?'Guardar corrección del ingreso':'Registrar ingreso'}</Button></form>
      {data.actualizadoEn&&<p className="ui-muted">Última actualización: {localDateTime(data.actualizadoEn)}</p>}</>}
    {error&&<div role="alert"><p className="ui-error">{error}</p>{!data&&<Button onClick={()=>{setLoading(true);setVersion(v=>v+1)}}>Reintentar</Button>}</div>}{success&&<p role="status" className="inline-notice">{success}</p>}
  </section>
}

function TotalIngreso({title,total,description}:{title:string;total:Total;description:string}){
  return <Card className="kpi"><Heading level={3}>{title}</Heading><p className="kpi-value">{total.cantidad?pesos(total.total!):'Sin ingresos registrados'}</p><p className="ui-muted">{description}</p><p className="ui-muted">{total.cantidad} {total.cantidad===1?'asesoramiento con ingreso':'asesoramientos con ingreso'} registrado.</p></Card>
}

function Grafico({rows,monetario=false,label}:{rows:Punto[];monetario?:boolean;label:string}){
  const max=Math.max(1,...rows.map(r=>Number(r.valor)))
  const texto=(v:string|number)=>monetario?pesos(v):String(v)
  const etiqueta=(r:Punto)=>monetario&&!r.cantidad?'Sin registros':texto(r.valor)
  const active=monetario?rows.some(r=>r.cantidad>0):rows.some(r=>Number(r.valor)>0)
  if(!active)return <Empty title={monetario?'No hay ingresos registrados en este período':'No hay consultas recibidas en este período'}>Seleccioná otro intervalo para consultar la evolución.</Empty>
  return <><div className="indicator-chart" role="group" aria-label={label}>{rows.map(r=><div className="indicator-column" key={r.periodo} tabIndex={0} aria-label={`${r.periodo}: ${etiqueta(r)}`}><span className="indicator-value">{etiqueta(r)}</span><div className="indicator-track"><div className="indicator-bar" style={{height:`${Number(r.valor)/max*100}%`}}/></div><span>{r.periodo}</span></div>)}</div><details className="chart-data"><summary>Ver datos del gráfico</summary><div className="table-scroll"><table><thead><tr><th>Período</th><th>{monetario?'Ingreso registrado (ARS)':'Consultas recibidas'}</th></tr></thead><tbody>{rows.map(r=><tr key={r.periodo}><td>{r.periodo}</td><td>{etiqueta(r)}</td></tr>)}</tbody></table></div></details></>
}

export function Estadisticas(){
  const [period,setPeriod]=useState<Period>('Este mes');const [custom,setCustom]=useState({start:dateKey().slice(0,7)+'-01',end:dateKey()});const [mes,setMes]=useState(dateKey().slice(0,7))
  const range=periodRange(period,custom);const valid=!!range.start&&!!range.end&&range.start<=range.end&&/^\d{4}-\d{2}$/.test(mes)
  const [data,setData]=useState<Datos|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [version,setVersion]=useState(0);const [editing,setEditing]=useState<number|null>(null)
  useEffect(()=>{const refresh=()=>setVersion(v=>v+1);const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);window.addEventListener('ingreso-actualizado',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('ingreso-actualizado',refresh)}},[])
  useEffect(()=>{
    if(!valid)return;const abort=new AbortController();
    consultarEstadisticas(range.start,range.end,mes,abort.signal).then((r:Datos)=>{if(!abort.signal.aborted){setData(r);setError('')}}).catch((e:Error)=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setLoading(false)})
    return()=>abort.abort()
  },[range.start,range.end,mes,version,valid])
  // Hide results for stale filters until the corresponding response arrives.
  const current=data as (Datos & {desde:string;hasta:string;mes:string})|null
  const matches=current?.desde===range.start&&current?.hasta===range.end&&current?.mes===mes
  return <div className="statistics-live"><Card><Heading>Filtros de reportes</Heading><div className="form-grid"><Select label="Período de consultas e ingresos" value={period} onChange={e=>setPeriod(e.target.value as Period)}>{PERIODS.map(p=><option key={p} value={p}>{p}</option>)}</Select><Field label="Mes y año de ingresos mensuales" type="month" value={mes} onChange={e=>setMes(e.target.value)} required/></div>{period==='Personalizado'&&<div className="form-grid"><Field label="Fecha inicial" type="date" value={custom.start} onChange={e=>setCustom({...custom,start:e.target.value})}/><Field label="Fecha final" type="date" value={custom.end} onChange={e=>setCustom({...custom,end:e.target.value})}/></div>}<p className="ui-muted">Las consultas se agrupan por fecha de registro; los ingresos, por la fecha de ingreso indicada. El acumulado, las áreas y los indicadores de estado son históricos. El mes se consulta de forma independiente.</p><Button variant="secondary" onClick={()=>setVersion(v=>v+1)}>Actualizar indicadores</Button></Card>
    {!valid?<p role="alert" className="ui-error">Seleccioná un intervalo válido, con fecha inicial anterior o igual a la final, y un mes válido.</p>:error?<div role="alert" className="inline-notice"><p>{error}</p><Button onClick={()=>setVersion(v=>v+1)}>Reintentar reportes</Button></div>:loading||!matches?<p role="status">Cargando reportes…</p>:data&&<>
      <Heading>Solicitudes y asesoramientos</Heading><div className="kpi-grid">{([['Solicitudes recibidas',data.indicadores.recibidas],['Solicitudes pendientes',data.indicadores.pendientes],['Asesoramientos en curso',data.indicadores.en_curso],['Asesoramientos finalizados',data.indicadores.finalizadas]] as const).map(([title,value])=><Card className="kpi" key={title}><Heading level={3}>{title}</Heading><p className="kpi-value">{value}</p><p className="ui-muted">Total de tu cuenta</p></Card>)}</div>
      <Card><Heading>Consultas por área jurídica</Heading><p className="ui-muted">Cada consulta pertenece a una sola área. Las solicitudes antiguas con varias especialidades y sin área elegida aparecen como Sin clasificar.</p>{data.areas.length?<div className="table-scroll"><table><thead><tr><th>Área jurídica</th><th>Consultas recibidas</th></tr></thead><tbody>{data.areas.map(a=><tr key={a.area}><td>{a.area}</td><td>{a.cantidad}</td></tr>)}</tbody></table></div>:<Empty title="Todavía no hay consultas por área">Cuando recibas solicitudes, verás su distribución.</Empty>}</Card>
      <Card><Heading>Consultas recibidas por período</Heading><p className="ui-muted">{localDate(range.start)} — {localDate(range.end)} · Agrupación {data.granularidad}. Incluye todos los estados.</p><Grafico rows={data.consultas} label="Cantidad de consultas recibidas por período"/></Card>
      <Card><Heading>Valoración promedio</Heading>{data.valoraciones.cantidad?<><p className="kpi-value">★ {Number(data.valoraciones.promedio).toLocaleString('es-AR',{maximumFractionDigits:2})}/5</p><p>{data.valoraciones.cantidad} {data.valoraciones.cantidad===1?'valoración':'valoraciones'}, de solicitudes en cualquier estado.</p></>:<Empty title="Todavía no recibiste valoraciones">No hay una puntuación promedio para mostrar.</Empty>}</Card>
      <Heading>Ingresos registrados</Heading><p className="ui-muted">Importes declarados por vos para asesoramientos finalizados. No se estiman ingresos a partir de los honorarios ni de los casos sin registro económico.</p><div className="income-summary-grid"><TotalIngreso title="Ingreso total acumulado" total={data.acumulado} description="Histórico completo de tu cuenta, en pesos argentinos."/><TotalIngreso title="Ingreso mensual" total={data.mensual} description={`Mes consultado: ${mes}.`}/><TotalIngreso title="Ingreso del período" total={data.periodo} description={`${localDate(range.start)} — ${localDate(range.end)}.`}/></div>
      <Card><Heading>Evolución de ingresos por período</Heading><p className="ui-muted">Pesos argentinos · {localDate(range.start)} — {localDate(range.end)}. Los intervalos sin registros no representan ingresos declarados de $0.</p><Grafico rows={data.ingresos} monetario label="Ingresos registrados en pesos argentinos por período"/></Card>
      <Card><Heading>Ingresos por asesoramiento finalizado</Heading>{!data.asesoramientos.length?<Empty title="Todavía no hay asesoramientos finalizados">Podrás registrar un ingreso opcional al finalizar cada asesoramiento.</Empty>:<div className="request-list">{data.asesoramientos.map(c=><article className="contact-card" key={c.id}><header><strong>{c.ciudadano} · Solicitud #{c.id}</strong><span>{c.registrado?pesos(c.importe!):'Sin ingreso registrado'}</span></header><p>{c.motivo}</p><p className="ui-muted">{c.areaJuridica} · Finalizada: {localDateTime(c.finalizadaEn)}</p>{c.fechaIngreso&&<p>Fecha del ingreso: {localDate(c.fechaIngreso)}</p>}<Button variant="secondary" onClick={()=>setEditing(c.id)}>{c.registrado?'Editar ingreso':'Registrar ingreso'}</Button></article>)}</div>}</Card>
      <p className="ui-muted">Última consulta: {localDateTime(data.consultadoEn)}. Actualización automática cada 15 segundos.</p>
    </>}
    {editing!=null&&<Modal title="Registrar o corregir ingreso" onClose={()=>setEditing(null)}><IngresoEditor id={editing}/></Modal>}
  </div>
}
