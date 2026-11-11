import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptarPerfil, mensajeWhatsApp, prepararContacto } from './contactoService.js';
globalThis.sessionStorage={getItem:()=>JSON.stringify({token:'synthetic-test-token',expiresAt:Date.now()+60000}),removeItem(){}};
const a=adaptarPerfil({idAbogado:123,nombre:'Profesional',apellido:'Sintético',especialidades:['Derecho Civil'],perfilPrueba:false,contactoHabilitado:true});
const datos={nombre:'Ciudadano sintético',telefono:'+5493510000009',resumen:'Consulta técnica.'};
test('profesionales y perfiles operativos conservan referencias con espacios de IDs separados',()=>{
 assert.deepEqual(a.referencia,{tipo:'PROFESIONAL',id:'123'});
 const p=adaptarPerfil({idAbogado:961001,nombre:'Alias',cuentaPrueba:true,especialidades:['Derecho Civil'],perfilPrueba:true,contactoHabilitado:true});
 assert.equal(p.referencia.tipo,'PROFESIONAL');assert.equal(p.perfilPrueba,true);
 assert.equal(adaptarPerfil({...a,perfilPrueba:true}).referencia.tipo,'FICTICIO');
});
test('vista previa incluye destinatario seleccionado y los tres campos, sin datos profesionales',()=>{
 const m=mensajeWhatsApp(a,datos);assert.match(m,/Hola, Profesional Sintético/);assert.match(m,/Ciudadano sintético/);assert.match(m,/Consulta técnica/);assert.ok(!/DNI|matrícula|Didit/.test(m));
});
test('ambos caminos preparan por referencia, sin número libre de destino',async()=>{
 const previo=globalThis.fetch;
 globalThis.fetch=async(url,opciones)=>{assert.match(url,/\/api\/abogados\/contacto\/whatsapp$/);const b=JSON.parse(opciones.body);assert.deepEqual(b.abogado,a.referencia);assert.equal(b.numeroDestino,undefined);assert.equal(b.consentimiento,true);return Response.json({url:'https://wa.me/5493510000001?text=prueba',aviso:'Confirmá en WhatsApp.'});};
 try{assert.match((await prepararContacto(a,datos,mensajeWhatsApp(a,datos))).url,/wa.me/);}finally{globalThis.fetch=previo;}
});
test('editar mensaje invalida el consentimiento y no acepta enlaces externos arbitrarios',async()=>{
 const previo=globalThis.fetch;
 globalThis.fetch=async(_,o)=>{assert.equal(JSON.parse(o.body).consentimiento,false);return Response.json({url:'https://otro.example/robar',aviso:''});};
 try{await assert.rejects(prepararContacto(a,{...datos,resumen:'Editado'},mensajeWhatsApp(a,datos)),/Contacto no disponible/);}finally{globalThis.fetch=previo;}
});
