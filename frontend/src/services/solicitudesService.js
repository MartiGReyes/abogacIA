import { fetchAutenticado } from './authService.js';
const BASE=(import.meta.env?.VITE_ABOGADOS_URL??'http://localhost:8082').replace(/\/+$/,'');
async function api(path,options={}){
  const r=await fetchAutenticado(BASE+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(data?.error||'No se pudo completar la operación. Podés reintentar.');
  return data;
}
export const detalleSolicitud=(id,ciudadano)=>api(`/api/abogados/${ciudadano?'contactos/mios':'me/contactos'}/${id}`);
export const cambiarEstado=(id,estado,estadoActual)=>api(`/api/abogados/me/contactos/${id}/estado`,{method:'PATCH',body:JSON.stringify({estado,estadoActual})});
export const guardarValoracion=(id,datos,editar)=>api(`/api/abogados/contactos/mios/${id}/valoracion`,{method:editar?'PUT':'POST',body:JSON.stringify(datos)});
export async function consultarValoraciones(id,orden='recientes',propias=false){
  const path=propias?'/api/abogados/me/valoraciones':`/api/abogados/catalogo/${id}/valoraciones`;
  const r=await (propias?fetchAutenticado:fetch)(`${BASE}${path}?orden=${orden}`,{cache:'no-store'});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(data?.error||'No se pudieron recuperar las valoraciones. Podés reintentar.');
  return data;
}
