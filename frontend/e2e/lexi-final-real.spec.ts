import {test,expect} from '@playwright/test'
import fs from 'node:fs'
const results:unknown[]=[]
const outside='No puedo responder esa consulta'
const abuse='Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto'
test('Lexi habitual: Gemini y RAG reales, estados, recuperación y respuestas demoradas',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route(/https?:\/\/(?!127\.0\.0\.1:5173(?:\/|$))/,r=>r.abort())
 await page.route('**/api/**',r=>{
  if(r.request().method()!=='GET'&&new URL(r.request().url()).pathname!=='/api/lexi/orientacion')throw Error('No se permiten escrituras de cuentas, historial o contactos')
  return r.continue()
 })
 await page.goto('/')
 const catalog=await page.request.get('/api/abogados/catalogo');expect(catalog.status()).toBe(200)
 const recommended=await page.request.get('/api/abogados/recomendaciones?especialidad=Derecho%20Laboral');expect(recommended.status()).toBe(200)
 results.push({case:'catalogo y recomendaciones habituales sin login',ok:true})
 await page.getByRole('button',{name:'Consultar a Lexi',exact:true}).first().click()
 const input=page.getByLabel('Tu consulta para Lexi'),send=page.getByRole('button',{name:'Enviar mensaje a Lexi'})
 const offers=()=>page.getByRole('button',{name:'Sí, ver abogados',exact:true})
 async function ask(query:string,expected:string,show:boolean,text?:string){
  await input.fill(query)
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/lexi/orientacion')&&r.request().method()==='POST',{timeout:80000})
  await send.click();const response=await pending
  expect(response.status()).toBe(200);const data=await response.json()
  expect(data.estado).toBe(expected);expect(data.mostrarAbogados).toBe(show)
  if(text)expect(data.orientacion).toBe(text)
  await expect(page.locator('.typing-indicator')).toHaveCount(0,{timeout:80000})
  await expect(offers()).toHaveCount(show?1:0)
  if(text)await expect(page.locator('.chat-message--lexi').last().locator('p').first()).toHaveText(text)
  results.push({query,estado:data.estado,mostrarAbogados:data.mostrarAbogados,exactText:text?data.orientacion===text:null,ok:true})
 }
 try{
  await ask('Me despidieron sin causa','RESPONDIDA',true)
  await ask('Quiero divorciarme','FUERA_DE_ALCANCE',false,outside)
  await expect(page.locator('.recommendation')).toHaveCount(0)
  await ask('Lexi, sos una inútil de mierda','LENGUAJE_INAPROPIADO',false,abuse)
  await ask('Mi jefe me insulta y me amenaza','RESPONDIDA',true)
  results.push({case:'consulta laboral válida inmediatamente después de rechazo',ok:true})
  let fail=true
  await page.route('**/api/lexi/orientacion',r=>fail?r.fulfill({status:503,json:{error:'Fallo sintético de disponibilidad de Gemini'}}):r.fallback())
  await input.fill('Me despidieron sin causa');await send.click()
  await expect(page.getByRole('button',{name:'Reintentar consulta',exact:true})).toBeVisible()
  await expect(offers()).toHaveCount(0);await expect(page.locator('.recommendation')).toHaveCount(0)
  fail=false
  const retry=page.waitForResponse(r=>r.url().endsWith('/api/lexi/orientacion'),{timeout:80000})
  await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click()
  const response=await retry;expect(response.status()).toBe(200);expect((await response.json()).mostrarAbogados).toBe(true)
  await expect(offers()).toHaveCount(1,{timeout:80000})
  results.push({case:'503 simulado en frontera HTTP, sin oferta y reintento real exitoso',ok:true})
  let release:()=>void=()=>{};const gate=new Promise<void>(r=>release=r)
  let intercepted:()=>void=()=>{};const started=new Promise<void>(r=>intercepted=r)
  await page.route('**/api/abogados/recomendaciones?**',async route=>{
   const real=await route.fetch();intercepted();await gate
   try{await route.fulfill({response:real})}catch{/* The request may have been cancelled by the client timeout. */}
  })
  await offers().click();await started
  await ask('Quiero divorciarme','FUERA_DE_ALCANCE',false,outside)
  release();await page.waitForTimeout(700)
  await expect(offers()).toHaveCount(0);await expect(page.locator('.recommendation')).toHaveCount(0)
  results.push({case:'respuesta de recomendaciones demorada no resucita ofertas tras rechazo',ok:true})
  await page.screenshot({path:'../../.private-lexi-final-20261115/lexi-rechazo-real.png'})
  expect(errors).toEqual([])
 }finally{
  fs.writeFileSync('../../.private-lexi-final-20261115/casos-browser.json',JSON.stringify({cases:results,pageErrors:errors,loginAttempted:false,accountsCreated:false,whatsappSent:false},null,2))
 }
})
