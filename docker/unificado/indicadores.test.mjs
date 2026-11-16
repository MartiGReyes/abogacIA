import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const base='http://localhost:5173',nombre='Ciudadano sintético US19-27';
const password=readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt',import.meta.url),'utf8').trim();
async function req(path,{token,body,method=body?'POST':'GET'}={}){return fetch(base+path,{method,headers:{Origin:base,...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});}
async function login(mail,tipoCuenta){for(let i=0;i<12;i++){const r=await req('/api/auth/login',{body:{mail,tipoCuenta,contrasena:password}});if(r.status===503&&i<11){await new Promise(resolve=>setTimeout(resolve,1500));continue;}assert.equal(r.status,200);return(await r.json()).token;}}
const cents=v=>{const [a,b='']=String(v||'0').split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'));};
const statPath='/api/abogados/me/estadisticas?desde=2001-01-01&hasta=2001-02-28&mes=2001-01';
test('US19–US27: indicadores, clasificación, ingresos exactos, fechas, unicidad y titularidad',async()=>{
  const abogado=await login('abogado.prueba@abogacia.local','ABOGADO'),ciudadano=await login('ciudadano.prueba@abogacia.local','CIUDADANO'),otro=await login('abogado.otro@abogacia.local','ABOGADO');
  const stats=async(token=abogado,path=statPath)=>{const r=await req(path,{token});assert.equal(r.status,200);return r.json();};
  const before=await stats(),beforeOther=await stats(otro),beforeFeb=await stats(abogado,statPath.replace('mes=2001-01','mes=2001-02')),ids=[];
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
  const dailyPath=`/api/abogados/me/estadisticas?desde=${today}&hasta=${today}&mes=${today.slice(0,7)}`,beforeToday=await stats(abogado,dailyPath);
  assert.equal((await req(statPath)).status,401);assert.equal((await req(statPath,{token:ciudadano})).status,403);
  assert.equal((await req('/api/abogados/me/estadisticas?desde=2026-11-12&hasta=2026-11-11',{token:abogado})).status,400);
  assert.equal((await req('/api/abogados/me/estadisticas?mes=2026-13',{token:abogado})).status,400);
  const catalog=await(await req('/api/abogados/catalogo')).json(),profesional=catalog.find(r=>r.idAbogado===961001);
  assert.ok(profesional.contactoHabilitado);const area=profesional.especialidades[0];
  const body={abogado:{tipo:'PROFESIONAL',id:'961001'},nombre,telefono:'+5493510000009',resumen:'Solicitud sintética para indicadores económicos.',mensajeConfirmado:'Mensaje de prueba de indicadores.',consentimiento:true,avisoVersion:'contacto-whatsapp-v1',areaJuridica:area};
  assert.equal((await req('/api/abogados/contacto/whatsapp',{token:ciudadano,body:{...body,areaJuridica:'Área inexistente'}})).status,400);
  assert.equal((await stats()).indicadores.recibidas,before.indicadores.recibidas,'el área inválida no crea solicitudes');
  try{
    for(let i=0;i<4;i++){const r=await req('/api/abogados/contacto/whatsapp',{token:ciudadano,body});assert.equal(r.status,200);ids.push((await r.json()).idSolicitud);}
    const change=async(id,estado,estadoActual)=>{const r=await req(`/api/abogados/me/contactos/${id}/estado`,{token:abogado,method:'PATCH',body:{estado,estadoActual}});assert.equal(r.status,200);};
    for(const id of ids.slice(1))await change(id,'EN_CURSO','PENDIENTE');
    for(const id of ids.slice(2))await change(id,'FINALIZADA','EN_CURSO');
    const income=(id,importe,fechaIngreso='2001-01-31',method='POST',token=abogado)=>req(`/api/abogados/me/contactos/${id}/ingreso`,{token,method,body:{importe,fechaIngreso}});
    assert.equal((await income(ids[0],'10.00')).status,409);assert.equal((await income(ids[1],'10.00')).status,409);
    assert.equal((await income(ids[2],'10.00','2001-01-31','POST',otro)).status,404);assert.equal((await income(ids[2],'10.00','2001-01-31','POST',ciudadano)).status,403);
    assert.equal((await req(`/api/abogados/me/contactos/${ids[2]}/ingreso`,{token:otro})).status,404);
    for(const bad of ['-0.01','0.001','10000000000000','no-numérico'])assert.equal((await income(ids[2],bad)).status,400);
    assert.equal((await income(ids[2],'1.00','2001-02-30')).status,400);
    assert.equal((await income(ids[2],'0.00')).status,201,'cero es un ingreso registrado');
    let data=await stats();assert.equal(data.mensual.cantidad,before.mensual.cantidad+1);assert.equal(cents(data.acumulado.total),cents(before.acumulado.total));
    assert.equal((await income(ids[2],'5.00')).status,409,'no hay ingresos independientes duplicados');
    assert.equal((await income(ids[2],'10.20','2001-02-01','PUT')).status,200);
    assert.equal((await income(ids[3],'0.10','2001-02-28')).status,201);
    data=await stats();assert.equal(cents(data.acumulado.total)-cents(before.acumulado.total),1030n);assert.equal(cents(data.periodo.total)-cents(before.periodo.total),1030n);
    assert.equal(data.mensual.cantidad,before.mensual.cantidad,'la corrección de fecha mueve el ingreso fuera del mes de enero');
    const feb=await stats(abogado,statPath.replace('mes=2001-01','mes=2001-02'));assert.equal(cents(feb.mensual.total)-cents(beforeFeb.mensual.total),1030n);
    const daily=await stats(abogado,dailyPath);assert.equal(daily.consultas[0].valor,beforeToday.consultas[0].valor+4,'agrupa todas las solicitudes por fecha de registro, sin importar el estado');
    assert.equal(data.indicadores.recibidas,before.indicadores.recibidas+4);assert.equal(data.indicadores.pendientes,before.indicadores.pendientes+1);assert.equal(data.indicadores.en_curso,before.indicadores.en_curso+1);assert.equal(data.indicadores.finalizadas,before.indicadores.finalizadas+2);
    assert.equal(data.areas.find(a=>a.area===area).cantidad,(before.areas.find(a=>a.area===area)?.cantidad||0)+4);
    assert.ok(data.asesoramientos.find(c=>c.id===ids[2]).registrado);
    const ingresoFecha=await(await req(`/api/abogados/me/contactos/${ids[2]}/ingreso`,{token:abogado})).json();assert.equal(ingresoFecha.fechaIngreso,'2001-02-01');
    for(const id of [ids[0],ids[2]])assert.equal((await req(`/api/abogados/contactos/mios/${id}/valoracion`,{token:ciudadano,body:{puntuacion:id===ids[0]?1:5,comentario:'Prueba sintética.'}})).status,201);
    data=await stats();assert.equal(data.valoraciones.cantidad,before.valoraciones.cantidad+2,'incluye valoraciones pendientes y finalizadas');
    const pub=await(await req('/api/abogados/catalogo/961001/valoraciones')).json();assert.equal(Number(data.valoraciones.promedio),Number(pub.promedio));
    const otherAfter=await stats(otro);assert.deepEqual(otherAfter.indicadores,beforeOther.indicadores);assert.deepEqual(otherAfter.acumulado,beforeOther.acumulado);
    // Un finalizado sin ingreso debe seguir siendo diferente de un ingreso cero.
    await change(ids[1],'FINALIZADA','EN_CURSO');data=await stats();const missing=data.asesoramientos.find(c=>c.id===ids[1]);assert.equal(missing.registrado,false);assert.equal(missing.importe,null);
    assert.ok(data.ingresos.some(p=>p.periodo==='2001-02-01'&&cents(p.valor)===1020n));assert.ok(data.ingresos.some(p=>p.periodo==='2001-02-28'&&cents(p.valor)===10n));
  }finally{
    if(ids.length)execFileSync('docker',['compose','--env-file','docker/contacto-operativo-test/.env','-f','docker-compose.contacto-operativo-test.yml','exec','-T','postgres-operativa','psql','-v','ON_ERROR_STOP=1','-U','operativa_owner','-d','contacto_operativo_test','-c',`DELETE FROM contacto_whatsapp WHERE id IN (${ids.join(',')}) AND nombre='${nombre}'`],{cwd:new URL('../../',import.meta.url),stdio:'pipe'});
  }
});
