import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createDecipheriv } from 'node:crypto';
const root=new URL('../../',import.meta.url),base='http://127.0.0.1:5182';
const env=readFileSync(new URL('./.env',import.meta.url),'utf8');
const password=readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt',import.meta.url),'utf8').trim();
const key=Buffer.from(readFileSync(env.match(/^OP_KEY_PATH=(.+)$/m)[1].trim(),'utf8').trim(),'base64');
const docker=['compose','--env-file','docker/contacto-operativo-test/.env','-f','docker-compose.contacto-operativo-test.yml','exec','-T','postgres-operativa','psql','-X','-v','ON_ERROR_STOP=1','-U','operativa_owner','-d','contacto_operativo_test'];
const sql=q=>execFileSync('docker',[...docker,'-tAc',q],{cwd:root,encoding:'utf8'}).trim();
const endpoint='/api/abogados/contacto/whatsapp';
async function req(path,body,token,method=body===undefined?'GET':'POST'){
 return fetch(base+path,{method,headers:{Origin:base,...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function ok(path,body,token,method){const r=await req(path,body,token,method);assert.equal(r.status,200,path);return r.json();}
async function login(mail,tipoCuenta){return (await ok('/api/auth/login',{mail,contrasena:password,tipoCuenta})).token;}
const f=(id,n,resumen='Consulta técnica sintética.')=>({abogado:{tipo:'PROFESIONAL',id:String(id)},nombre:'Ciudadano sintético',telefono:'+5493510000009',resumen,mensajeConfirmado:`Hola, Abogado de prueba ${n}. Quisiera realizar una consulta.\n\nNombre: Ciudadano sintético\nTeléfono de contacto: +5493510000009\nResumen: ${resumen}`,consentimiento:true,avisoVersion:'contacto-whatsapp-v1'});
const campos=['nombre','apellido','fechaNacimiento','mail','nroCelular','domicilio','especialidades','aniosExperiencia','honorarios','ubicacion','direccionProfesional','descripcionProfesional'];
const datos=(p,telefono)=>Object.fromEntries(campos.map(k=>[k,k==='nroCelular'?telefono:p[k]]));
function descifrar(hex,contexto,campo){const b=Buffer.from(hex,'hex');const d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAAD(Buffer.from(contexto+':'+campo));d.setAuthTag(b.subarray(-16));return Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString();}
function limpiarSinteticos(){
 const rows=JSON.parse(sql("select coalesce(json_agg(p),'[]') from (select id_abogado,contexto,encode(dni_cifrado,'hex') dni,encode(telefono_cifrado,'hex') telefono from operativa.cuenta_prueba where id_abogado in(961001,961002)) p"));
 for(const r of rows){
  const dni=r.dni?descifrar(r.dni,r.contexto,'dni'):'';const tel=r.telefono?descifrar(r.telefono,r.contexto,'telefono'):'';
  if((!dni||['99000111','99000112'].includes(dni))&&(!tel||['5493510000000','5493510000002'].includes(tel)))
   sql(`update operativa.cuenta_prueba set dni_cifrado=null,telefono_cifrado=null where id_abogado=${Number(r.id_abogado)}; update whatsapp_autorizacion set permitido=false where id_abogado=${Number(r.id_abogado)}; update abogados_registrados set nro_celular=null where id_abogado=${Number(r.id_abogado)} and nro_matricula like 'PRUEBA-%';`);
  else throw new Error('La limpieza detectó datos distintos de los sintéticos: no se sobrescribieron.');
 }
}
test('cuentas auténticas ABOGADO y CIUDADANO: perfil, permisos, catálogo y contacto',async t=>{
 for(let n=0;n<90;n++){try{
  const c=await req('/api/auth/login',{mail:'ciudadano.prueba@abogacia.local',contrasena:password,tipoCuenta:'CIUDADANO'});
  const a=await req('/api/auth/login',{mail:'abogado.prueba@abogacia.local',contrasena:password,tipoCuenta:'ABOGADO'});
  if(c.status===200&&a.status===200)break;
 }catch{}if(n===89)throw new Error('Autenticación aislada no disponible');await new Promise(r=>setTimeout(r,500));}
 assert.equal(sql('select count(*) from operativa.cuenta_prueba where dni_cifrado is not null or telefono_cifrado is not null'),'0','No ejecutar sobre datos personales cargados.');
 const a=await login('abogado.prueba@abogacia.local','ABOGADO'),b=await login('abogado.otro@abogacia.local','ABOGADO'),c=await login('ciudadano.prueba@abogacia.local','CIUDADANO');
 try{
  await t.test('login normal, JWT y dashboard propio sin aprobar Didit ni matrícula',async()=>{
   const p=await ok('/api/abogados/me',undefined,a);assert.equal(p.cuentaPrueba,true);assert.equal(p.verificacionDni,'DECLARADA_NO_VERIFICADA');assert.equal(p.validacionMatricula,'FICTICIA_NO_VERIFICADA');assert.equal(p.whatsappAutorizado,false);
   assert.equal((await req('/api/abogados/me/dashboard/resumen',undefined,a)).status,200);
   assert.equal((await ok('/api/ciudadanos/me',undefined,c)).idCiudadano,971001);
   assert.equal((await req('/api/abogados/me',undefined,c)).status,403);assert.equal((await req('/api/abogados/me')).status,401);
   assert.equal((await req('/api/auth/login',{mail:'abogado.prueba@abogacia.local',contrasena:'incorrecta',tipoCuenta:'ABOGADO'})).status,401);
   assert.equal((await req('/api/abogados/me',undefined,a.slice(0,-5)+'wrong')).status,401);
  });
  await t.test('DNI y WhatsApp se guardan solo desde el perfil autenticado y persisten al reingresar',async()=>{
   for(const [token,id,dni,tel] of [[a,961001,'99000111','+5493510000000'],[b,961002,'99000112','+5493510000002']]){
    const p=await ok('/api/abogados/me',undefined,token);await ok('/api/abogados/me/dni-prueba',{dni},token);
    await ok('/api/abogados/me',datos(p,tel),token,'PUT');await ok('/api/abogados/me/whatsapp',{permitido:true},token);
   }
   const nuevo=await login('abogado.prueba@abogacia.local','ABOGADO');const p=await ok('/api/abogados/me',undefined,nuevo);assert.equal(p.nroCelular,'5493510000000');assert.equal(p.dni,'Ingresado y cifrado');assert.equal(p.whatsappAutorizado,true);
   const seguro=JSON.parse(sql("select json_agg(p) from (select a.dni,a.nro_celular,encode(c.dni_cifrado,'hex') cifrado from abogados_registrados a join operativa.cuenta_prueba c using(id_abogado) where a.id_abogado in(961001,961002)) p"));
   assert.ok(seguro.every(p=>p.dni.startsWith('T')&&p.nro_celular==='CIFRADO'&&!p.cifrado.includes(Buffer.from('99000111').toString('hex'))));
  });
  await t.test('aislamiento entre titulares: no IDs elegibles en escrituras ni acceso ciudadano',async()=>{
   assert.equal((await req('/api/abogados/me/dni-prueba',{dni:'99000111',idAbogado:961002},a)).status,400);
   assert.equal((await req('/api/abogados/me/whatsapp',{permitido:false,idAbogado:961002},a)).status,400);
   assert.equal((await req('/api/abogados/me/whatsapp',{permitido:false},c)).status,403);
   assert.equal((await req('/api/abogados/me/dni-prueba',{dni:'99000111'},c)).status,403);
   assert.equal((await ok('/api/abogados/me',undefined,b)).nroCelular,'5493510000002');
  });
  await t.test('catálogo y recomendaciones habituales devuelven cuentas persistidas solo al ciudadano autenticado',async()=>{
   for(const ruta of ['/api/abogados/catalogo','/api/abogados/recomendaciones?especialidad=Derecho%20Laboral']){
    const perfiles=(await ok(ruta,undefined,c)).filter(p=>p.cuentaPrueba);assert.equal(perfiles.length,2);assert.deepEqual(perfiles.map(p=>p.idAbogado),[961001,961002]);
    assert.ok(perfiles.every(p=>p.matriculaVerificada===false&&p.identidadVerificada===false&&p.contactoHabilitado));
    assert.ok(!JSON.stringify(perfiles).match(/99000111|5493510000000|PRUEBA-961/));
    assert.equal((await ok(ruta)).filter(p=>p.cuentaPrueba).length,2);
   }
   assert.equal((await req('/api/abogados/desarrollo/perfil')).status,404);assert.equal((await req('/api/pruebas-operativas/sesion')).status,404);
  });
  await t.test('destinatario correcto por ID, consentimiento obligatorio y sin datos sensibles',async()=>{
   assert.equal((await req(endpoint,f(961001,1))).status,401);assert.equal((await req(endpoint,f(961001,1),a)).status,403);
   const uno=await ok(endpoint,f(961001,1),c),dos=await ok(endpoint,f(961002,2),c);
   assert.equal(new URL(uno.url).pathname,'/5493510000000');assert.equal(new URL(dos.url).pathname,'/5493510000002');assert.notEqual(uno.url,dos.url);
   assert.match(uno.aviso,/no confirma/);assert.ok(!decodeURIComponent(uno.url).match(/99000111|PRUEBA-|Didit/));
   assert.equal((await req(endpoint,{...f(961001,1),consentimiento:false},c)).status,400);
   assert.equal((await req(endpoint,{...f(961001,1),resumen:'Editado'},c)).status,400);
   assert.equal((await req(endpoint,{...f(961001,1),numeroDestino:'5493510000008'},c)).status,400);
   assert.equal((await req(endpoint,f(961001,1,'DNI 99000111'),c)).status,400);
   assert.equal((await req(endpoint,{...f(961001,1),telefono:'0351 15 0000000'},c)).status,400);
  });
  await t.test('revocación, número inválido y edición del celular invalidan la autorización',async()=>{
   await ok('/api/abogados/me/whatsapp',{permitido:false},a);assert.equal((await req(endpoint,f(961001,1),c)).status,409);
   const p=await ok('/api/abogados/me',undefined,a);assert.equal((await req('/api/abogados/me',datos(p,'0351 15 0000000'),a,'PUT')).status,400);
   await ok('/api/abogados/me/whatsapp',{permitido:true},a);const editado=await ok('/api/abogados/me',datos(p,'+5493510000002'),a,'PUT');assert.equal(editado.whatsappAutorizado,false);
   assert.equal((await req(endpoint,f(961001,1),c)).status,409);
  });
 }finally{limpiarSinteticos();}
});
