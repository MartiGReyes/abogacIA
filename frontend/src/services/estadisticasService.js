import { fetchAutenticado } from './authService.js';
const BASE=(import.meta.env?.VITE_ABOGADOS_URL??'http://localhost:8082').replace(/\/+$/,'');
async function api(path,options={}){
  const response=await fetchAutenticado(BASE+'/api/abogados/me'+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.error||'No se pudo recuperar o guardar la información. Podés reintentar.');
  return data;
}
export const consultarEstadisticas=(desde,hasta,mes,signal)=>api('/estadisticas?'+new URLSearchParams({desde,hasta,mes}),{signal});
export const consultarIngreso=id=>api(`/contactos/${id}/ingreso`);
export const guardarIngreso=(id,importe,fechaIngreso,editar)=>api(`/contactos/${id}/ingreso`,{method:editar?'PUT':'POST',body:JSON.stringify({importe,fechaIngreso})});
