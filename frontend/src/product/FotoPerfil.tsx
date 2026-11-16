import { useEffect, useState } from 'react'
import { obtenerSesion } from '../services/authService.js'
import { FOTO_CAMBIADA, obtenerFotoPropia, fotoPublicaUrl, guardarFoto, eliminarFoto } from '../services/fotoPerfilService.js'

function useFotoPropia(active: boolean) {
  const [source, setSource] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => { const refresh = () => { setSource(''); setRevision(v => v + 1) }; window.addEventListener(FOTO_CAMBIADA, refresh); window.addEventListener('sesion', refresh); return () => { window.removeEventListener(FOTO_CAMBIADA, refresh); window.removeEventListener('sesion', refresh) } }, [])
  useEffect(() => {
    if (!active || obtenerSesion()?.rol !== 'ABOGADO') return
    const abort = new AbortController(), token = obtenerSesion()?.token
    let url = ''
    obtenerFotoPropia(abort.signal).then((blob: Blob | null) => {
      if (!abort.signal.aborted && obtenerSesion()?.token === token && blob) { url = URL.createObjectURL(blob); setSource(url) }
    }).catch(() => { /* Initials remain available when the image service is unavailable. */ })
    return () => { abort.abort(); if (url) URL.revokeObjectURL(url) }
  }, [active, revision])
  return source
}

export function FotoPerfil({ initials, id, propia = false, className = 'initials-photo' }: { initials: string; id?: string | number; propia?: boolean; className?: string }) {
  const own = useFotoPropia(propia)
  const [revision, setRevision] = useState(0)
  useEffect(() => { const refresh = () => setRevision(v => v + 1); window.addEventListener(FOTO_CAMBIADA, refresh); return () => window.removeEventListener(FOTO_CAMBIADA, refresh) }, [])
  const publicUrl = id == null ? '' : fotoPublicaUrl(id)
  const src = propia ? own : publicUrl ? `${publicUrl}?v=${revision}` : ''
  const [failed, setFailed] = useState('')
  return <span className={`${className} profile-photo`} aria-hidden="true">{src && failed !== src ? <img key={src} src={src} alt="" onError={() => setFailed(src)} /> : initials}</span>
}

export function FotoPerfilEditor({ initials }: { initials: string }) {
  const current = useFotoPropia(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { if (!file) { setPreview(''); return }; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url) }, [file])
  useEffect(() => { const reset = () => { setFile(null); setError(''); setMessage('') }; window.addEventListener('sesion', reset); return () => window.removeEventListener('sesion', reset) }, [])
  async function save(remove: boolean) {
    setBusy(true); setError(''); setMessage('')
    try { if (remove) await eliminarFoto(); else if (file) await guardarFoto(file); setFile(null); setMessage(remove ? 'Foto eliminada. Se muestran tus iniciales.' : 'Foto de perfil guardada.') }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <section className="photo-editor" aria-label="Foto de perfil">
    <h2>Foto de perfil</h2>
    <p>Esta foto será pública. No acredita tu identidad ni tu habilitación profesional.</p>
    <div className="photo-editor-row">
      <span className="avatar-initials profile-photo photo-preview" aria-hidden="true">{preview || current ? <img src={preview || current} alt="" /> : initials}</span>
      <div>
        <label className="photo-file-label">Subir o cambiar foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => {
          const next = e.target.files?.[0]; e.target.value = ''; setError(''); setMessage(''); setFile(null)
          if (!next) return
          if (!['image/jpeg','image/png','image/webp'].includes(next.type) || next.size > 5 * 1024 * 1024) { setError('Usá JPEG, PNG o WebP de hasta 5 MB.'); return }; setFile(next)
        }} /></label>
        <p>JPEG, PNG o WebP · Hasta 5 MB y 16 megapíxeles.</p>
        {preview && <p>Vista previa: todavía no guardaste esta foto.</p>}
        <div className="action-row">
          <button type="button" className="ui-button" disabled={!file || busy} onClick={() => void save(false)}>Guardar foto</button>
          {file && <button type="button" className="ui-button" disabled={busy} onClick={() => setFile(null)}>Cancelar</button>}
          {current && <button type="button" className="ui-button" disabled={busy} onClick={() => void save(true)}>Eliminar foto</button>}
        </div>
      </div>
    </div>
    {busy && <p role="status">Guardando cambios…</p>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>
}
