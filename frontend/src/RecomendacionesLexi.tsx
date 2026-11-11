import FormularioContacto, { type PerfilContacto } from './FormularioContacto'
export type Recomendacion = { estado: string; especialidad: string | null; abogados: PerfilContacto[]; error: string; consulta: string; orientacion: string }
export default function RecomendacionesLexi({ data, onDecidir }: { data: Recomendacion; onDecidir: (aceptar: boolean) => void }) {
  return <div className="mt-2 space-y-3 rounded-xl border border-line p-3 text-sm break-words min-w-0">
    {data.estado === 'oferta' && <><p>¿Querés ver abogados para consultar por tu caso?</p><div className="flex flex-wrap gap-2"><button className="btn btn-primary btn-sm" onClick={() => onDecidir(true)}>Sí, ver abogados</button><button className="btn btn-secondary btn-sm" onClick={() => onDecidir(false)}>No, gracias</button></div></>}
    {data.estado === 'rechazada' && <p>Podés seguir conversando con Lexi.</p>}
    {data.estado === 'cargando' && <p role="status">Buscando abogados disponibles…</p>}
    {data.estado === 'error' && <div role="alert"><p>{data.error}</p><button className="btn btn-secondary btn-sm" onClick={() => onDecidir(true)}>Reintentar búsqueda</button></div>}
    {data.estado === 'lista' && <>{data.especialidad && <p className="text-ink-2">Especialidad: {data.especialidad}</p>}{data.abogados.length === 0 && <p>No hay perfiles disponibles para esta consulta.</p>}
      {data.abogados.map(a => <article key={`${a.referencia.tipo}:${a.referencia.id}`} className="rounded-xl bg-navy-800 p-3 space-y-2 min-w-0">
        {a.perfilPrueba && <><p className="font-bold text-gold-400">Cuenta de prueba — matrícula no verificada</p><p className="text-xs text-ink-2">Identidad declarada; no verificada por Didit</p></>}
        <h3 className="font-semibold">{a.nombre} {a.apellido}</h3><p>{a.especialidades.join(' · ') || 'Especialidades no informadas'}</p>
        {!a.perfilPrueba && a.matriculaVerificada && <p className="text-sky-400">Matrícula verificada</p>}
        {a.descripcionProfesional && <p>{a.descripcionProfesional}</p>}
        <FormularioContacto key={`${a.referencia.tipo}:${a.referencia.id}`} abogado={a} consulta={data.consulta} />
      </article>)}
    </>}
  </div>
}
