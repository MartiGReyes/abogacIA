import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createDecipheriv } from 'node:crypto'
const base='http://127.0.0.1:5182',root=new URL('../../',import.meta.url),id=981101
const password=readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt',import.meta.url),'utf8').trim()
const env=readFileSync(new URL('../../docker/contacto-operativo-test/.env',import.meta.url),'utf8')
const key=Buffer.from(readFileSync(env.match(/^OP_KEY_PATH=(.+)$/m)![1].trim(),'utf8').trim(),'base64')
const docker=['compose','--env-file','docker/contacto-operativo-test/.env','-f','docker-compose.contacto-operativo-test.yml','exec','-T','postgres-operativa','psql','-X','-v','ON_ERROR_STOP=1','-U','operativa_owner','-d','contacto_operativo_test']
const sql=(q:string)=>execFileSync('docker',[...docker,'-tAc',q],{cwd:root,encoding:'utf8'}).trim()
let creado=false
test.beforeAll(async()=>{
 let listo=false;for(let n=0;n<90;n++){try{if((await fetch(base+'/api/abogados/catalogo')).status===200){listo=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}expect(listo,'Backend aislado disponible').toBe(true)
 expect(sql(`select count(*) from abogados_registrados where id_abogado=${id} or mail='checkbox.prueba@abogacia.local'`),'No sobrescribir cuentas existentes').toBe('0')
 sql(`begin; insert into abogados_registrados(id_abogado,version,nombre,apellido,dni,mail,nro_matricula,contrasena_hash,id_estado,correo_confirmado,dni_verificado,matricula_verificada,verificacion_dni,validacion_matricula) select ${id},0,'AUTOTEST','WhatsApp','T0981101','checkbox.prueba@abogacia.local','PRUEBA-${id}',contrasena_hash,id_estado,false,false,false,'DECLARADA_NO_VERIFICADA','FICTICIA_NO_VERIFICADA' from abogados_registrados where id_abogado=961002; insert into abogado_especialidades values(${id},'Derecho Laboral');insert into operativa.cuenta_prueba(id_abogado,contexto) values(${id},gen_random_uuid());commit;`)
 creado=true
})
test.afterAll(()=>{
 if(!creado)return
 const r=JSON.parse(sql(`select row_to_json(p) from (select contexto,encode(dni_cifrado,'hex') dni,encode(telefono_cifrado,'hex') telefono from operativa.cuenta_prueba where id_abogado=${id}) p`))
 for(const [campo,esperado] of [['dni','99000991'],['telefono','5493510000007']]){if(r[campo]){const b=Buffer.from(r[campo],'hex'),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAAD(Buffer.from(r.contexto+':'+campo));d.setAuthTag(b.subarray(-16));if(Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString()!==esperado)throw new Error('No eliminar datos distintos de los sintéticos.')}}
 sql(`begin;do $$ begin if not exists(select 1 from abogados_registrados where id_abogado=${id} and mail='checkbox.prueba@abogacia.local' and nro_matricula='PRUEBA-${id}') then raise exception 'No limpiar una cuenta distinta';end if;end $$;delete from whatsapp_autorizacion where id_abogado=${id};delete from operativa.cuenta_prueba where id_abogado=${id};delete from abogado_especialidades where id_abogado=${id};delete from abogados_registrados where id_abogado=${id};commit;`)
})
async function login(page:Page,tipo:'Abogado'|'Ciudadano'){
 await page.goto('/iniciar-sesion');await page.getByRole('radio',{name:tipo,exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(tipo==='Abogado'?'checkbox.prueba@abogacia.local':'ciudadano.prueba@abogacia.local');await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click();await expect(page).toHaveURL(base+'/')
}
test('DNI cargado sin celular explica el bloqueo; guardado dedicado habilita, persiste y permite revocar sin Didit',async({page,browser})=>{
 await login(page,'Abogado');await page.getByRole('link',{name:'Mi perfil',exact:true}).click()
 await page.getByLabel('Mi DNI (7 u 8 dígitos)',{exact:true}).fill('99000991');await page.getByRole('button',{name:'Guardar DNI cifrado',exact:true}).click();await expect(page.getByText('DNI ingresado y cifrado.',{exact:false})).toBeVisible()
 const seccion=page.getByRole('region',{name:'Autorización de WhatsApp'}),checkbox=seccion.getByRole('checkbox',{name:'Recibir consultas por WhatsApp'})
 await expect(checkbox).toBeDisabled();await expect(seccion.getByText(/Guardá un celular argentino válido/)).toBeVisible()
 await seccion.getByLabel('Celular para WhatsApp').fill('0351 15 0000000');await seccion.getByRole('button',{name:'Guardar celular de WhatsApp',exact:true}).click();await expect(seccion.getByRole('alert')).toBeVisible();await expect(checkbox).toBeDisabled()
 await seccion.getByLabel('Celular para WhatsApp').fill('+54 9 351 0000007');await expect(checkbox).toBeDisabled();await seccion.getByRole('button',{name:'Guardar celular de WhatsApp',exact:true}).click()
 await expect(seccion.getByRole('status')).toContainText('Celular guardado correctamente');await expect(checkbox).toBeEnabled();await checkbox.check();await expect(seccion.getByRole('status')).toContainText('Preferencia guardada')
 await page.reload();await expect(checkbox).toBeChecked();await expect(seccion.getByLabel('Celular para WhatsApp')).toHaveValue('5493510000007')
 await page.locator('nav').getByRole('button',{name:/AUTOTEST/}).click();await page.getByRole('menuitem',{name:'Cerrar sesión'}).click();await login(page,'Abogado');await page.getByRole('link',{name:'Mi perfil',exact:true}).click();await expect(checkbox).toBeChecked()
 const token=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('abogacia.sesion')!).token)
 const r=await page.request.get('/api/abogados/me',{headers:{Authorization:'Bearer '+token}}),p=await r.json();expect(p.verificacionDni).toBe('DECLARADA_NO_VERIFICADA');expect(p.validacionMatricula).toBe('FICTICIA_NO_VERIFICADA')
 expect((await page.request.put('/api/abogados/me/whatsapp/telefono',{headers:{Authorization:'Bearer '+token},data:{telefono:'+5493510000007',idAbogado:961001}})).status()).toBe(400)
 const context=await browser.newContext({baseURL:base}),ciudadano=await context.newPage();await login(ciudadano,'Ciudadano')
 const tarjeta=ciudadano.locator('#abogados article').filter({has:ciudadano.getByRole('heading',{name:'AUTOTEST WhatsApp',exact:true})});await tarjeta.getByRole('button',{name:'Contactar',exact:true}).click()
 let destino='';await context.route('https://wa.me/**',route=>{destino=route.request().url();return route.fulfill({contentType:'text/html; charset=utf-8',body:'WhatsApp sintético interceptado'})})
 async function contactar(form:ReturnType<Page['getByRole']>){await form.getByLabel('Nombre del ciudadano').fill('Ciudadano sintético');await form.getByLabel('Número de contacto del ciudadano').fill('+5493510000009');await form.getByLabel('Resumen editable de la consulta').fill('Consulta técnica laboral.');await form.getByRole('checkbox').check();const pop=ciudadano.waitForEvent('popup');await form.getByRole('button',{name:'Abrir WhatsApp',exact:true}).click();const popup=await pop;await expect(popup.getByText('WhatsApp sintético interceptado')).toBeVisible();await popup.close();expect(new URL(destino).pathname).toBe('/5493510000007');expect(decodeURIComponent(destino)).not.toContain('99000991')}
 await contactar(tarjeta.getByRole('form',{name:'Formulario de contacto'}))
 await ciudadano.route('**/api/lexi/orientacion',route=>route.fulfill({json:{orientacion:'Orientación laboral sintética.'}}));await ciudadano.locator('#inicio').getByRole('button',{name:'Consultar a Lexi',exact:true}).click();const chat=ciudadano.getByRole('region',{name:'Chat con Lexi'});await chat.getByLabel('Escribí tu consulta').fill('Me despidieron sin causa.');await chat.getByRole('button',{name:'Enviar consulta'}).click();await chat.getByRole('button',{name:'Sí, ver abogados'}).click();const recomendada=chat.locator('article').filter({has:ciudadano.getByRole('heading',{name:'AUTOTEST WhatsApp',exact:true})});await recomendada.getByRole('button',{name:'Contactar',exact:true}).click();await contactar(recomendada.getByRole('form',{name:'Formulario de contacto'}))
 await checkbox.uncheck();await expect(seccion.getByRole('status')).toContainText('desactivado');await page.reload();await expect(checkbox).not.toBeChecked()
 await ciudadano.reload();await expect(ciudadano.locator('#abogados article').filter({has:ciudadano.getByRole('heading',{name:'AUTOTEST WhatsApp',exact:true})}).getByText('Contacto no disponible',{exact:true})).toBeVisible();await context.close()
})
