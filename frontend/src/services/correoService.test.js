import {test} from 'node:test';import assert from 'node:assert/strict';
import {baseCorreo,reenviarConfirmacion} from './correoService.js';
test('las URLs relativas habituales no forman un hostname api',()=>{
 assert.equal(baseCorreo('CIUDADANO',{CIUDADANO:'/'}),'/api/ciudadanos');
 assert.equal(baseCorreo('ABOGADO',{ABOGADO:'/'}),'/api/abogados');
 assert.equal(baseCorreo('ABOGADO',{ABOGADO:'http://localhost:8082/'}),'http://localhost:8082/api/abogados');
});
test('reenvío normaliza y mantiene independientes los servicios',async()=>{
 const calls=[];globalThis.fetch=async(url,o)=>{calls.push({url,body:JSON.parse(o.body)});return Response.json({mensaje:'Si corresponde, recibirás instrucciones.'})};
 await reenviarConfirmacion('CIUDADANO',' Dual@Example.INVALID ');await reenviarConfirmacion('ABOGADO','dual@example.invalid');
 assert.match(calls[0].url,/\/api\/ciudadanos\/correo\/reenviar$/);assert.match(calls[1].url,/\/api\/abogados\/correo\/reenviar$/);assert.deepEqual(calls[0].body,calls[1].body);
 await assert.rejects(reenviarConfirmacion('ADMIN','dual@example.invalid'));assert.equal(calls.length,2);
});
test('errores SMTP o de cuota no publican la respuesta interna',async()=>{
 globalThis.fetch=async()=>Response.json({error:'detalle confidencial'},{status:429});
 await assert.rejects(reenviarConfirmacion('CIUDADANO','dual@example.invalid'),e=>!e.message.includes('confidencial'));
});
