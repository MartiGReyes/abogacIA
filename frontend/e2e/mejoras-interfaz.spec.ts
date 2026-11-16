import {test,expect,type Page} from '@playwright/test'
const lawyer={idAbogado:881001,nombre:'Profesional',apellido:'Sintético',mail:'profesional@example.invalid',especialidades:['Derecho Laboral'],contactoHabilitado:true,matriculaVerificada:true,identidadVerificada:true,perfilPrueba:false,cuentaPrueba:false,ubicacion:'Entorno de prueba',nroCelular:null}
const consulta='Me despidieron sin causa.'
const orientacion='Conservá la comunicación del despido para revisar tu situación laboral.'
const evidenceDir=process.env.MEJORAS_EVIDENCE_DIR??'../../.private-mejoras-interfaz-20261115'
async function fixtures(page:Page,rol='CIUDADANO'){
 const writes:{path:string;body:any}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(({rol})=>{
  if(rol)sessionStorage.setItem('abogacia.sesion',JSON.stringify({rol,token:'fixture.'+btoa(JSON.stringify({rol,exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic',expiresAt:Date.now()+3600000,idUsuario:'881101'}))
  ;(window as any).preparedUrl=''
  window.open=(()=>({opener:null,closed:false,close(){},location:{replace(url:string){(window as any).preparedUrl=url}}})) as any
 },{rol})
 const origin=new URL(String(test.info().project.use.baseURL??'http://127.0.0.1:5204')).origin
 await page.route(url=>url.origin!==origin,r=>r.abort())
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname
  const body=req.method()==='GET'?null:req.postDataJSON()
  if(req.method()!=='GET')writes.push({path:p,body})
  const json=(v:unknown)=>route.fulfill({json:v})
  if(p==='/api/lexi/orientacion')return json(body.chatInput.includes('divor')?{orientacion:'No puedo responder esa consulta',estado:'FUERA_DE_ALCANCE',mostrarAbogados:false}:{orientacion:body.chatInput===consulta?orientacion:'Orientación correspondiente a '+body.chatInput,estado:'RESPONDIDA',mostrarAbogados:true})
  if(p==='/api/ciudadanos/me')return json({idCiudadano:881101,nombre:'Ciudadano',apellido:'Sintético',mail:'ciudadano@example.invalid'})
  if(p==='/api/ciudadanos/me/consultas-lexi')return json([])
  if(p==='/api/abogados/me')return json(lawyer)
  if(['/api/abogados/catalogo','/api/abogados/recomendaciones'].includes(p))return json([lawyer])
  if(p.endsWith('/estadisticas'))return json({desde:url.searchParams.get('desde'),hasta:url.searchParams.get('hasta'),mes:url.searchParams.get('mes'),indicadores:{recibidas:1,pendientes:1,en_curso:0,finalizadas:0},areas:[{area:'Derecho Laboral',cantidad:1}],valoraciones:{cantidad:0,promedio:null},acumulado:{cantidad:0,total:null},mensual:{cantidad:0,total:null},periodo:{cantidad:0,total:null},consultas:[],ingresos:[],asesoramientos:[],granularidad:'diaria',consultadoEn:'2026-11-15T10:00:00Z'})
  if(p==='/api/abogados/contacto/whatsapp')return json({url:'https://wa.me/5493510000009?text='+encodeURIComponent(body.mensajeConfirmado),aviso:'Mensaje sintético; confirmá su envío en WhatsApp.'})
  if(p.endsWith('/valoracion'))return json({puntuacion:body.puntuacion,comentario:body.comentario})
  if(p.endsWith('/valoraciones'))return json({promedio:null,cantidad:0,valoraciones:[]})
  if(p==='/api/abogados/contactos/mios')return json([{id:881201,abogado:'Profesional Sintético',nombre:'Ciudadano Sintético',telefono:'+5493510000009',resumen:'Consulta sintética',estado:'PENDIENTE',creadoEn:'2026-11-15T10:00:00Z',actualizadoEn:'2026-11-15T10:00:00Z'}])
  if(p==='/api/abogados/contactos/mios/881201')return json({id:881201,abogado:'Profesional Sintético',nombre:'Ciudadano Sintético',telefono:'+5493510000009',resumen:'Consulta sintética',estado:'PENDIENTE',creadoEn:'2026-11-15T10:00:00Z',actualizadoEn:'2026-11-15T10:00:00Z',valoracion:null})
  if(p.startsWith('/api/admin/')){
   if(p.endsWith('/indicadores'))return json({total:1,porEstado:[{estado:'REGISTRADO',cantidad:1}],consultadoEn:'2026-11-15T10:00:00Z'})
   if(p.endsWith('/padron'))return json({matriculasAlmacenadas:1,filas:1,versiones:['Sintética']})
   if(p.endsWith('/identidad'))return json({id:881001,estadoCuenta:'REGISTRADO',estadoIdentidad:'SIN_RESULTADO',estadoSesion:'SIN_SESION',inicio:null,ultimaConsulta:null,consentimientoFecha:null})
   return json({contenido:[{id:881001,nombre:'Cuenta',apellido:'Sintética',estadoCuenta:'REGISTRADO',estadoIdentidad:'SIN_RESULTADO',estadoMatricula:'SIN_RESULTADO',matriculaVerificada:false,fechaRegistro:'2026-11-15'}],total:1,pagina:0,paginas:1,tamano:20})
  }
  if(p.includes('/casos')||p.endsWith('/contactos'))return json([])
  return route.fulfill({status:404,json:{error:'API no simulada: '+p}})
 })
 return {writes,errors}
}
async function ask(page:Page,text:string){await page.getByLabel('Tu consulta para Lexi').fill(text);await page.getByRole('button',{name:'Enviar mensaje a Lexi'}).click();await expect(page.locator('.typing-indicator')).toHaveCount(0)}
async function choose(page:Page){await page.getByRole('button',{name:'Sí, ver abogados',exact:true}).click();await page.locator('.recommendation').getByRole('button',{name:/^(Contactar|Consultar)$/}).click()}
const close=(page:Page)=>page.getByRole('dialog').last().getByRole('button',{name:'Cerrar ventana'}).click()
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}

test('Lexi: resúmenes actuales, rechazo y catálogo sin resumen obligatorio',async({page},info)=>{
 const f=await fixtures(page);await page.goto('/')
 await page.getByRole('button',{name:'Consultar a Lexi',exact:true}).first().click()
 await ask(page,consulta);await choose(page)
 await expect(page.getByLabel('A. Consulta del ciudadano')).toHaveValue(consulta)
 await expect(page.getByLabel('B. Orientación de Lexi')).toHaveValue(orientacion)
 await page.getByLabel('Teléfono de contacto').fill('+5493510000009')
 const dialog=page.getByRole('dialog').last(),send=dialog.getByRole('button',{name:'Abrir WhatsApp',exact:true})
 await expect(send).toBeDisabled();await dialog.getByRole('checkbox').check()
 await page.getByLabel('B. Orientación de Lexi').fill(orientacion+' Texto revisado.')
 await expect(dialog.getByRole('checkbox')).not.toBeChecked()
 const preview=await page.getByLabel('Mensaje para WhatsApp').inputValue()
 expect(preview).toContain('Consulta del ciudadano:\n'+consulta);expect(preview).toContain('Orientación de Lexi:\n'+orientacion)
 await noOverflow(page);await page.screenshot({path:`${evidenceDir}/contacto-${info.project.name}.png`})
 await page.locator('.lexi-contact-excerpts').screenshot({path:`${evidenceDir}/resumenes-${info.project.name}.png`})
 await close(page);await ask(page,'Necesito revisar mis vacaciones laborales.');await choose(page)
 await expect(page.getByLabel('A. Consulta del ciudadano')).toHaveValue('Necesito revisar mis vacaciones laborales.')
 await expect(page.getByLabel('B. Orientación de Lexi')).not.toHaveValue(orientacion)
 await close(page);await ask(page,'Quiero divorciarme')
 await expect(page.getByRole('button',{name:'Sí, ver abogados',exact:true})).toHaveCount(0)
 await expect(page.locator('.recommendation')).toHaveCount(0)
 await close(page);await page.getByRole('button',{name:/^(Contactar|Consultar)$/}).first().click()
 await expect(page.getByRole('textbox',{name:'Resumen de tu consulta',exact:true})).toBeVisible()
 await expect(page.getByLabel('A. Consulta del ciudadano')).toHaveCount(0)
 await expect(page.getByLabel('Mensaje para WhatsApp')).toHaveValue(/Resumen:\s*$/)
 expect(f.writes.filter(x=>x.path==='/api/abogados/contacto/whatsapp')).toHaveLength(0);expect(f.errors).toEqual([])
})

test('WhatsApp preparado contiene ambos apartados y requiere confirmación',async({page})=>{
 const f=await fixtures(page);await page.goto('/');await page.getByRole('button',{name:'Consultar a Lexi',exact:true}).first().click()
 await ask(page,consulta);await choose(page);await page.getByLabel('Teléfono de contacto').fill('+5493510000009')
 const dialog=page.getByRole('dialog').last();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Abrir WhatsApp',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Tu consulta está lista en WhatsApp'})).toBeVisible()
 const sent=f.writes.find(x=>x.path==='/api/abogados/contacto/whatsapp')!.body
 expect(sent.consentimiento).toBe(true);expect(sent.resumen).toContain(consulta);expect(sent.resumen).toContain(orientacion);expect(sent.resumen.length).toBeLessThanOrEqual(800)
 expect(sent.mensajeConfirmado).toContain('Consulta del ciudadano:');expect(sent.mensajeConfirmado).toContain('Orientación de Lexi:')
 expect(decodeURIComponent(await page.evaluate(()=>(window as any).preparedUrl))).toContain(sent.mensajeConfirmado)
 expect(f.errors).toEqual([])
})

test('Reportes conserva ruta y métricas',async({page},info)=>{
 const f=await fixtures(page,'ABOGADO');await page.goto('/panel/estadisticas')
 await expect(page.getByRole('heading',{name:'Reportes de mi actividad',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Reportes',exact:true}).last()).toHaveAttribute('aria-current','page')
 await expect(page.getByRole('heading',{name:'Consultas por área jurídica'})).toBeVisible();await expect(page.getByText('Filtros de reportes',{exact:true})).toBeVisible()
 await expect(page.getByText('Estadísticas',{exact:true})).toHaveCount(0)
 await noOverflow(page);await page.screenshot({path:`${evidenceDir}/reportes-${info.project.name}.png`});expect(f.errors).toEqual([])
})

test('Administración conserva navegación, filtros y acciones',async({page},info)=>{
 const f=await fixtures(page,'ADMIN');await page.goto('/admin')
 await expect(page.getByRole('heading',{name:'Administración',exact:true})).toBeVisible()
 const nav=page.getByRole('navigation',{name:'Administración',exact:true})
 await expect(nav.getByRole('link',{name:'Panel de control'})).toHaveAttribute('aria-current','page')
 await nav.getByRole('link',{name:'Abogados registrados'}).click();await expect(page.getByRole('table')).toBeVisible()
 const query=page.getByLabel('Nombre o apellido',{exact:true})
 await query.fill('Sintética')
 if(info.project.name==='celular')await query.press('Enter')
 else await page.getByRole('button',{name:'Buscar',exact:true}).click()
 await nav.getByRole('link',{name:'Gestionar usuarios'}).click();await expect(page.getByRole('button',{name:'Suspender cuenta'})).toBeVisible()
 await page.getByRole('button',{name:'Suspender cuenta'}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click()
 await nav.getByRole('link',{name:'Actualizar padrón'}).click();await expect(page.getByRole('heading',{name:/padrón/i}).last()).toBeVisible()
 await nav.getByRole('link',{name:'Verificación de identidad'}).click();await expect(page.getByRole('button',{name:'Buscar cuentas'})).toBeVisible()
 await noOverflow(page);await page.screenshot({path:`${evidenceDir}/admin-${info.project.name}.png`})
 expect(f.writes.filter(x=>x.path.startsWith('/api/admin/'))).toHaveLength(0);expect(f.errors).toEqual([])
})

test('Administración mantiene rechazo del rol ciudadano',async({page})=>{
 const f=await fixtures(page,'CIUDADANO');await page.goto('/admin');await expect(page.getByRole('alert')).toContainText('Acceso exclusivo para administradores.');expect(f.writes).toHaveLength(0)
})

test('Estrellas: vacío, hover, elección, teclado y toque',async({page,isMobile},info)=>{
 const f=await fixtures(page);await page.goto('/mis-consultas')
 await page.getByRole('button',{name:'Ver detalle y valorar',exact:true}).click()
 const stars=page.locator('.stars-input'),labels=stars.locator('label'),radios=stars.getByRole('radio')
 await expect(labels).toHaveCount(5);await expect(stars.locator('[data-filled="true"]')).toHaveCount(0)
 if(!isMobile){await labels.nth(2).hover();await expect(stars.locator('[data-filled="true"]')).toHaveCount(3);await labels.nth(3).click()}
 else await labels.nth(3).tap()
 await expect(radios.nth(3)).toBeChecked();await expect(stars.locator('[data-filled="true"]')).toHaveCount(4)
 await radios.nth(3).focus();await page.keyboard.press('ArrowLeft');await expect(radios.nth(2)).toBeChecked();await expect(stars.locator('[data-filled="true"]')).toHaveCount(3)
 if(isMobile)await labels.nth(4).tap();else await labels.nth(4).click()
 await expect(radios.nth(4)).toBeChecked();await noOverflow(page)
 await page.screenshot({path:`${evidenceDir}/estrellas-${info.project.name}.png`})
 await page.getByRole('button',{name:'Registrar valoración',exact:true}).click()
 await expect.poll(()=>f.writes.filter(x=>x.path.endsWith('/valoracion')).length).toBe(1)
 expect(f.writes.find(x=>x.path.endsWith('/valoracion'))!.body.puntuacion).toBe(5);expect(f.errors).toEqual([])
})
