import { useState } from 'react'
import { Avatar, Icon, lexiImg, useEscape, type Page } from '../ui'
import { MOCK_HISTORY } from '../demoData'

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: HISTORY  (US5 — Consultar historial de consultas)
// ═══════════════════════════════════════════════════════════════════════════════

export default function HistoryPage({ navigate }: { navigate: (p: Page) => void }) {
  const [selected, setSelected] = useState<typeof MOCK_HISTORY[0] | null>(null)
  const [filter, setFilter] = useState('Todas')

  const tipos = ['Todas', ...Array.from(new Set(MOCK_HISTORY.map(h => h.tipo)))]
  const filtered = filter === 'Todas' ? MOCK_HISTORY : MOCK_HISTORY.filter(h => h.tipo === filter)

  useEscape(!!selected, () => setSelected(null))

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20 fade-up">
      <button onClick={() => navigate('profile')} className="text-sm text-ink-3 hover:text-ink flex items-center gap-1.5"><Icon name="back" className="w-4 h-4" />Mis datos</button>
      <h1 className="mt-4 text-[28px] sm:text-[32px] font-bold leading-tight">Historial de consultas</h1>
      <p className="text-ink-2 mt-1.5">Tus conversaciones con Lexi.</p>

      <dl className="mt-8 grid grid-cols-3 card divide-x divide-line">
        {[
          { label: 'Consultas', value: MOCK_HISTORY.length },
          { label: 'Este mes', value: 3 },
          { label: 'Especialidades', value: new Set(MOCK_HISTORY.map(h => h.tipo)).size },
        ].map(s => (
          <div key={s.label} className="px-4 sm:px-6 py-5">
            <dt className="text-[13px] text-ink-3">{s.label}</dt>
            <dd className="mt-1 text-[28px] font-bold tabular leading-none">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div role="group" aria-label="Filtrar por especialidad" className="mt-8 -mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar">
        {tipos.map(t => (
          <button key={t} onClick={() => setFilter(t)} aria-pressed={filter === t} className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-medium border transition-colors ${filter === t ? 'bg-ink text-navy-950 border-ink' : 'border-line-strong text-ink-2 hover:text-ink'}`}>{t}</button>
        ))}
      </div>

      <ul className="mt-5 card divide-y divide-line overflow-hidden">
        {filtered.map(h => (
          <li key={h.id}>
            <button onClick={() => setSelected(h)} className="w-full text-left px-5 sm:px-6 py-5 flex gap-4 hover:bg-white/[0.03] transition-colors">
              <Avatar src={lexiImg} className="w-9 h-9 mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-semibold">{h.consulta}</span>
                  <span className="text-[12px] text-ink-3 tabular whitespace-nowrap">{h.fecha} · {h.hora}</span>
                </span>
                <span className="block text-sm text-ink-2 mt-1 line-clamp-1">{h.respuesta}</span>
                <span className="inline-block mt-2.5 text-[12px] font-medium text-ink-2 border border-line-strong rounded-full px-2.5 py-0.5">{h.tipo}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="fixed inset-0 z-60 grid place-items-center p-4 bg-black/70 backdrop-blur-sm fade-in" onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="history-title" className="card w-full max-w-lg overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3 px-5 h-16 border-b border-line">
              <Avatar src={lexiImg} className="w-9 h-9" />
              <div className="flex-1">
                <h3 id="history-title" className="font-semibold leading-tight">Consulta a Lexi</h3>
                <p className="text-xs text-ink-3 tabular">{selected.fecha} · {selected.hora} · {selected.tipo}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Cerrar" autoFocus className="btn btn-ghost btn-sm w-9 px-0"><Icon name="close" className="w-4.5 h-4.5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="ml-auto max-w-[88%] w-fit bg-gold-500 text-[#0b1020] font-medium text-[14px] leading-relaxed rounded-2xl rounded-tr-md px-3.5 py-2.5">{selected.consulta}</p>
              <p className="max-w-[92%] bg-navy-800 text-[14px] leading-relaxed rounded-2xl rounded-tl-md px-3.5 py-2.5">{selected.respuesta}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
