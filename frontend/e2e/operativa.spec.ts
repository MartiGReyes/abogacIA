import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createDecipheriv } from 'node:crypto'
const base='http://127.0.0.1:5182',root=new URL('../../',import.meta.url)
const password=readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt',import.meta.url),'utf8').trim()
const env=readFileSync(new URL('../../docker/contacto-operativo-test/.env',import.meta.url),'utf8')
const key=Buffer.from(readFileSync(env.match(/^OP_KEY_PATH=(.+)$/m)![1].trim(),'utf8').trim(),'base64')
const docker=['compose','--env-file','docker/contacto-operativo-test/.env','-f','docker-compose.contacto-operativo-test.yml','exec','-T','postgres-operativa','psql','-X','-v','ON_ERROR_STOP=1','-U','operativa_owner','-d','contacto_operativo_test']
const sql=(q:string)=>execFileSync('docker',[...docker,'-tAc',q],{cwd:root,encoding:'utf8'}).trim()
function descifrar(hex:string,contexto:string,campo:string){const b=Buffer.from(hex,'hex'),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAAD(Buffer.from(contexto+':'+campo));d.setAuthTag(b.subarray(-16));return Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString()}
let preparado=false
test.beforeEach(()=>{preparado=false;expect(sql('select count(*) from operativa.cuenta_prueba where dni_cifrado is not null or telefono_cifrado is not null'),'No ejecutar sobre datos personales ingresados').toBe('0');preparado=true})
test.afterEach(()=>{
 if(!preparado)return
 const rows=JSON.parse(sql("select coalesce(json_agg(p),'[]') from (select id_abogado,contexto,encode(dni_cifrado,'hex') dni,encode(telefono_cifrado,'hex') telefono from operativa.cuenta_prueba where id_abogado in(961001,961002)) p"))
 for(const r of rows){const dni=r.dni?descifrar(r.dni,r.contexto,'dni'):'',tel=r.telefono?descifrar(r.telefono,r.contexto,'telefono'):'';if((!dni||dni==='99000111')&&(!tel||tel==='5493510000000'))sql(`update operativa.cuenta_prueba set dni_cifrado=null,telefono_cifrado=null where id_abogado=${Number(r.id_abogado)};update whatsapp_autorizacion set permitido=false where id_abogado=${Number(r.id_abogado)};update abogados_registrados set nro_celular=null where id_abogado=${Number(r.id_abogado)} and nro_matricula like 'PRUEBA-%';`);else throw new Error('No se limpian datos distintos de los sintéticos.')}
})
async function login(page:Page,rol:'ABOGADO'|'CIUDADANO',otro=false){
 await page.goto('/iniciar-sesion');await page.getByRole('radio',{name:rol==='ABOGADO'?'Abogado':'Ciudadano',exact:true}).click()
 await page.getByLabel('Email',{exact:true}).fill(rol==='CIUDADANO'?'ciudadano.prueba@abogacia.local':otro?'abogado.otro@abogacia.local':'abogado.prueba@abogacia.local')
 await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click();await expect(page).toHaveURL(base+'/')
 if(rol==='ABOGADO')await expect(page.getByRole('link',{name:'Mi perfil',exact:true})).toBeVisible()
 else { await expect(page.getByRole('heading',{name:'Abogados disponibles'})).toBeVisible(); await expect(page.locator('nav').getByRole('button',{name:/Ciudadano/})).toBeVisible() }
}
async function salir(page:Page){await page.locator('nav').getByRole('button',{name:/Abogado de prueba/}).click();await page.getByRole('menuitem',{name:'Cerrar sesión'}).click()}
async function registrarDesdePerfil(page:Page){
 await login(page,'ABOGADO');await page.getByRole('link',{name:'Mi perfil',exact:true}).click()
 await page.getByLabel('Mi DNI (7 u 8 dígitos)',{exact:true}).fill('99000111');await page.getByRole('button',{name:'Guardar DNI cifrado',exact:true}).click()
 await expect(page.getByText('DNI ingresado y cifrado. No se vuelve a mostrar completo.',{exact:false})).toBeVisible()
 await page.getByRole('button',{name:'Editar',exact:true}).click();await page.getByLabel('Celular / WhatsApp',{exact:true}).fill('+5493510000000');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click()
 await expect(page.getByRole('button',{name:'Editar',exact:true})).toBeVisible()
 await page.getByRole('checkbox',{name:'Recibir consultas por WhatsApp',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Recibir consultas por WhatsApp',exact:true})).toBeChecked()
}
async function completar(page:Page,form:ReturnType<Page['getByRole']>){
 await expect(form).toHaveAttribute('data-componente','FormularioContacto')
 await form.getByLabel('Nombre del ciudadano',{exact:true}).fill('Ciudadano sintético');await form.getByLabel('Número de contacto del ciudadano',{exact:true}).fill('+5493510000009');await form.getByLabel('Resumen editable de la consulta',{exact:true}).fill('Consulta técnica sintética sin datos sensibles.')
 await expect(form.getByRole('button',{name:'Abrir WhatsApp',exact:true})).toBeDisabled();await form.getByRole('checkbox').check()
 let destino='';await page.context().route('https://wa.me/**',r=>{destino=r.request().url();return r.fulfill({body:'<p>WhatsApp interceptado sin envio.</p>',contentType:'text/html'})})
 const pop=page.waitForEvent('popup');await form.getByRole('button',{name:'Abrir WhatsApp',exact:true}).click();const popup=await pop;await expect(popup.getByText('WhatsApp interceptado sin envio.')).toBeVisible();await popup.close()
 const url=new URL(destino);expect(url.pathname).toBe('/5493510000000');expect(url.searchParams.get('text')).toContain('Hola, Abogado de prueba 1.');expect(url.searchParams.get('text')).not.toMatch(/99000111|PRUEBA-|Didit/)
 await form.getByLabel('Resumen editable de la consulta').fill('Mensaje modificado.');await expect(form.getByRole('checkbox')).not.toBeChecked();await expect(form.getByRole('button',{name:'Abrir WhatsApp',exact:true})).toBeDisabled()
}
test('login ABOGADO abre su dashboard y Mi perfil persiste WhatsApp al cerrar sesión y reingresar',async({page})=>{
 await registrarDesdePerfil(page);await expect(page.getByRole('heading',{name:'Cuenta de prueba — matrícula no verificada'})).toBeVisible();await salir(page);await login(page,'ABOGADO');await page.getByRole('link',{name:'Mi perfil',exact:true}).click()
 await expect(page.getByRole('checkbox',{name:'Recibir consultas por WhatsApp'})).toBeChecked();await expect(page.getByText('5493510000000',{exact:true})).toBeVisible()
 await page.getByRole('checkbox',{name:'Recibir consultas por WhatsApp'}).click();await expect(page.getByRole('checkbox',{name:'Recibir consultas por WhatsApp'})).not.toBeChecked()
})
test('CIUDADANO contacta directamente desde el catálogo, con el mismo formulario responsive',async({page})=>{
 await registrarDesdePerfil(page);await salir(page);await login(page,'CIUDADANO')
 const tarjeta=page.locator('#abogados article').filter({has:page.getByRole('heading',{name:'Abogado de prueba 1',exact:true})});await tarjeta.getByRole('button',{name:'Contactar',exact:true}).click();await expect(page.getByRole('region',{name:'Chat con Lexi'})).toHaveCount(0)
 await completar(page,tarjeta.getByRole('form',{name:'Formulario de contacto'}))
 for(const width of [360,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'test-results/whatsapp-cuentas-catalogo.png',fullPage:true})
})
test('CIUDADANO contacta desde Lexi habitual al mismo abogado mediante FormularioContacto',async({page})=>{
 await registrarDesdePerfil(page);await salir(page);await login(page,'CIUDADANO');await page.route('**/api/lexi/orientacion',r=>r.fulfill({json:{orientacion:'Orientación sintética para una consulta laboral.'}}))
 await page.locator('#inicio').getByRole('button',{name:'Consultar a Lexi',exact:true}).click();const chat=page.getByRole('region',{name:'Chat con Lexi'});await chat.getByLabel('Escribí tu consulta').fill('Me despidieron sin causa. Consulta sintética.');await chat.getByRole('button',{name:'Enviar consulta'}).click();await chat.getByRole('button',{name:'Sí, ver abogados'}).click()
 const tarjeta=chat.locator('article').filter({has:page.getByRole('heading',{name:'Abogado de prueba 1',exact:true})});await tarjeta.getByRole('button',{name:'Contactar',exact:true}).click();await completar(page,tarjeta.getByRole('form',{name:'Formulario de contacto'}))
})
test('otro ABOGADO ve únicamente su perfil, sin heredar DNI, WhatsApp o permiso del primero',async({page,browser})=>{
 await registrarDesdePerfil(page);const context=await browser.newContext({baseURL:base});const otra=await context.newPage();await login(otra,'ABOGADO',true);await otra.getByRole('link',{name:'Mi perfil',exact:true}).click()
 await expect(otra.getByRole('heading',{name:'Abogado de prueba 2',exact:true})).toBeVisible();await expect(otra.getByRole('checkbox',{name:'Recibir consultas por WhatsApp'})).not.toBeChecked();await expect(otra.getByText('5493510000000',{exact:true})).toHaveCount(0);await context.close()
})
test('Home muestra catálogo sin login pero protege los formularios de contacto',async({page})=>{
 await page.goto('/');await expect(page.getByText(/Desarrollo local|organizador|invitaci.n|participante|campa.a/i)).toHaveCount(0);await expect(page.getByRole('heading',{name:'Abogado de prueba 1',exact:true})).toBeVisible();await expect(page.getByRole('form',{name:'Formulario de contacto'})).toHaveCount(0)
 await page.goto('/prueba-operativa');await expect(page).toHaveURL(base+'/');await page.goto('/mis-datos');await expect(page).toHaveURL(base+'/iniciar-sesion')
})
