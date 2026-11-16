import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
const root=new URL('../../',import.meta.url);
const password=readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt',import.meta.url),'utf8').trim();
const base='http://localhost:5173';
const nombre='Ciudadano sintético US13-18';
async function req(path,{token,body,method=body?'POST':'GET'}={}){
  return fetch(base+path,{method,headers:{Origin:base,...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
}
async function login(mail,tipoCuenta){const r=await req('/api/auth/login',{body:{mail,tipoCuenta,contrasena:password}});assert.equal(r.status,200);return(await r.json()).token;}
const ciudadanoPath='/api/abogados/contactos/mios';
const abogadoPath='/api/abogados/me/contactos';
test('US13–US18: solicitud editable, seguimiento, transiciones, titularidad y valoraciones',async()=>{
  const ciudadano=await login('ciudadano.prueba@abogacia.local','CIUDADANO');
  const abogado=await login('abogado.prueba@abogacia.local','ABOGADO');
  const otro=await login('abogado.otro@abogacia.local','ABOGADO');
  const env=readFileSync(new URL('../contacto-operativo-test/.env',import.meta.url),'utf8');
  const key=Buffer.from(env.match(/^OP_JWT_SECRET=(.+)$/m)[1].trim(),'base64');
  const [header,payload]=ciudadano.split('.');const claims=JSON.parse(Buffer.from(payload,'base64url'));claims.sub=String(Number(claims.sub)+10_000_000);
  const data=`${header}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
  const ajeno=`${data}.${createHmac('sha256',key).update(data).digest('base64url')}`;
  const catalog=await(await req('/api/abogados/catalogo')).json();const profesional=catalog.find(a=>a.idAbogado===961001);
  assert.ok(profesional?.contactoHabilitado,'El abogado de prueba debe tener WhatsApp habilitado para probar US13 sin modificar su perfil.');
  const body={abogado:{tipo:'PROFESIONAL',id:'961001'},nombre,telefono:'+5493510000009',resumen:'Consulta sintética de seguimiento.',mensajeConfirmado:'Hola. Este mensaje fue editado antes de confirmar la solicitud de prueba.',consentimiento:true,avisoVersion:'contacto-whatsapp-v1'};
  assert.equal((await req('/api/abogados/contacto/whatsapp',{body})).status,401);
  assert.equal((await req('/api/abogados/contacto/whatsapp',{token:ciudadano,body:{...body,consentimiento:false}})).status,400);
  assert.equal((await req('/api/abogados/contacto/whatsapp',{token:ciudadano,body:{...body,telefono:'invalido'}})).status,400);
  const ids=[];
  try{
    const created=await req('/api/abogados/contacto/whatsapp',{token:ciudadano,body});assert.equal(created.status,200);
    const contacto=await created.json();const id=contacto.idSolicitud;assert.ok(Number.isSafeInteger(id));ids.push(id);
    assert.equal(contacto.estado,'PENDIENTE');assert.equal(new URL(contacto.url).searchParams.get('text'),body.mensajeConfirmado);
    let detalle=await(await req(`${ciudadanoPath}/${id}`,{token:ciudadano})).json();assert.equal(detalle.estado,'PENDIENTE');assert.equal(detalle.mensaje,body.mensajeConfirmado);
    assert.equal((await req(`${ciudadanoPath}/${id}`,{token:ajeno})).status,404);
    assert.equal((await req(`${abogadoPath}/${id}`,{token:otro})).status,404);
    const rate=async(score,comment='',method='POST',token=ciudadano)=>req(`${ciudadanoPath}/${id}/valoracion`,{token,method,body:{puntuacion:score,comentario:comment}});
    assert.equal((await rate(0)).status,400);assert.equal((await rate(6)).status,400);assert.equal((await rate(2,'a'.repeat(1001))).status,400);
    assert.equal((await rate(3,'Es un pelotudo')).status,400);
    assert.equal((await rate(3,'Sin respuesta','POST',ajeno)).status,404);
    assert.equal((await rate(3,'Sin respuesta','POST',abogado)).status,403);
    assert.equal((await rate(4,'Atención cordial. Todavía espero una respuesta.')).status,201,'se valora en Pendiente');
    assert.equal((await rate(5)).status,409,'una única valoración por solicitud');
    assert.equal((await rate(1,'Un IMBÉCIL','PUT')).status,400);
    detalle=await(await req(`${ciudadanoPath}/${id}`,{token:ciudadano})).json();assert.equal(detalle.valoracion.puntuacion,4,'editar comentario ofensivo no altera valoración anterior');
    const change=(next,current,token=abogado)=>req(`${abogadoPath}/${id}/estado`,{token,method:'PATCH',body:{estado:next,estadoActual:current}});
    assert.equal((await change('FINALIZADA','PENDIENTE')).status,409);
    assert.equal((await change('EN_CURSO','PENDIENTE',otro)).status,404);
    assert.equal((await change('EN_CURSO','PENDIENTE',ciudadano)).status,403);
    assert.equal((await change('EN_CURSO','PENDIENTE')).status,200);
    assert.equal((await change('EN_CURSO','PENDIENTE')).status,409,'cambio concurrente o repetido');
    assert.equal((await rate(5,'Respondió mi consulta.','PUT')).status,200,'editar en curso');
    const filtered=await(await req(`${ciudadanoPath}?estado=EN_CURSO`,{token:ciudadano})).json();assert.ok(filtered.some(r=>r.id===id));assert.ok(filtered.every(r=>r.estado==='EN_CURSO'));
    assert.equal((await change('FINALIZADA','EN_CURSO')).status,200);
    assert.equal((await change('PENDIENTE','FINALIZADA')).status,409);
    assert.equal((await rate(3,'Mi experiencia cambió luego del cierre.','PUT')).status,200,'editar finalizada');
    detalle=await(await req(`${ciudadanoPath}/${id}`,{token:ciudadano})).json();assert.equal(detalle.estado,'FINALIZADA');assert.equal(detalle.historialEstados.length,3);assert.ok(detalle.actualizadoEn);
    for(const orden of ['recientes','antiguas']){
      const pub=await req(`/api/abogados/catalogo/961001/valoraciones?orden=${orden}`);assert.equal(pub.status,200);const ratings=await pub.json();assert.ok(ratings.cantidad>=1);
      assert.equal(Number(ratings.promedio),Math.round(ratings.valoraciones.reduce((n,v)=>n+v.puntuacion,0)/ratings.cantidad*100)/100);
      for(const v of ratings.valoraciones)assert.deepEqual(Object.keys(v).sort(),['actualizadoEn','comentario','creadoEn','puntuacion']);
    }
    assert.equal((await req('/api/abogados/me/valoraciones',{token:abogado})).status,200);
    assert.equal((await req('/api/abogados/catalogo/961001/valoraciones?orden=incorrecto')).status,400);
  }finally{
    if(ids.length)execFileSync('docker',['compose','--env-file','docker/contacto-operativo-test/.env','-f','docker-compose.contacto-operativo-test.yml','exec','-T','postgres-operativa','psql','-v','ON_ERROR_STOP=1','-U','operativa_owner','-d','contacto_operativo_test','-c',`DELETE FROM contacto_whatsapp WHERE id IN (${ids.join(',')}) AND nombre='${nombre}'`],{cwd:root,stdio:'pipe'});
  }
});
