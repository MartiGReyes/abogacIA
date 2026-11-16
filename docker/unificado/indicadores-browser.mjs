import { chromium, expect } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const base='http://localhost:5173',nombre='Ciudadano sintético E2E US19-27';
const password=readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt',import.meta.url),'utf8').trim();
const ids=[],errors=[];const browser=await chromium.launch({headless:true});
async function api(path,token,body,method=body?'POST':'GET'){
 for(let attempt=0;attempt<12;attempt++){
 const r=await fetch(base+path,{method,headers:{Origin:base,...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 if(path==='/api/auth/login'&&r.status===503&&attempt<11){await new Promise(resolve=>setTimeout(resolve,1500));continue;}
 if(!r.ok)throw Error(`Preparación visual HTTP ${r.status}`);return r.json();
 }
}
try{
 const citizen=await api('/api/auth/login',null,{mail:'ciudadano.prueba@abogacia.local',tipoCuenta:'CIUDADANO',contrasena:password});
 const lawyer=await api('/api/auth/login',null,{mail:'abogado.prueba@abogacia.local',tipoCuenta:'ABOGADO',contrasena:password});
 for(let n=1;n<=2;n++){
  const r=await api('/api/abogados/contacto/whatsapp',citizen.token,{abogado:{tipo:'PROFESIONAL',id:'961001'},nombre,telefono:'+5493510000009',resumen:`Prueba visual de ingresos US19-27 caso ${n}.`,mensajeConfirmado:'Mensaje sintético de indicadores.',consentimiento:true,avisoVersion:'contacto-whatsapp-v1',areaJuridica:'Derecho Laboral'});ids.push(r.idSolicitud);
  await api(`/api/abogados/me/contactos/${r.idSolicitud}/estado`,lawyer.token,{estado:'EN_CURSO',estadoActual:'PENDIENTE'},'PATCH');
  await api(`/api/abogados/me/contactos/${r.idSolicitud}/estado`,lawyer.token,{estado:'FINALIZADA',estadoActual:'EN_CURSO'},'PATCH');
 }
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/iniciar-sesion');await page.getByRole('radio',{name:'Soy abogado',exact:true}).click();await page.locator('#email').fill('abogado.prueba@abogacia.local');await page.locator('#password').fill(password);await page.locator('button[type=submit]').click();await page.waitForURL('**/panel');
 await page.goto(base+'/panel/estadisticas');await expect(page.getByRole('heading',{name:'Solicitudes recibidas',exact:true})).toBeVisible();
 let card=page.locator('article.contact-card').filter({hasText:'Prueba visual de ingresos US19-27 caso 1.'});
 await expect(card.getByText('Sin ingreso registrado',{exact:true})).toBeVisible();await card.getByRole('button',{name:'Registrar ingreso',exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByLabel('Importe en pesos argentinos').fill('0');await dialog.getByLabel('Fecha del ingreso').fill('2001-02-01');await dialog.getByRole('button',{name:'Registrar ingreso',exact:true}).click();await expect(dialog.getByRole('status').filter({hasText:'Ingreso guardado correctamente'})).toContainText('Ingreso guardado correctamente');await dialog.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
 await card.getByRole('button',{name:'Editar ingreso',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Importe en pesos argentinos').fill('1234,56');await dialog.getByRole('button',{name:'Guardar corrección del ingreso'}).click();await expect(dialog.getByRole('status').filter({hasText:'Ingreso guardado correctamente'})).toContainText('Ingreso guardado correctamente');await dialog.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
 await expect(card).toContainText('1.234,56');
 await expect(page.locator('article.contact-card').filter({hasText:'Prueba visual de ingresos US19-27 caso 2.'})).toContainText('Sin ingreso registrado');
 await page.getByLabel('Mes y año de ingresos mensuales').fill('2001-02');
 const mensual=page.locator('section.kpi').filter({has:page.getByRole('heading',{name:'Ingreso mensual',exact:true})});await expect(mensual).toContainText('1.234,56');
 await page.getByLabel('Período de consultas e ingresos').selectOption('Personalizado');await page.getByLabel('Fecha inicial').fill('2001-02-01');await page.getByLabel('Fecha final').fill('2001-02-28');
 const rango=page.locator('section.kpi').filter({has:page.getByRole('heading',{name:'Ingreso del período',exact:true})});await expect(rango).toContainText('1.234,56');
 await expect(page.getByRole('group',{name:'Ingresos registrados en pesos argentinos por período'})).toBeVisible();
  await expect(page.getByRole('group',{name:'Ingresos registrados en pesos argentinos por período'}).getByText('Sin registros',{exact:true}).first()).toBeVisible();
 await page.screenshot({path:'.codex-tmp/us19-27-estadisticas.png',fullPage:true});
 await page.getByLabel('Fecha inicial').fill('2001-03-01');await expect(page.getByRole('alert')).toContainText('intervalo válido');await expect(page.getByRole('heading',{name:'Ingreso del período',exact:true})).not.toBeVisible();
 if(errors.length)throw Error(errors.join('; '));console.log('Navegador: indicadores, registro cero, corrección decimal, mes, período, gráfico y fechas inválidas OK. Sin errores JavaScript.');
}finally{
 await browser.close();
 if(ids.length)execFileSync('docker',['compose','--env-file','docker/contacto-operativo-test/.env','-f','docker-compose.contacto-operativo-test.yml','exec','-T','postgres-operativa','psql','-v','ON_ERROR_STOP=1','-U','operativa_owner','-d','contacto_operativo_test','-c',`DELETE FROM contacto_whatsapp WHERE id IN (${ids.join(',')}) AND nombre='${nombre}'`],{cwd:new URL('../../',import.meta.url),stdio:'pipe'});
}
