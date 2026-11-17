import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {fork} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
if(process.env.LEXI_GATEWAY_CHILD==='1'){
 const create=http.createServer;
 http.createServer=(...args)=>{
  const server=create(...args),listen=server.listen;
  server.listen=function(...params){params[0]=0;server.once('listening',()=>process.send({port:server.address().port}));return listen.apply(this,params)};
  return server;
 };
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'http://n8n:5678/webhook/orientacion-legal');assert.equal(options.headers.Authorization,undefined);
  const {chatInput}=JSON.parse(options.body);
  const replies={laboral:{orientacion:'Orientación sintética',estado:'RESPONDIDA',mostrarAbogados:true},divorcio:{orientacion:'Incorrecta',estado:'FUERA_DE_ALCANCE',mostrarAbogados:true},insulto:{orientacion:'Incorrecta',estado:'LENGUAJE_INAPROPIADO',mostrarAbogados:true},desconocido:{orientacion:'Texto',estado:'INCIERTA',mostrarAbogados:true},invalido:{orientacion:null,estado:'RESPONDIDA',mostrarAbogados:true},legado:{orientacion:'Texto antiguo'}};
  return chatInput==='503'?Response.json({error:'fallo sintético'},{status:503}):Response.json(replies[chatInput]);
 };
 await import('./gateway.mjs');
}else{
 test('ruta HTTP real del gateway valida contrato y mapea errores sin tocar su webhook habitual',async()=>{
  const child=fork(fileURLToPath(import.meta.url),[],{env:{...process.env,LEXI_GATEWAY_CHILD:'1',OP_JWT_SECRET:randomBytes(32).toString('base64')},stdio:['ignore','ignore','ignore','ipc']});
  try{
   const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Gateway de prueba no inició')),10000);child.once('message',msg=>{clearTimeout(timer);resolve(msg.port)});child.once('exit',()=>{clearTimeout(timer);reject(Error('Gateway de prueba terminó'))})});
   const request=input=>new Promise((resolve,reject)=>{
    const r=http.request({hostname:'127.0.0.1',port,path:'/api/lexi/orientacion',method:'POST',headers:{Host:'localhost:5173',Origin:'http://localhost:5173','Content-Type':'application/json'}},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(body)}))});r.on('error',reject);r.end(JSON.stringify({chatInput:input}));
   });
   const labor=await request('laboral');assert.equal(labor.status,200);assert.equal(labor.data.mostrarAbogados,true);
   for(const [input,text] of [['divorcio','Por ahora solo puedo orientarte en temas laborales (Ley de Contrato de Trabajo): despidos, indemnizaciones, sueldos, aguinaldo, vacaciones, jornada y licencias. Tu consulta es de otra materia, así que te conviene hablarlo directamente con un abogado'],['insulto','Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto']]){const r=await request(input);assert.equal(r.status,200);assert.equal(r.data.orientacion,text);assert.equal(r.data.mostrarAbogados,false)}
   for(const input of ['desconocido','invalido','legado','503']){const r=await request(input);assert.equal(r.status,503);assert.notEqual(r.data.mostrarAbogados,true)}
  }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));}
 });
}
