import { IngresoEditor } from "./Estadisticas"
import { useEffect, useState } from 'react'
import type { Page } from '../ui'
import { misContactos } from '../services/contactoService.js'
import { detalleSolicitud, cambiarEstado, guardarValoracion, consultarValoraciones } from '../services/solicitudesService.js'
import { localDateTime, type ContactoGuardado } from './model'
import { Badge, Button, Card, Empty, Field, Heading, Modal, Select } from './UI'

const ESTADOS={PENDIENTE:'Pendiente',EN_CURSO:'En curso',FINALIZADA:'Finalizada'} as const
type Estado=keyof typeof ESTADOS
type Valoracion={puntuacion:number;comentario:string;creadoEn:string;actualizadoEn:string}
type Solicitud=ContactoGuardado & {estado:Estado;mensaje:string;actualizadoEn:string;valoracion?:Valoracion;historialEstados?:{estado:Estado;fecha:string}[]}
const etiqueta=(estado:string)=>ESTADOS[estado as Estado]||'Pendiente'

export function SolicitudesPanel({rows,ciudadano,onReload}:{rows:ContactoGuardado[];ciudadano:boolean;onReload:()=>void}){
  const [estado,setEstado]=useState('')
  const [query,setQuery]=useState('')
  const [id,setId]=useState<number|null>(null)
  const [detalle,setDetalle]=useState<Solicitud|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [version,setVersion]=useState(0)
  const [busy,setBusy]=useState(false)
  const [confirmar,setConfirmar]=useState(false)
  const [success,setSuccess]=useState('')
  useEffect(()=>{
    if(id==null)return
    let alive=true;setLoading(true);setError('');setConfirmar(false)
    detalleSolicitud(id,ciudadano).then((r:Solicitud)=>{if(alive)setDetalle(r)}).catch((e:Error)=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[id,ciudadano,version])
  async function actualizar(){
    if(!detalle||busy)return
    setBusy(true);setError('')
    try{const r=await cambiarEstado(detalle.id,detalle.estado==='PENDIENTE'?'EN_CURSO':'FINALIZADA',detalle.estado);setDetalle(r);setConfirmar(false);setSuccess('Estado actualizado correctamente.');onReload()}
    catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  const filtered=(rows as Solicitud[]).filter(r=>(!estado||r.estado===estado)&&(!query||`${r.abogado} ${r.nombre} ${r.resumen}`.toLowerCase().includes(query.toLowerCase())))
  return <>
    <div className="form-grid">
      <Select label="Filtrar por estado" value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos los estados</option>{Object.entries(ESTADOS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select>
      <Field label="Buscar solicitudes" value={query} onChange={e=>setQuery(e.target.value)} placeholder={ciudadano?'Abogado o motivo de consulta':'Ciudadano o motivo de consulta'}/>
    </div>
    <div className="action-row"><Button variant="secondary" onClick={onReload}>Actualizar solicitudes</Button></div>
    {success&&<p role="status" className="inline-notice">{success}</p>}
    {!filtered.length?<Empty title={rows.length?'Sin solicitudes para este filtro':ciudadano?'Todavía no registraste solicitudes':'Todavía no recibiste solicitudes'}>Las solicitudes de contacto y sus cambios de estado se muestran acá.</Empty>:
      <div className="request-list">{filtered.map(r=><article className="contact-card" key={r.id}>
        <header><strong>{ciudadano?r.abogado:r.nombre}</strong><Badge state={etiqueta(r.estado)}>{etiqueta(r.estado)}</Badge></header>
        <p className="ui-muted">Registrada: {localDateTime(r.creadoEn)}</p><p className="preserve-lines">{r.resumen}</p>
        <p className="ui-muted">Último cambio: {localDateTime(r.actualizadoEn||r.creadoEn)}</p>
        {ciudadano&&r.valoracion&&<p aria-label={`Tu valoración: ${r.valoracion.puntuacion} de 5 estrellas`}>{'★'.repeat(r.valoracion.puntuacion)}{'☆'.repeat(5-r.valoracion.puntuacion)} · Tu valoración</p>}
        <div className="action-row"><Button variant="secondary" onClick={()=>{setId(r.id);setDetalle(null);setSuccess('')}}>Ver detalle{ciudadano?' y valorar':' y gestionar'}</Button></div>
      </article>)}</div>}
    {id!=null&&<Modal title="Detalle de la solicitud" onClose={()=>{if(!busy){setId(null);setDetalle(null)}}} wide>
      {success&&<p role="status" className="inline-notice">{success}</p>}
      {loading?<p role="status">Cargando solicitud…</p>:detalle&&<>
        <Heading>{ciudadano?detalle.abogado:detalle.nombre}</Heading><Badge state={etiqueta(detalle.estado)}>{etiqueta(detalle.estado)}</Badge>
        <dl className="solicitud-details"><dt>Fecha de registro</dt><dd>{localDateTime(detalle.creadoEn)}</dd><dt>Último cambio de estado</dt><dd>{localDateTime(detalle.actualizadoEn)}</dd><dt>Nombre de contacto</dt><dd>{detalle.nombre}</dd><dt>Teléfono de contacto</dt><dd>{detalle.telefono}</dd><dt>Área jurídica</dt><dd>{detalle.areaJuridica||'Sin clasificar'}</dd><dt>Motivo de la consulta</dt><dd className="preserve-lines">{detalle.resumen}</dd><dt>Mensaje confirmado</dt><dd className="message-preview">{detalle.mensaje||'El mensaje no se conservó en esta solicitud anterior.'}</dd></dl>
        {!!detalle.historialEstados?.length&&<section><Heading level={3}>Historial de estados</Heading><ol>{detalle.historialEstados.map((h,i)=><li key={i}>{etiqueta(h.estado)} · {localDateTime(h.fecha)}</li>)}</ol></section>}
        {!ciudadano&&detalle.estado!=='FINALIZADA'&&<section className="inline-notice">
          {confirmar?<><p>¿Confirmás {detalle.estado==='PENDIENTE'?'el inicio':'la finalización'} del asesoramiento? El ciudadano verá este cambio.</p><div className="action-row"><Button disabled={busy} onClick={()=>void actualizar()}>{busy?'Guardando…':'Confirmar cambio de estado'}</Button><Button variant="secondary" disabled={busy} onClick={()=>setConfirmar(false)}>Cancelar</Button></div></>:
            <Button onClick={()=>setConfirmar(true)}>{detalle.estado==='PENDIENTE'?'Iniciar asesoramiento':'Finalizar asesoramiento'}</Button>}
        </section>}
        {!ciudadano&&detalle.estado==='FINALIZADA'&&<IngresoEditor id={detalle.id} onSaved={onReload}/>}
        {ciudadano&&<EditorValoracion key={`${detalle.id}-${detalle.valoracion?.actualizadoEn||''}`} solicitud={detalle} onSaved={()=>{setVersion(v=>v+1);setSuccess('Valoración guardada correctamente.');onReload()}}/>}
        <Button variant="ghost" disabled={busy} onClick={()=>setVersion(v=>v+1)}>Actualizar detalle</Button>
      </>}
      {error&&<div role="alert"><p className="ui-error">{error}</p><Button variant="secondary" onClick={()=>setVersion(v=>v+1)}>Reintentar consulta</Button></div>}
    </Modal>}
  </>
}

function EditorValoracion({solicitud,onSaved}:{solicitud:Solicitud;onSaved:()=>void}){
  const [puntuacion,setPuntuacion]=useState(solicitud.valoracion?.puntuacion||0)
  const [preview,setPreview]=useState(0)
  const [comentario,setComentario]=useState(solicitud.valoracion?.comentario||'')
  const [error,setError]=useState('');const [saving,setSaving]=useState(false)
  async function save(e:React.FormEvent){
    e.preventDefault();if(saving)return
    if(!puntuacion){setError('Elegí de 1 a 5 estrellas.');return}
    setSaving(true);setError('')
    try{await guardarValoracion(solicitud.id,{puntuacion,comentario},!!solicitud.valoracion);onSaved()}catch(ex){setError((ex as Error).message)}finally{setSaving(false)}
  }
  return <section className="review-editor"><Heading level={3}>{solicitud.valoracion?'Editar tu valoración':'Valorar la atención del abogado'}</Heading><p className="ui-muted">Podés valorar la atención, disponibilidad y respuesta en cualquier estado de la solicitud.</p>
    <form onSubmit={save}><fieldset className="stars-input" onPointerLeave={()=>setPreview(0)}><legend>Puntuación de 1 a 5 estrellas</legend>{[1,2,3,4,5].map(n=><label key={n} onPointerEnter={e=>{if(e.pointerType!=='touch')setPreview(n)}} data-filled={n<=(preview||puntuacion)}><input className="sr-only" type="radio" name={`rating-${solicitud.id}`} value={n} checked={puntuacion===n} onFocus={()=>setPreview(0)} onChange={()=>{setPuntuacion(n);setPreview(0);setError('')}}/><svg aria-hidden="true" viewBox="0 0 24 24" fill={n<=(preview||puntuacion)?'currentColor':'none'} stroke="currentColor" strokeWidth="1.6"><path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96Z"/></svg><span className="sr-only">{n} {n===1?'estrella':'estrellas'}</span></label>)}</fieldset>
    <Field label="Comentario (opcional)" multiline maxLength={1000} value={comentario} onChange={e=>setComentario(e.target.value)} help={`${comentario.length}/1000 · Sin datos personales, insultos ni expresiones discriminatorias.`}/>
    {error&&<p role="alert" className="ui-error">{error}</p>}<Button type="submit" disabled={saving}>{saving?'Guardando…':solicitud.valoracion?'Guardar cambios de valoración':'Registrar valoración'}</Button></form>
  </section>
}

export function ConsultasCiudadano({navigate}:{navigate:(p:Page)=>void}){
  const [rows,setRows]=useState<ContactoGuardado[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [version,setVersion]=useState(0)
  useEffect(()=>{const refresh=()=>setVersion(v=>v+1);const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[])
  useEffect(()=>{let alive=true;misContactos().then((r:ContactoGuardado[])=>{if(alive){setRows(r);setError('')}}).catch((e:Error)=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[version])
  return <main className="product-page"><p className="eyebrow">Mi espacio</p><Heading level={1}>Mis consultas</Heading><p className="ui-muted page-description">Seguí el estado de tus solicitudes y compartí tu experiencia con cada abogado.</p><div className="action-row"><Button variant="secondary" onClick={()=>navigate('home')}>Buscar abogados</Button></div><Card><Heading>Mis solicitudes de contacto</Heading>{error&&<div role="alert"><p className="ui-error">{error}</p><Button onClick={()=>setVersion(v=>v+1)}>Reintentar</Button></div>}{loading?<p role="status">Cargando solicitudes…</p>:<SolicitudesPanel rows={rows} ciudadano onReload={()=>setVersion(v=>v+1)}/>}</Card></main>
}

type ResumenValoraciones={cantidad:number;promedio:number;valoraciones:Valoracion[]}
export function Valoraciones({id,propias=false}:{id?:string;propias?:boolean}){
  const [orden,setOrden]=useState('recientes');const [version,setVersion]=useState(0)
  const [data,setData]=useState<ResumenValoraciones|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true)
  useEffect(()=>{let alive=true;setLoading(true);setError('');consultarValoraciones(id,orden,propias).then((r:ResumenValoraciones)=>{if(alive)setData(r)}).catch((e:Error)=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[id,orden,propias,version])
  return <section className="reviews-section"><Heading>Valoraciones {propias?'recibidas':''}</Heading><p className="ui-muted">Experiencias de atención compartidas por ciudadanos con una solicitud registrada. Se protege su identidad.</p>
    <div className="form-grid"><Select label="Ordenar valoraciones" value={orden} onChange={e=>setOrden(e.target.value)}><option value="recientes">Más recientes primero</option><option value="antiguas">Más antiguas primero</option></Select><div className="action-row"><Button variant="secondary" onClick={()=>setVersion(v=>v+1)}>Actualizar valoraciones</Button></div></div>
    {loading?<p role="status">Cargando valoraciones…</p>:error?<div role="alert"><p className="ui-error">{error}</p><Button onClick={()=>setVersion(v=>v+1)}>Reintentar</Button></div>:data&&<><p className="rating-summary" aria-label={`Promedio ${data.promedio} de 5, ${data.cantidad} valoraciones`}><strong>★ {Number(data.promedio).toLocaleString('es-AR',{maximumFractionDigits:2})}/5</strong> · {data.cantidad} {data.cantidad===1?'valoración':'valoraciones'}</p>{data.valoraciones.length?<div className="request-list">{data.valoraciones.map((v,i)=><article className="contact-card" key={i}><p aria-label={`${v.puntuacion} de 5 estrellas`}>{'★'.repeat(v.puntuacion)}{'☆'.repeat(5-v.puntuacion)}</p><p className="preserve-lines">{v.comentario||'Sin comentario.'}</p><p className="ui-muted">Registrada: {localDateTime(v.creadoEn)}{v.actualizadoEn!==v.creadoEn?` · Editada: ${localDateTime(v.actualizadoEn)}`:''}</p></article>)}</div>:<Empty title="Todavía no hay valoraciones">Este abogado aún no recibió valoraciones de ciudadanos.</Empty>}</>}
  </section>
}
