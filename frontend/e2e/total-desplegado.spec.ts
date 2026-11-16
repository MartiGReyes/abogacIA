import { test, expect } from '@playwright/test'
test('frontend desplegado y administración están separados y accesibles',async({page},info)=>{
  await page.goto('/admin')
  await expect(page.getByRole('heading',{name:'Administración independiente'})).toBeVisible()
  await expect(page.getByRole('link',{name:'Abrir administración'})).toHaveAttribute('href','http://localhost:5174/admin')
  await page.goto('http://127.0.0.1:5174/admin')
  await expect(page.getByRole('heading',{name:'Acceso de administrador'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:`../integracion/total/admin-real-${info.project.name}.png`})
  await page.goto('/iniciar-sesion')
  await expect(page.getByRole('heading',{name:'Iniciá sesión',exact:true})).toBeVisible()
})
test('APIs reales preservan catálogo y rechazan JWT ausente o inválido',async({request})=>{
  expect((await request.get('/api/abogados/catalogo')).status()).toBe(200)
  for(const origin of ['http://127.0.0.1:5173','http://127.0.0.1:5174']){
    for(const headers of [{},{Authorization:'Bearer synthetic.invalid.token'}]){
      expect((await request.get(`${origin}/api/admin/abogados/indicadores`,{headers})).status()).toBe(401)
    }
  }
  expect((await request.get('http://127.0.0.1:5174/api/lexi/orientacion')).status()).toBe(404)
})
