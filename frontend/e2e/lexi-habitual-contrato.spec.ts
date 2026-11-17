import {test,expect,type Page} from '@playwright/test'
const token=(rol:string)=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+600,rol,sub:'881001'})).toString('base64url')+'.fixture'
const row={idAbogado:881001,nombre:'Profesional',apellido:'Sintético',especialidades:['Derecho Laboral'],perfilPrueba:true,cuentaPrueba:true,contactoHabilitado:true,matriculaVerificada:false,identidadVerificada:false}
async function fixtures(page:Page){
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route(/https?:\/\/(?!127\.0\.0\.1:5202)/,r=>r.abort())
 await page.route('**/api/**',r=>{
  const p=new URL(r.request().url()).pathname
  if(p==='/api/auth/login'){const rol=r.request().postDataJSON().tipoCuenta;return r.fulfill({json:{token:token(rol),rol,idUsuario:'881001'}})}
  if(p==='/api/ciudadanos/me')return r.fulfill({json:{nombre:'Ciudadano',apellido:'Sintético',mail:'ciudadano@example.com'}})
  if(p==='/api/abogados/me')return r.fulfill({json:{...row,mail:'abogado@example.com',whatsappAutorizado:true}})
  if(['/api/abogados/catalogo','/api/abogados/recomendaciones'].includes(p))return r.fulfill({json:[row]})
  if(p.endsWith('/valoraciones'))return r.fulfill({json:{promedio:null,cantidad:0,valoraciones:[]}})
  if(p==='/api/abogados/contacto/whatsapp')throw Error('La prueba no debe enviar contactos')
  return r.fulfill({json:[]})
 })
 return errors
}
async function login(page:Page,role:'ciudadano'|'abogado'){
 await page.goto('/iniciar-sesion');await page.getByRole('radio',{name:role==='ciudadano'?'Soy ciudadano':'Soy abogado',exact:true}).click()
 await page.getByLabel('Email',{exact:true}).fill(role+'@example.com');await page.getByLabel('Contraseña',{exact:true}).fill('Solo-interfaz-sintetica')
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click()
}
test('estados, contrato inválido, 503, contacto y recuperación en el frontend principal',async({page})=>{
 const errors=await fixtures(page);await login(page,'ciudadano');await expect(page).toHaveURL('http://127.0.0.1:5202/')
 await page.getByRole('button',{name:'Consultar a Lexi',exact:true}).first().click()
 let fail=false
 await page.route('**/api/lexi/orientacion',r=>{
  if(fail)return r.fulfill({status:503,json:{error:'Fallo sintético'}})
  const t=r.request().postDataJSON().chatInput
  if(t==='Divorcio')return r.fulfill({json:{orientacion:'No usar',estado:'FUERA_DE_ALCANCE',mostrarAbogados:true}})
  if(t==='Insulto a Lexi')return r.fulfill({json:{orientacion:'No usar',estado:'LENGUAJE_INAPROPIADO',mostrarAbogados:true}})
  if(t==='Desconocida')return r.fulfill({json:{orientacion:'Sin clasificar',estado:'INCIERTA',mostrarAbogados:true}})
  if(t==='Inválida')return r.fulfill({json:{orientacion:null,estado:'RESPONDIDA',mostrarAbogados:true}})
  return r.fulfill({json:{orientacion:'Orientación laboral sintética',estado:'RESPONDIDA',mostrarAbogados:true}})
 })
 const input=page.getByLabel('Tu consulta para Lexi'),send=page.getByRole('button',{name:'Enviar mensaje a Lexi'})
 const offer=()=>page.getByRole('button',{name:'Sí, ver abogados',exact:true})
 async function ask(t:string){await input.fill(t);await send.click();await expect(page.locator('.typing-indicator')).toHaveCount(0)}
 await ask('Me despidieron sin causa');await offer().click();await expect(page.locator('.recommendation')).toHaveCount(1)
 await page.locator('.recommendation').getByRole('button',{name:'Consultar',exact:true}).click()
 const form=page.getByRole('dialog',{name:'Consultar a Profesional Sintético',exact:true});await expect(form).toBeVisible()
 await expect(form.getByRole('textbox',{name:'Resumen de tu consulta',exact:true})).toHaveValue('Me despidieron sin causa')
 await form.getByRole('button',{name:'Cerrar ventana',exact:true}).click()
 for(const [query,text] of [['Divorcio','Por ahora solo puedo orientarte en temas laborales (Ley de Contrato de Trabajo): despidos, indemnizaciones, sueldos, aguinaldo, vacaciones, jornada y licencias. Tu consulta es de otra materia, así que te conviene hablarlo directamente con un abogado'],['Insulto a Lexi','Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto']]){
  await ask(query);await expect(page.locator('.chat-message--lexi').last().locator('p').first()).toHaveText(text);await expect(offer()).toHaveCount(0);await expect(page.locator('.recommendation')).toHaveCount(0)
  await ask('Mi jefe me insultó y me amenazó con despedirme');await expect(offer()).toHaveCount(1)
 }
 await ask('Desconocida');await expect(offer()).toHaveCount(0)
 await ask('Inválida');await expect(offer()).toHaveCount(0);await expect(page.getByRole('button',{name:'Reintentar consulta',exact:true})).toBeVisible()
 fail=true;await ask('Me despidieron sin causa');await expect(offer()).toHaveCount(0)
 fail=false;const count=await page.locator('.chat-message--user').count();await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click()
 await expect(offer()).toHaveCount(1);await expect(page.locator('.chat-message--user')).toHaveCount(count)
 await page.screenshot({path:'test-results/lexi-habitual-contrato.png'})
 expect(errors).toEqual([])
})
test('login ABOGADO y dashboard existente conservan navegación y catálogo independiente',async({page})=>{
 const errors=await fixtures(page);await login(page,'abogado');await expect(page).toHaveURL(/\/panel$/)
 await expect(page.getByText('ESPACIO PROFESIONAL',{exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Solicitudes y asesoramientos recibidos',exact:true})).toBeVisible()
 await page.reload();await expect(page.getByText('ESPACIO PROFESIONAL',{exact:true})).toBeVisible()
 await expect(page.locator('.reviews-section')).toBeVisible()
 await page.screenshot({path:'test-results/lexi-dashboard-regresion.png'})
 expect(errors).toEqual([])
})
