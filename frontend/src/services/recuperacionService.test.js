import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solicitarRecuperacion, confirmarRecuperacion } from './recuperacionService.js';
test('la recuperación se dirige al servicio del tipo de cuenta, con igual correo',async()=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({mensaje:'Instrucciones'})};
 await solicitarRecuperacion('CIUDADANO',' dual@example.invalid ');await solicitarRecuperacion('ABOGADO','dual@example.invalid');
 assert.match(calls[0].url,/8080\/api\/ciudadanos\/recuperacion\/solicitar$/);
 assert.match(calls[1].url,/8082\/api\/abogados\/recuperacion\/solicitar$/);
 assert.deepEqual(calls[0].body,calls[1].body);
 await assert.rejects(solicitarRecuperacion('ADMIN','dual@example.invalid'),/Seleccioná/);
 assert.equal(calls.length,2);
});
test('un error no borra sesiones y los cuerpos internos no se exponen',async()=>{
 globalThis.fetch=async()=>Response.json({error:'secreto interno'},{status:503});
 await assert.rejects(confirmarRecuperacion('ABOGADO','synthetic','clave','clave'),e=>/temporalmente/.test(e.message)&&!e.message.includes('secreto'));
});
