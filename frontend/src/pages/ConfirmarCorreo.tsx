import {useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {confirmarRegistro} from '../services/ciudadanoService'
import {confirmarAbogado} from '../services/abogadoService'
import {reenviarConfirmacion} from '../services/correoService.js'
export default function ConfirmarCorreo(){
 const [params]=useSearchParams();const tipo=params.get('cuenta')==='ABOGADO'?'ABOGADO':'CIUDADANO'
 const [mail,setMail]=useState(''),[codigo,setCodigo]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 async function enviar(e:React.FormEvent,resend=false){e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');try{
  const email=mail.trim().toLowerCase();if(resend)setMessage(await reenviarConfirmacion(tipo,email));else{if(tipo==='ABOGADO')await confirmarAbogado(email,codigo.trim());else await confirmarRegistro(codigo.trim());setCodigo('');setMessage('Correo confirmado. Iniciá sesión; los demás requisitos de tu cuenta se conservan.')}
 }catch(e){setError(e instanceof Error?e.message:'No se pudo confirmar el correo.')}finally{setBusy(false)}}
 return <main className="product-page max-w-xl"><h1>Confirmar mi nuevo correo</h1><p>Cuenta {tipo}. La nueva dirección queda pendiente hasta ingresar el código recibido. La identidad y matrícula se verifican por separado.</p>
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <form className="card p-5 space-y-4" onSubmit={e=>void enviar(e)}><label>Nuevo correo<input className="field" type="email" required value={mail} onChange={e=>setMail(e.target.value)}/></label><label>Código de confirmación<input className="field" required maxLength={43} value={codigo} onChange={e=>setCodigo(e.target.value)} autoComplete="one-time-code"/></label><button className="btn btn-primary" disabled={busy}>Confirmar correo</button><button type="button" className="link" disabled={busy||!mail} onClick={e=>void enviar(e,true)}>Reenviar código</button></form><Link to="/iniciar-sesion">Volver a iniciar sesión</Link></main>
}
