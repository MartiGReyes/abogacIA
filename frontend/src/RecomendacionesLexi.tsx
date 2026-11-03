import ContactoPrueba from './ContactoPrueba'

type Abogado = {
  idAbogado: number; nombre: string; apellido: string; especialidades: string[];
  ubicacion?: string; provincia?: string; descripcionProfesional?: string;
  aniosExperiencia?: number; nroMatricula?: string; colegioProfesional?: string;
  mail?: string; nroCelular?: string; matriculaVerificada?: boolean; perfilPrueba: boolean;
}
export type Recomendacion = {
  estado: string; especialidad: string | null; abogados: Abogado[]; error: string;
  consulta: string; orientacion: string;
}

export default function RecomendacionesLexi({ data, onDecidir }: {
  data: Recomendacion; onDecidir: (aceptar: boolean) => void;
}) {
  return (
    <div className="mt-2 space-y-3 rounded-xl border border-line p-3 text-sm break-words">
      {data.estado === 'oferta' && <>
        <p>¿Querés que te recomendemos abogados registrados que puedan ayudarte con tu caso?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onDecidir(true)}>Sí, ver abogados</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onDecidir(false)}>No, gracias</button>
        </div>
      </>}
      {data.estado === 'rechazada' && <p>Elegiste «No, gracias». Podés seguir conversando con Lexi.</p>}
      {data.estado === 'cargando' && <p role="status">Buscando abogados disponibles…</p>}
      {data.estado === 'error' && <div role="alert">
        <p>{data.error}</p>
        <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => onDecidir(true)}>Reintentar búsqueda</button>
      </div>}
      {data.estado === 'lista' && <>
        <p className="text-ink-2">{data.especialidad ? `Especialidad: ${data.especialidad}.` : 'No pude identificar una única especialidad. Estos son los profesionales disponibles.'}</p>
        {data.abogados.length === 0 && <p>No encontramos abogados habilitados disponibles{data.especialidad ? ' para esta especialidad' : ''}. Podés seguir conversando o aclarar tu consulta.</p>}
        {data.abogados.map(a => <article key={a.idAbogado} className="rounded-xl bg-navy-800 p-3 space-y-2">
          {a.perfilPrueba && <p className="font-bold text-gold-400 border border-gold-500 rounded-lg p-2">PERFIL DE PRUEBA — NO ES UN ABOGADO REAL</p>}
          <h3 className="font-semibold">{a.nombre} {a.apellido}</h3>
          <p>{a.especialidades.length ? a.especialidades.join(' · ') : 'Especialidades no informadas'}</p>
          {(a.ubicacion || a.provincia) && <p className="text-ink-2">{[a.ubicacion, a.provincia].filter(Boolean).join(', ')}</p>}
          {a.descripcionProfesional && <p className="whitespace-pre-wrap">{a.descripcionProfesional}</p>}
          {a.aniosExperiencia != null && <p>{a.aniosExperiencia} años de experiencia</p>}
          {!a.perfilPrueba && a.matriculaVerificada && <>
            <p className="text-sky-400">Matrícula verificada</p>
            {a.nroMatricula && <p>Matrícula: {a.nroMatricula}</p>}
            {a.colegioProfesional && <p>{a.colegioProfesional}</p>}
          </>}
          {!a.perfilPrueba && <>
            {a.mail && <p>Correo: {a.mail}</p>}
            {a.nroCelular && <p>Teléfono: {a.nroCelular}</p>}
          </>}
          {a.perfilPrueba && <ContactoPrueba abogado={a} consulta={data.consulta} orientacion={data.orientacion} />}
        </article>)}
      </>}
    </div>
  )
}
