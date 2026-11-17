import {test,expect} from '@playwright/test'
import fs from 'node:fs'
test('componentes desplegados: Lexi real, recomendaciones, rechazo y perfil público sin escrituras autenticadas',async({page})=>{
 const result:any={labor:null,divorcio:null,recomendaciones:null,gemini:'a través del workflow habitual',authenticated:false}
 try{
  await page.goto('/')
  await page.getByRole('button',{name:'Consultar a Lexi',exact:true}).first().click()
  const reply=page.waitForResponse(r=>r.url().endsWith('/api/lexi/orientacion')&&r.request().method()==='POST',{timeout:90000})
  await page.getByLabel('Tu consulta para Lexi').fill('Me despidieron sin causa')
  await page.getByRole('button',{name:'Enviar mensaje a Lexi'}).click()
  const response=await reply,body=await response.json()
  result.labor={http:response.status(),estado:body.estado,mostrarAbogados:body.mostrarAbogados,orientacionNoVacia:typeof body.orientacion==='string'&&body.orientacion.length>0}
  expect(response.status()).toBe(200);expect(body.estado).toBe('RESPONDIDA');expect(body.mostrarAbogados).toBe(true)
  const recommendations=page.waitForResponse(r=>r.url().includes('/api/abogados/recomendaciones'))
  await page.getByRole('button',{name:'Sí, ver abogados',exact:true}).click()
  const rec=await recommendations,rows=await rec.json();result.recomendaciones={http:rec.status(),cantidad:Array.isArray(rows)?rows.length:null}
  expect(rec.status()).toBe(200);expect(Array.isArray(rows)).toBe(true)
  const rejected=page.waitForResponse(r=>r.url().endsWith('/api/lexi/orientacion')&&r.request().method()==='POST')
  await page.getByLabel('Tu consulta para Lexi').fill('Quiero divorciarme');await page.getByRole('button',{name:'Enviar mensaje a Lexi'}).click()
  const r=await rejected,b=await r.json();result.divorcio={http:r.status(),...b}
  expect(b.estado).toBe('FUERA_DE_ALCANCE');expect(b.orientacion).toBe('Por ahora solo puedo orientarte en temas laborales (Ley de Contrato de Trabajo): despidos, indemnizaciones, sueldos, aguinaldo, vacaciones, jornada y licencias. Tu consulta es de otra materia, así que te conviene hablarlo directamente con un abogado');expect(b.mostrarAbogados).toBe(false)
  await expect(page.getByRole('button',{name:'Sí, ver abogados',exact:true})).toHaveCount(0)
  await page.getByRole('dialog').last().getByRole('button',{name:'Cerrar ventana'}).click()
  const cards=page.locator('.professional-card')
  if(await cards.count()){
   await cards.first().getByRole('button',{name:'Ver perfil',exact:true}).click();await expect(page.getByRole('dialog').last()).toBeVisible();result.perfilPublico=true
  }else result.perfilPublico='sin perfiles disponibles'
  await page.screenshot({path:'../integracion/segundo-despliegue-20261115/desplegado.png'})
 }finally{fs.writeFileSync('../integracion/segundo-despliegue-20261115/lexi-desplegado.json',JSON.stringify(result,null,2))}
})
