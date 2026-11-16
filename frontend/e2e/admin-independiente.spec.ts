import { test, expect } from '@playwright/test'

test('sin sesión solicita login ADMIN sin consultar catálogo ni Lexi', async ({page}) => {
  const apis:string[]=[]
  await page.route('**/api/**', r => { apis.push(r.request().url()); return r.abort() })
  await page.goto('/admin')
  await expect(page.getByRole('heading', {name:'Acceso de administrador'})).toBeVisible()
  expect(apis).toEqual([])
})
test('rol ciudadano no accede a administración', async ({page}) => {
  await page.addInitScript(() => sessionStorage.setItem('abogacia.sesion', JSON.stringify({rol:'CIUDADANO',token:'synthetic',expiresAt:Date.now()+60000})))
  await page.goto('/admin')
  await expect(page.getByRole('alert')).toContainText('Acceso exclusivo para administradores')
})
test('ADMIN reutiliza panel y servicios habituales; cerrar sesión revoca acceso', async ({page}) => {
  const apis:string[]=[]
  await page.addInitScript(() => sessionStorage.setItem('abogacia.sesion', JSON.stringify({rol:'ADMIN',token:'synthetic',expiresAt:Date.now()+60000})))
  await page.route('**/api/**', r => {
    apis.push(new URL(r.request().url()).pathname)
    return r.fulfill({json:{total:0,porEstado:[],consultadoEn:'2026-11-15T00:00:00Z'}})
  })
  await page.goto('/admin')
  await expect(page.getByRole('heading', {name:'Administración',exact:true})).toBeVisible()
  await expect(page.getByText('0 cuentas en total')).toHaveCount(2)
  expect(apis.every(p=>p.startsWith('/api/admin/'))).toBe(true)
  await page.getByRole('button',{name:'Cerrar sesión'}).click()
  await expect(page.getByRole('heading', {name:'Acceso de administrador'})).toBeVisible()
})
test('principal entrega enlace separado sin transferir token ni consultas', async ({page}) => {
  await page.goto('http://127.0.0.1:5204/admin/abogados?token=no-transferir')
  await expect(page.getByRole('link',{name:'Abrir administración'})).toHaveAttribute('href','http://localhost:5174/admin/abogados')
  await expect(page.getByRole('heading',{name:'Administración independiente'})).toBeVisible()
})
