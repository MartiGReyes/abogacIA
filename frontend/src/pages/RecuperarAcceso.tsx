import { useState, useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { solicitarRecuperacion, confirmarRecuperacion } from '../services/recuperacionService.js'

export default function RecuperarAcceso() {
  const [params] = useSearchParams()
  const location = useLocation()
  const [tipo,setTipo]=useState(params.get('cuenta')==='ABOGADO'?'ABOGADO':'CIUDADANO')
  const [mail,setMail]=useState(''),[token,setToken]=useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  useEffect(() => {
    const incoming = new URLSearchParams(location.hash.slice(1)).get('token')
    if (!incoming) return
    setToken(incoming)
    setTipo(new URLSearchParams(location.search).get('cuenta') === 'ABOGADO' ? 'ABOGADO' : 'CIUDADANO')
    setPassword(''); setConfirm(''); setMessage(''); setError('')
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [location.hash, location.search])
  async function submit(e:React.FormEvent,final:boolean) {
    e.preventDefault(); if(busy)return
    if(final && password!==confirm){setError('Las contraseñas no coinciden.');return}
    setBusy(true);setError('');setMessage('')
    try { setMessage(final?await confirmarRecuperacion(tipo,token,password,confirm):await solicitarRecuperacion(tipo,mail));if(final){setToken('');setPassword('');setConfirm('')} }
    catch(e){setError(e instanceof Error?e.message:'No se pudo conectar. Reintentá.')}finally{setBusy(false)}
  }
  return <main className="product-page max-w-xl"><h1 className="text-3xl font-bold">Recuperar acceso</h1>
    <p>Cada cuenta tiene su propia contraseña. Esta operación corresponde solamente al tipo seleccionado.</p>
    <label>Tipo de cuenta<select className="field w-full" disabled={busy} value={tipo} onChange={e=>{setTipo(e.target.value);setToken('');setPassword('');setConfirm('');setMessage('');setError('')}}><option value="CIUDADANO">Ciudadano</option><option value="ABOGADO">Abogado</option></select></label>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <form className="card p-5 space-y-4 my-4" onSubmit={e=>void submit(e,false)}><h2>Solicitar instrucciones</h2>
      <label>Correo de esta cuenta<input className="field w-full" type="email" required maxLength={254} value={mail} onChange={e=>setMail(e.target.value)} autoComplete="email" /></label>
      <button className="btn btn-primary" disabled={busy}>Solicitar recuperación</button>
    </form>
    <form className="card p-5 space-y-4 my-4" onSubmit={e=>void submit(e,true)}><h2>Completar recuperación</h2>
      <label>Código de recuperación<input className="field w-full" required pattern="[A-Za-z0-9_-]{43}" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" /></label>
      <label>Nueva contraseña<input className="field w-full" required type="password" minLength={8} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></label>
      <label>Confirmar nueva contraseña<input className="field w-full" required type="password" maxLength={72} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" /></label>
      <button className="btn btn-primary" disabled={busy}>Guardar nueva contraseña</button>
    </form><Link className="link" to="/iniciar-sesion">Volver a iniciar sesión</Link>
  </main>
}
