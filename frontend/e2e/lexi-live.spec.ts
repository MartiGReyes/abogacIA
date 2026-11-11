import { test, expect } from '@playwright/test'

test('visitante consulta Lexi y ve recomendaciones con el workflow real, sin login ni mocks',async({page})=>{
 test.skip(process.env.LEXI_LIVE_TEST!=='true','Prueba optativa que invoca el workflow existente con una consulta sintética.')
 let listo=false;for(let n=0;n<90;n++){try{if((await fetch('http://127.0.0.1:5182/api/abogados/catalogo')).status===200){listo=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}expect(listo).toBe(true)
 await page.goto('/');await expect(page.locator('nav').getByRole('button',{name:'Iniciar sesión',exact:true})).toBeVisible()
 await page.locator('#inicio').getByRole('button',{name:'Consultar a Lexi',exact:true}).click()
 const chat=page.getByRole('region',{name:'Chat con Lexi'});await chat.getByLabel('Escribí tu consulta').fill('Me despidieron sin causa. Consulta técnica sintética de conectividad.')
 const inicio=Date.now(),respuesta=page.waitForResponse(r=>r.url().endsWith('/api/lexi/orientacion'),{timeout:70000});await chat.getByRole('button',{name:'Enviar consulta'}).click()
 const r=await respuesta;expect(r.status()).toBe(200);const body=await r.json();expect(typeof body.orientacion).toBe('string');expect(body.orientacion.trim().length>0).toBe(true)
 expect(r.request().headers().authorization).toBeUndefined()
 await chat.getByRole('button',{name:'Sí, ver abogados',exact:true}).click();await expect.poll(()=>chat.locator('article').count()).toBeGreaterThan(0)
 await expect(chat.getByRole('form',{name:'Formulario de contacto'})).toHaveCount(0)
 console.info(JSON.stringify({http:r.status(),duracionMs:Date.now()-inicio,orientacionLongitud:body.orientacion.length}))
})
