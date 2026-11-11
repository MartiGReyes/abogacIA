import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createDecipheriv } from 'node:crypto'
const base='http://127.0.0.1:5182',root=new URL('../../',import.meta.url),id=981102
const password=readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt',import.meta.url),'utf8').trim()
const env=readFileSync(new URL('../../docker/contacto-operativo-test/.env',import.meta.url),'utf8')
const key=Buffer.from(readFileSync(env.match(/^OP_KEY_PATH=(.+)$/m)![1].trim(),'utf8').trim(),'base64')
const docker=['compose','--env-file','docker/contacto-operativo-test/.env','-f','docker-compose.contacto-operativo-test.yml','exec','-T','postgres-operativa','psql','-X','-v','ON_ERROR_STOP=1','-U','operativa_owner','-d','contacto_operativo_test']
const sql=(q:string)=>execFileSync('docker',[...docker,'-tAc',q],{cwd:root,encoding:'utf8'}).trim()
let creado=false
test.beforeAll(async()=>{
 let listo=false;for(let n=0;n<90;n++){try{if((await fetch(base+'/api/abogados/catalogo')).status===200){listo=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}expect(listo,'Backend aislado disponible').toBe(true)
 expect(sql(`select count(*) from abogados_registrados where id_abogado=${id} or mail='catalogo.visitante@abogacia.local'`),'No sobrescribir cuentas existentes').toBe('0')
 sql(`begin; insert into abogados_registrados(id_abogado,version,nombre,apellido,dni,mail,nro_matricula,contrasena_hash,id_estado,correo_confirmado,dni_verificado,matricula_verificada,verificacion_dni,validacion_matricula) select ${id},0,'AUTOTEST','Catalogo','T0981102','catalogo.visitante@abogacia.local','PRUEBA-${id}',contrasena_hash,id_estado,false,false,false,'DECLARADA_NO_VERIFICADA','FICTICIA_NO_VERIFICADA' from abogados_registrados where id_abogado=961002; insert into abogado_especialidades values(${id},'Derecho Laboral');insert into operativa.cuenta_prueba(id_abogado,contexto) values(${id},gen_random_uuid());commit;`)
 creado=true
})
test.afterAll(()=>{
 if(!creado)return
 const r=JSON.parse(sql(`select row_to_json(p) from (select contexto,encode(dni_cifrado,'hex') dni,encode(telefono_cifrado,'hex') telefono from operativa.cuenta_prueba where id_abogado=${id}) p`))
 for(const [campo,esperado] of [['dni','99000992'],['telefono','5493510000008']]){if(r[campo]){const b=Buffer.from(r[campo],'hex'),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAAD(Buffer.from(r.contexto+':'+campo));d.setAuthTag(b.subarray(-16));if(Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString()!==esperado)throw new Error('No eliminar datos distintos de los sintéticos.')}}
 sql(`begin;do $$ begin if not exists(select 1 from abogados_registrados where id_abogado=${id} and mail='catalogo.visitante@abogacia.local' and nro_matricula='PRUEBA-${id}') then raise exception 'No limpiar una cuenta distinta';end if;end $$;delete from whatsapp_autorizacion where id_abogado=${id};delete from operativa.cuenta_prueba where id_abogado=${id};delete from abogado_especialidades where id_abogado=${id};delete from abogados_registrados where id_abogado=${id};commit;`)
})
test.beforeAll(async()=>{
 const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({mail:'catalogo.visitante@abogacia.local',contrasena:password,tipoCuenta:'ABOGADO'})});expect(r.status).toBe(200);const {token}=await r.json()
 for(const [ruta,data,method] of [['/dni-prueba',{dni:'99000992'},'POST'],['/whatsapp/telefono',{telefono:'+5493510000008'},'PUT'],['/whatsapp',{permitido:true},'POST']] as const){
  const response=await fetch(base+'/api/abogados/me'+ruta,{method,headers:{'Content-Type':'application/json',Origin:base,Authorization:'Bearer '+token},body:JSON.stringify(data)});expect(response.status).toBe(200)
 }
})
test('visitante ve catálogo; Contactar exige login y retoma el mismo abogado sin exponer el formulario',async({page})=>{
 await page.goto('/')
 const tarjeta=page.locator('#abogados article').filter({has:page.getByRole('heading',{name:'AUTOTEST Catalogo',exact:true})})
 await expect(tarjeta).toBeVisible();await expect(tarjeta.getByRole('button',{name:'Contactar',exact:true})).toBeEnabled();await expect(page.getByRole('form',{name:'Formulario de contacto'})).toHaveCount(0)
 const catalogo=await page.request.get('/api/abogados/catalogo');expect(catalogo.status()).toBe(200);const perfil=(await catalogo.json()).find((p:{idAbogado:number})=>p.idAbogado===id);expect(perfil.matriculaVerificada).toBe(false);expect(JSON.stringify(perfil)).not.toMatch(/99000992|5493510000008/)
 expect((await page.request.post('/api/abogados/contacto/whatsapp',{data:{}})).status()).toBe(401)
 await tarjeta.getByRole('button',{name:'Contactar',exact:true}).click();await expect(page).toHaveURL(base+'/iniciar-sesion');await expect(page.getByText('Iniciá sesión como ciudadano para contactar',{exact:true})).toBeVisible();await expect(page.getByRole('form',{name:'Formulario de contacto'})).toHaveCount(0)
 await page.getByLabel('Email',{exact:true}).fill('ciudadano.prueba@abogacia.local');await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click();await expect(page).toHaveURL(base+'/')
 const form=tarjeta.getByRole('form',{name:'Formulario de contacto'});await expect(form).toBeVisible();await expect(form).toHaveAttribute('data-componente','FormularioContacto');await expect(form.getByRole('heading',{name:'Contactar a AUTOTEST Catalogo',exact:true})).toBeVisible()
 await form.getByLabel('Nombre del ciudadano').fill('Ciudadano sintético');await form.getByLabel('Número de contacto del ciudadano').fill('+5493510000009');await form.getByLabel('Resumen editable de la consulta').fill('Consulta técnica sintética.');await form.getByRole('checkbox').check()
 let destino='';await page.context().route('https://wa.me/**',r=>{destino=r.request().url();return r.fulfill({contentType:'text/html; charset=utf-8',body:'WhatsApp interceptado'})})
 const pop=page.waitForEvent('popup');await form.getByRole('button',{name:'Abrir WhatsApp',exact:true}).click();const popup=await pop;await expect(popup.getByText('WhatsApp interceptado')).toBeVisible();await popup.close();expect(new URL(destino).pathname).toBe('/5493510000008')
 await page.locator('nav').getByRole('button',{name:/Ciudadano/}).click();await page.getByRole('menuitem',{name:'Cerrar sesión'}).click();await expect(page.getByRole('form',{name:'Formulario de contacto'})).toHaveCount(0);await expect(tarjeta).toBeVisible();await expect(tarjeta.getByRole('button',{name:'Contactar',exact:true})).toBeEnabled()
})
test('visitante conversa con Lexi y ve abogados; solo Contactar exige login y conserva el destinatario',async({page})=>{
 await page.route('**/api/lexi/orientacion',r=>{expect(r.request().headers().authorization).toBeUndefined();return r.fulfill({json:{orientacion:'Orientación laboral sintética.'}})})
 await page.goto('/');await page.locator('#inicio').getByRole('button',{name:'Consultar a Lexi',exact:true}).click()
 const chat=page.getByRole('region',{name:'Chat con Lexi'});await chat.getByLabel('Escribí tu consulta').fill('Me despidieron sin causa.');await chat.getByRole('button',{name:'Enviar consulta'}).click();await chat.getByRole('button',{name:'Sí, ver abogados',exact:true}).click()
 const tarjeta=chat.locator('article').filter({has:page.getByRole('heading',{name:'AUTOTEST Catalogo',exact:true})})
 await expect(tarjeta).toBeVisible();await expect(chat.getByRole('form',{name:'Formulario de contacto'})).toHaveCount(0)
 await tarjeta.getByRole('button',{name:'Contactar',exact:true}).click();await expect(page).toHaveURL(base+'/iniciar-sesion');await expect(page.getByRole('form',{name:'Formulario de contacto'})).toHaveCount(0)
 await page.getByLabel('Email',{exact:true}).fill('ciudadano.prueba@abogacia.local');await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click();await expect(page).toHaveURL(base+'/')
 const seleccionada=page.locator('#abogados article').filter({has:page.getByRole('heading',{name:'AUTOTEST Catalogo',exact:true})});await expect(seleccionada.getByRole('form',{name:'Formulario de contacto'})).toBeVisible()
})
