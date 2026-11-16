import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { crearConversacion } from './lexiConversation.js';
import { normalizarRespuesta, MENSAJES } from './lexiContract.js';
import { obtenerOrientacion } from './lexiService.js';
const valid = { orientacion: 'Orientación', estado: 'RESPONDIDA', mostrarAbogados: true };
const workflow = JSON.parse(fs.readFileSync(new URL('../../../n8n/lexi-candidata/workflow.json', import.meta.url)));
const run = (name, json) => vm.runInNewContext(`(function(){${workflow.nodes.find(n=>n.name===name).parameters.jsCode}})()`, { $json:json });

test('API conserva contrato y no acepta autorización implícita', async () => {
  for(const data of [valid, {orientacion:'Legada'}, {...valid,mostrarAbogados:'true'}, {...valid,estado:'INCIERTA'}]) {
    const reply = await obtenerOrientacion('Consulta', {fetchImpl:async()=>Response.json(data)});
    assert.equal(reply.mostrarAbogados, data === valid);
  }
});
test('rechazos siempre usan mensajes exactos incluso ante respuesta contradictoria', () => {
  for(const estado of Object.keys(MENSAJES)) {
    const r=normalizarRespuesta({orientacion:'Ignorar',estado,mostrarAbogados:true});
    assert.equal(r.orientacion,MENSAJES[estado]); assert.equal(r.mostrarAbogados,false);
  }
});
test('recomendación pendiente no reaparece después de rechazo y se recupera flujo válido', async () => {
  let finish, count=0;
  const chat=crearConversacion(async()=>++count===2?{orientacion:'Ignorar',estado:'FUERA_DE_ALCANCE',mostrarAbogados:true}:valid,()=>new Promise(r=>{finish=r}));
  await chat.send('Me despidieron sin causa');
  const pending=chat.decidir(chat.getSnapshot().msgs.at(-1).id,true);
  await chat.send('Quiero divorciarme');
  assert.deepEqual(chat.getSnapshot().recomendaciones,{});
  finish([{nombre:'No debe aparecer'}]);await pending;
  assert.deepEqual(chat.getSnapshot().recomendaciones,{});
  await chat.send('Mi jefe me insultó y me amenazó con despedirme');
  assert.equal(Object.values(chat.getSnapshot().recomendaciones)[0].mostrarAbogados,true);
});
test('fallo técnico limpia ofertas y permite reintentar',async()=>{
  let fail=false;const chat=crearConversacion(async()=>{if(fail)throw Error('Fallo técnico');return valid});
  await chat.send('Laboral');fail=true;await chat.send('Otra');
  assert.deepEqual(chat.getSnapshot().recomendaciones,{});assert.equal(chat.getSnapshot().error,'Fallo técnico');
  fail=false;await chat.retry();assert.equal(Object.keys(chat.getSnapshot().recomendaciones).length,1);
});
test('workflow no usa la rama generativa para rechazos',()=>{
  assert.equal(workflow.active,false);
  assert.equal(workflow.connections['Consulta admitida'].main[1][0].node,'Respuesta fija');
  assert.equal(workflow.connections['Respuesta fija'].main[0][0].node,'Respond to Webhook');
  for(const estado of Object.keys(MENSAJES)){
    const r=run('Respuesta fija',{estado})[0].json;assert.equal(r.orientacion,MENSAJES[estado]);assert.equal(r.mostrarAbogados,false);
  }
  assert.ok(workflow.nodes.every(n=>!n.credentials));
});
test('clasificador inválido o incierto falla sin recomendaciones',()=>{
  for(const c of [{estado:'RESPONDIDA',confianza:0.5},{estado:'INCIERTA',confianza:1},{estado:'RESPONDIDA',confianza:'1'},null])assert.throws(()=>run('Validar clasificación',{output:JSON.stringify(c)}));
  assert.throws(()=>run('Validar clasificación',{output:'fallo'}));
  assert.equal(run('Validar clasificación',{output:JSON.stringify({estado:'RESPONDIDA',confianza:0.99})})[0].json.estado,'RESPONDIDA');
});
test('falta de evidencia no cambia materia a fuera de alcance',()=>{
  const output=JSON.stringify({orientacion:'No pude verificar la norma.',respaldoSuficiente:false});
  const r=run('Validar orientación',{output})[0].json;
  assert.equal(r.estado,'RESPONDIDA');assert.equal(r.mostrarAbogados,false);
});
test('requiere evidencia de herramienta y respaldo explícito para recomendar',()=>{
  const output=JSON.stringify({orientacion:'Orientación respaldada',respaldoSuficiente:true});
  assert.equal(run('Validar orientación',{output})[0].json.mostrarAbogados,false);
  assert.equal(run('Validar orientación',{output,intermediateSteps:[{observation:'Sin resultados'}]})[0].json.mostrarAbogados,false);
  assert.equal(run('Validar orientación',{output,intermediateSteps:[{observation:JSON.stringify([{pageContent:'Fragmento sintético LCT'}])}]})[0].json.mostrarAbogados,true);
  assert.throws(()=>run('Validar orientación',{output:'fallo de proveedor'}));
});
test('acepta cerco JSON completo y distingue error de herramienta de ausencia de documentos',()=>{
  const c=run('Validar clasificación',{text:'```json\n'+JSON.stringify({estado:'RESPONDIDA',confianza:0.99})+'\n```'});
  assert.equal(c[0].json.estado,'RESPONDIDA');
  const output='```json\n'+JSON.stringify({orientacion:'Respaldada',respaldoSuficiente:true})+'\n```';
  const intermediateSteps=[{observation:JSON.stringify([{pageContent:'Fragmento sintético'}])}];
  assert.equal(run('Validar orientación',{output,intermediateSteps})[0].json.mostrarAbogados,true);
  assert.throws(()=>run('Validar orientación',{output,intermediateSteps:[{observation:'[{"error":"fallo técnico"}]'}]}),/Error técnico/);
  assert.throws(()=>run('Validar clasificación',{text:'texto antes '+JSON.stringify({estado:'RESPONDIDA',confianza:1})}));
});
