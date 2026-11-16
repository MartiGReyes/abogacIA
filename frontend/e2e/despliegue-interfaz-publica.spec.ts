import {test,expect} from '@playwright/test'
import fs from 'node:fs'
test('frontend habitual público y Lexi sin cuentas',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route(url=>url.origin!=='http://127.0.0.1:5173',r=>r.abort())
 await page.route('**/api/**',route=>{
  const request=route.request(),p=new URL(request.url()).pathname
  if(new URL(request.url()).origin!=='http://127.0.0.1:5173')throw Error('API fuera del origen habitual')
  if(request.method()!=='GET'&&!(request.method()==='POST'&&p==='/api/lexi/orientacion'))throw Error('Escritura no autorizada')
  return route.continue()
 })
 const initial=await page.goto('/');expect(initial?.status()).toBe(200)
 expect((await page.request.get('/api/abogados/catalogo')).status()).toBe(200)
 expect((await page.request.get('/api/abogados/recomendaciones?especialidad=Derecho%20Laboral')).status()).toBe(200)
 await page.goto('/admin');await expect(page).toHaveURL(/\/admin\/iniciar-sesion$/)
 await page.goto('/panel/estadisticas');await expect(page).toHaveURL(/\/iniciar-sesion$/)
 await page.goto('/');await page.getByRole('button',{name:'Consultar a Lexi',exact:true}).first().click()
 await expect(page.getByLabel('Tu consulta para Lexi')).toBeVisible()
 const cases=[]
 if(info.project.name==='escritorio'){
  for(const [query,state,show,text] of [
   ['Me despidieron sin causa','RESPONDIDA',true,null],
   ['Quiero divorciarme','FUERA_DE_ALCANCE',false,'No puedo responder esa consulta'],
  ] as const){
   await page.getByLabel('Tu consulta para Lexi').fill(query)
   const received=page.waitForResponse(r=>r.url().endsWith('/api/lexi/orientacion'),{timeout:80000})
   await page.getByRole('button',{name:'Enviar mensaje a Lexi'}).click()
   const response=await received;expect(response.status()).toBe(200);const data=await response.json()
   expect(data.estado).toBe(state);expect(data.mostrarAbogados).toBe(show)
   if(text)expect(data.orientacion).toBe(text)
   await expect(page.getByRole('button',{name:'Sí, ver abogados',exact:true})).toHaveCount(show?1:0)
   cases.push({query,estado:data.estado,mostrarAbogados:data.mostrarAbogados,ok:true})
  }
  await expect(page.locator('.recommendation')).toHaveCount(0)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:`../../.private-despliegue-interfaz-20261115/publico-real-${info.project.name}.png`})
 expect(errors).toEqual([])
 fs.writeFileSync(`../../.private-despliegue-interfaz-20261115/publico-real-${info.project.name}.json`,JSON.stringify({catalogHttp:200,recommendationsHttp:200,adminAnonymousRedirect:true,lawyerAnonymousRedirect:true,queries:cases,pageErrors:errors,authenticatedLogin:false},null,2))
})
