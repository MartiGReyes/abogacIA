import { useEffect, useRef, useState } from 'react'
import { Avatar, Icon, Rating, TRUST, delay, heroBg, lexiImg, logoImg, useEscape, Wordmark, type Page, type User } from '../ui'
import { LAWYERS, MOCK_HISTORY, SPECIALTIES } from '../demoData'

// ─── Lexi Chat ────────────────────────────────────────────────────────────────

type ChatMsg = { from: 'lexi' | 'user'; text: string }
const INITIAL_MSGS: ChatMsg[] = [
  { from: 'lexi', text: '¡Hola! Soy Lexi. Puedo ayudarte a obtener una orientación inicial sobre tu situación legal. ¿En qué puedo ayudarte hoy?' },
]
const LEXI_RESPONSES: Record<string, string> = {
  default: 'Puedo orientarte sobre los primeros pasos y la información que deberías recopilar. Tené en cuenta que mi respuesta es orientativa y no reemplaza la consulta con un abogado matriculado.',
  accidente: 'En caso de accidente de tránsito: 1) Solicitá el libro de accidentes a la policía. 2) Intercambiá datos del seguro. 3) Documentá todo con fotos. 4) Consultá con un abogado especialista antes de firmar cualquier acuerdo.',
  laboral: 'Si tenés un conflicto laboral, conservá todos los recibos de sueldo, contratos y comunicaciones. Un abogado laboralista puede evaluar si corresponde una indemnización o intimación.',
  familia: 'Los asuntos de familia (divorcio, alimentos, custodia) requieren asesoramiento personalizado. Te recomiendo contactar a una abogada especialista en derecho de familia de nuestro catálogo.',
}
const SUGGESTIONS = ['Tuve un accidente de tránsito', 'Me despidieron sin causa', 'Quiero divorciarme']

function LexiChat({ onClose, inputId, fullscreen }: { onClose: () => void; inputId: string; fullscreen?: boolean }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(INITIAL_MSGS)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEscape(true, onClose)

  useEffect(() => {
    const el = listRef.current
    // Sin animación: un scroll suave acá compite con el de la página y la hace saltar.
    if (el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
  }, [msgs, typing])

  function send(value = input) {
    const text = value.trim(); if (!text || typing) return
    setMsgs(prev => [...prev, { from: 'user', text }]); setInput('')
    setTyping(true)
    setTimeout(() => {
      const lower = text.toLowerCase()
      let reply = LEXI_RESPONSES.default
      if (lower.includes('accidente') || lower.includes('tránsito')) reply = LEXI_RESPONSES.accidente
      else if (lower.includes('laboral') || lower.includes('trabajo') || lower.includes('despid')) reply = LEXI_RESPONSES.laboral
      else if (lower.includes('familia') || lower.includes('divorci') || lower.includes('custodia')) reply = LEXI_RESPONSES.familia
      setTyping(false)
      setMsgs(prev => [...prev, { from: 'lexi', text: reply }])
    }, 900)
  }

  return (
    <section aria-label="Chat con Lexi" className={`flex flex-col h-full bg-navy-900 overflow-hidden ${fullscreen ? '' : 'rounded-2xl border border-line shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]'}`}>
      <header className="flex items-center gap-3 px-4 h-16 border-b border-line shrink-0">
        <Avatar src={lexiImg} className="w-9 h-9" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight">Lexi</p>
          <p className="text-xs text-ink-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-ok" />Asistente de orientación legal</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar chat" className="btn btn-ghost btn-sm w-9 px-0"><Icon name="close" className="w-4.5 h-4.5" /></button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-3" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`fade-in flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[85%] px-3.5 py-2.5 text-[14px] leading-relaxed ${m.from === 'lexi' ? 'bg-navy-800 text-ink rounded-2xl rounded-tl-md' : 'bg-gold-500 text-[#0b1020] font-medium rounded-2xl rounded-tr-md'}`}>
              <span className="sr-only">{m.from === 'lexi' ? 'Lexi: ' : 'Vos: '}</span>{m.text}
            </p>
          </div>
        ))}
        {typing && (
          <div className="fade-in flex" aria-label="Lexi está escribiendo">
            <span className="bg-navy-800 rounded-2xl rounded-tl-md px-4 py-3.5 flex gap-1">
              {[0, 1, 2].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-ink-2 typing-dot" style={{ animationDelay: `${d * 160}ms` }} />)}
            </span>
          </div>
        )}
        {msgs.length === 1 && !typing && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} className="text-[13px] px-3 py-1.5 rounded-full border border-line-strong text-ink-2 hover:text-ink hover:border-gold-500/50 transition-colors">{s}</button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); send() }} className="p-3 border-t border-line shrink-0">
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">Escribí tu consulta</label>
          <input id={inputId} autoComplete="off" value={input} onChange={e => setInput(e.target.value)} placeholder="Escribí tu consulta…" className="field flex-1" />
          <button type="submit" aria-label="Enviar consulta" disabled={!input.trim() || typing} className="btn btn-primary w-11.5 px-0 h-11.5">
            <Icon name="arrow" className="w-4.5 h-4.5" stroke={2} />
          </button>
        </div>
        <p className="mt-2.5 text-[11.5px] text-ink-3 text-center leading-snug">Las respuestas de Lexi son orientativas y no constituyen asesoramiento jurídico profesional.</p>
      </form>
    </section>
  )
}

// ─── LawyerCard ───────────────────────────────────────────────────────────────

function LawyerCard({ lawyer, onConsult }: { lawyer: typeof LAWYERS[0]; onConsult: () => void }) {
  return (
    <article className="card flex flex-col p-5 transition-colors duration-200 hover:border-line-strong hover:bg-navy-850">
      <div className="flex items-start gap-3.5">
        <img src={lawyer.photo} alt={`Foto de ${lawyer.name}`} width={52} height={52} loading="lazy" className="w-13 h-13 rounded-full object-cover bg-navy-800 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug flex items-center gap-1.5">
            {lawyer.name}
            {lawyer.verified && (
              <span title="Matrícula verificada" className="text-sky-400 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2L12 2z" /><path d="M8.5 12.2l2.3 2.3 4.7-4.8" fill="none" stroke="#0b1428" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="sr-only">Matrícula verificada</span>
              </span>
            )}
          </h3>
          <p className="text-[13px] text-ink-2 mt-0.5">{lawyer.specialty}</p>
          <div className="mt-1.5"><Rating rating={lawyer.rating} reviews={lawyer.reviews} /></div>
        </div>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-ink-2 line-clamp-3">{lawyer.description}</p>

      <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-3">
        <Icon name="pin" className="w-3.5 h-3.5" />{lawyer.location}
        {!lawyer.verified && <span className="ml-auto text-[12px]">Matrícula en revisión</span>}
      </p>

      <div className="mt-auto pt-4">
        <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
          <p className="leading-tight">
            <span className="block text-[12px] text-ink-3">Consulta desde</span>
            <span className="text-[17px] font-semibold tabular">{lawyer.fee}</span>
          </p>
          <div className="flex gap-2">
            <button aria-label={`Ver perfil de ${lawyer.name}`} className="btn btn-ghost btn-sm">Ver perfil</button>
            <button onClick={onConsult} aria-label={`Consultar a ${lawyer.name}`} className="btn btn-secondary btn-sm">Consultar</button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: HOME
// ═══════════════════════════════════════════════════════════════════════════════

const HOW_IT_WORKS = [
  { icon: 'search' as const, title: 'Buscá por especialidad', text: 'Filtrá el catálogo por área del derecho y compará valoraciones y honorarios de cada profesional.' },
  { icon: 'chat' as const, title: 'Consultá a Lexi', text: 'Recibí una orientación inicial gratuita sobre tu situación antes de contactar a un abogado.' },
  { icon: 'shield' as const, title: 'Contactá a un profesional', text: 'Elegí entre abogados de Córdoba con matrícula verificada por la plataforma.' },
]

const PRO_STEPS = [
  { icon: 'idcard' as const, title: 'Validación de identidad', text: 'Con tu DNI y una selfie, mediante Didit.' },
  { icon: 'shield' as const, title: 'Verificación de matrícula', text: 'Ante el Colegio de Abogados.' },
  { icon: 'user' as const, title: 'Perfil en el catálogo', text: 'Con el sello de profesional verificado.' },
]

type SortKey = 'rating' | 'price' | 'default'
const feeValue = (fee: string) => Number(fee.replace(/\D/g, ''))

function HeroPreview({ onTry }: { onTry: () => void }) {
  const q = MOCK_HISTORY[2]
  const l = LAWYERS[1]
  return (
    <div className="relative fade-up mt-10 lg:mt-0" style={delay(200)}>
      <div className="absolute z-10 -top-10 left-5">
        <Avatar src={lexiImg} alt="Lexi, la asistente de AbogacIA" className="w-24 h-24 ring-[6px] ring-navy-950 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]" />
      </div>
      <div className="card bg-navy-900/90 backdrop-blur-md shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="flex items-center gap-3 pl-34 pr-5 h-16 border-b border-line">
          <div className="flex-1">
            <p className="font-semibold leading-tight">Lexi</p>
            <p className="text-xs text-ink-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-ok" />Asistente de orientación legal</p>
          </div>
          <span className="text-[11px] font-semibold text-ink-3 border border-line-strong rounded-full px-2 py-0.5">Ejemplo</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="ml-auto max-w-[85%] w-fit bg-gold-500 text-[#0b1020] font-medium text-[14px] leading-relaxed rounded-2xl rounded-tr-md px-3.5 py-2.5">{q.consulta}</p>
          <p className="max-w-[90%] bg-navy-800 text-[14px] leading-relaxed rounded-2xl rounded-tl-md px-3.5 py-2.5">{q.respuesta} Te recomiendo consultarlo con un abogado laboralista.</p>
          <div className="pt-2">
            <p className="text-[12px] font-semibold text-ink-3 mb-2">Abogados recomendados</p>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-navy-950/60 p-3">
              <img src={l.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{l.name}</p>
                <p className="text-[12px] text-ink-3">{l.specialty} · {l.location}</p>
              </div>
              <Rating rating={l.rating} />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onTry} className="btn btn-secondary w-full">Probar Lexi ahora <Icon name="arrow" className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}

export default function HomePage({ navigate, user, lexiSignal, onLexiHandled }: { navigate: (p: Page) => void; user: User | null; lexiSignal: number; onLexiHandled: () => void }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('rating')

  function openLexi() {
    if (window.matchMedia('(min-width: 1280px)').matches) {
      setChatOpen(true)
      // Solo baja al panel de Lexi si no está a la vista; si ya se ve, la página no se mueve.
      // Se desplaza la ventana directamente: Chrome interrumpe un scrollIntoView animado cuando el chat
      // ajusta su propio scroll, y la página terminaba saltando más tarde ("sube y baja").
      const panel = document.getElementById('lexi')?.getBoundingClientRect()
      const catalogo = document.getElementById('abogados')
      if (catalogo && (!panel || panel.top < 64 || panel.top > window.innerHeight * 0.6))
        window.scrollTo({ top: catalogo.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' })
    } else {
      setMobileChatOpen(true)
    }
  }

  useEffect(() => {
    if (lexiSignal) { openLexi(); onLexiHandled() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lexiSignal])

  useEffect(() => {
    if (!mobileChatOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileChatOpen])

  const q = searchQuery.trim().toLowerCase()
  const filteredLawyers = LAWYERS
    .filter(l => (!q || l.name.toLowerCase().includes(q) || l.specialty.toLowerCase().includes(q)) && (!activeFilter || l.specialty === activeFilter))
    .sort((a, b) => sort === 'rating' ? b.rating - a.rating : sort === 'price' ? feeValue(a.fee) - feeValue(b.fee) : 0)

  const chip = (active: boolean) => `shrink-0 h-9 px-3.5 rounded-full text-[13px] font-medium border transition-colors ${active ? 'bg-ink text-navy-950 border-ink' : 'border-line-strong text-ink-2 hover:text-ink hover:border-white/25'}`

  return (
    <div>
      {/* ── Hero ── */}
      <section id="inicio" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-linear-to-r from-navy-950 via-navy-950/92 to-navy-950/70" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-navy-950 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-32 pb-28 lg:pt-40 lg:pb-36 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 lg:gap-20 items-center">
          <div>
            <h1 className="fade-up text-[44px] sm:text-[56px] lg:text-[68px] font-bold leading-[1.02] tracking-[-0.035em]">
              Encontrá el <span className="text-gold-400">abogado</span> que necesitás.
            </h1>
            <p className="fade-up mt-6 text-lg sm:text-xl text-ink-2 leading-relaxed max-w-[34rem]" style={delay(80)}>
              AbogacIA te conecta con profesionales del derecho de Córdoba y te brinda orientación legal mediante inteligencia artificial.
            </p>
            <div className="fade-up mt-9 flex flex-col sm:flex-row gap-3" style={delay(160)}>
              <button onClick={() => document.getElementById('abogados')?.scrollIntoView({ behavior: 'smooth' })} className="btn btn-primary btn-lg">Buscar un abogado</button>
              <button onClick={openLexi} className="btn btn-secondary btn-lg"><Avatar src={lexiImg} className="w-6 h-6" />Consultar a Lexi</button>
            </div>
            <ul className="fade-up mt-10 flex flex-wrap gap-x-6 gap-y-3" style={delay(240)}>
              {TRUST.map(t => (
                <li key={t.text} className="flex items-center gap-2 text-sm text-ink-2"><Icon name={t.icon} className="w-4.5 h-4.5 text-gold-400" />{t.text}</li>
              ))}
            </ul>
          </div>
          <HeroPreview onTry={openLexi} />
        </div>
      </section>

      {/* ── Catálogo ── */}
      <section id="abogados" aria-labelledby="abogados-title" className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
        <form onSubmit={e => e.preventDefault()} role="search" className="card -mt-12 relative z-10 p-3 sm:p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex gap-2">
            <label htmlFor="lawyer-search" className="sr-only">Buscar abogado por nombre o especialidad</label>
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3 pointer-events-none" />
              <input id="lawyer-search" type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscá por nombre o especialidad" className="field h-12 pl-11 text-[15px]" />
            </div>
            <button type="submit" className="btn btn-primary h-12 px-6">Buscar</button>
          </div>
          <div role="group" aria-label="Filtrar por especialidad" className="mt-3 -mx-3 px-3 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">
            <button onClick={() => setActiveFilter(null)} aria-pressed={!activeFilter} className={chip(!activeFilter)}>Todas</button>
            {SPECIALTIES.map(s => (
              <button key={s} onClick={() => setActiveFilter(activeFilter === s ? null : s)} aria-pressed={activeFilter === s} className={chip(activeFilter === s)}>{s.replace('Derecho ', '').replace(/^de /, '').replace(/^./, c => c.toUpperCase())}</button>
            ))}
          </div>
        </form>

        <div className="mt-16 flex gap-8 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <h2 id="abogados-title" className="text-[28px] sm:text-[32px] font-bold leading-tight">Abogados disponibles</h2>
                <p className="mt-1 text-ink-3 text-sm" aria-live="polite">
                  <span className="tabular">{filteredLawyers.length}</span> {filteredLawyers.length === 1 ? 'profesional' : 'profesionales'}{activeFilter ? ` en ${activeFilter}` : ' en Córdoba'}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <label htmlFor="lawyer-sort" className="text-[13px] text-ink-3 whitespace-nowrap">Ordenar por</label>
                <select id="lawyer-sort" value={sort} onChange={e => setSort(e.target.value as SortKey)} className="field h-10 w-48 text-sm">
                  <option value="rating">Mejor valorados</option>
                  <option value="price">Menor precio</option>
                  <option value="default">Más experiencia</option>
                </select>
              </div>
            </div>

            {filteredLawyers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" /* Máximo 2 columnas: el contenedor comparte ancho con Lexi; con 3 los botones no entran. */>
                {filteredLawyers.map(l => <LawyerCard key={l.id} lawyer={l} onConsult={openLexi} />)}
              </div>
            ) : (
              <div className="card border-dashed px-6 py-16 text-center">
                <p className="text-lg font-semibold">No encontramos abogados para esa búsqueda</p>
                <p className="text-ink-2 mt-2 text-sm">Probá con otra especialidad o consultá a Lexi para orientarte.</p>
                <button onClick={() => { setSearchQuery(''); setActiveFilter(null) }} className="btn btn-secondary btn-sm mt-6">Limpiar filtros</button>
              </div>
            )}
          </div>

          <aside id="lexi" aria-label="Lexi, asistente legal" className="hidden xl:block w-[360px] shrink-0 h-[640px]" /* Sin sticky: se desplaza con la página en vez de despegarse al scrollear. */>
            {chatOpen ? <LexiChat onClose={() => setChatOpen(false)} inputId="lexi-input" /> : (
              <div className="card h-full p-7 flex flex-col">
                <Avatar src={lexiImg} className="w-16 h-16" />
                <h3 className="mt-5 text-xl font-bold">¿No sabés qué abogado necesitás?</h3>
                <p className="mt-2.5 text-ink-2 text-[14px] leading-relaxed">Contale a Lexi qué te pasó y recibí una orientación inicial gratuita, junto con la especialidad que corresponde a tu caso.</p>
                <ul className="mt-6 space-y-2.5 text-[14px] text-ink-2">
                  {['Respuestas en segundos', 'Sin necesidad de registrarte', 'Te sugiere profesionales verificados'].map(t => (
                    <li key={t} className="flex items-center gap-2.5"><Icon name="check" className="w-4 h-4 text-gold-400" stroke={2.25} />{t}</li>
                  ))}
                </ul>
                <button onClick={() => setChatOpen(true)} className="btn btn-primary w-full mt-auto">Hablar con Lexi</button>
                <p className="mt-3 text-[12px] text-ink-3 text-center">Orientación informativa, no reemplaza a un abogado.</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" aria-labelledby="como-title" className="border-t border-line">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-24 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
          <div>
            <h2 id="como-title" className="text-[28px] sm:text-[36px] font-bold leading-tight">Cómo funciona</h2>
            <p className="mt-4 text-ink-2 leading-relaxed max-w-sm">De la duda al profesional indicado, en tres pasos.</p>
          </div>
          <ol className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((s, i) => (
              <li key={s.title}>
                <span className="w-11 h-11 rounded-xl border border-line-strong bg-white/[0.03] grid place-items-center text-gold-400"><Icon name={s.icon} /></span>
                <p className="mt-5 text-[13px] font-semibold text-ink-3 tabular">Paso {i + 1}</p>
                <h3 className="mt-1 text-[17px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Profesionales ── */}
      <section id="profesionales" className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
        <div className="card relative overflow-hidden px-6 py-12 sm:px-12 lg:px-16 lg:py-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <h2 className="text-[28px] sm:text-[36px] font-bold leading-tight">¿Sos abogado/a?</h2>
            <p className="mt-4 text-ink-2 leading-relaxed max-w-[30rem]">Registrate en AbogacIA, verificá tu matrícula y conectá con personas que necesitan orientación legal en Córdoba.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('register-lawyer')} className="btn btn-primary btn-lg">Registrarme como profesional</button>
              {!user && <button onClick={() => navigate('register-citizen')} className="btn btn-ghost btn-lg">Soy ciudadano/a</button>}
            </div>
          </div>
          <ul className="space-y-3">
            {PRO_STEPS.map(s => (
              <li key={s.title} className="flex items-center gap-4 rounded-xl border border-line bg-navy-950/50 px-4 py-3.5">
                <span className="w-10 h-10 rounded-lg bg-gold-500/10 text-gold-400 grid place-items-center shrink-0"><Icon name={s.icon} /></span>
                <span><span className="block text-[15px] font-semibold">{s.title}</span><span className="block text-[13px] text-ink-3">{s.text}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer navigate={navigate} onLexi={openLexi} />

      {/* ── Lexi en pantallas chicas ── */}
      {mobileChatOpen ? (
        <div className="xl:hidden fixed inset-0 z-60 bg-navy-900 fade-in" role="dialog" aria-modal="true" aria-label="Chat con Lexi">
          <LexiChat onClose={() => setMobileChatOpen(false)} inputId="lexi-input-m" fullscreen />
        </div>
      ) : (
        <button onClick={() => setMobileChatOpen(true)} aria-label="Abrir chat con Lexi" className="xl:hidden fixed z-40 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-2 pl-1.5 pr-4 h-12 rounded-full bg-navy-800 border border-line-strong shadow-[0_12px_30px_-8px_rgba(0,0,0,0.8)] hover:bg-navy-700 transition-colors">
          <Avatar src={lexiImg} className="w-9 h-9" />
          <span className="text-sm font-semibold">Preguntale a Lexi</span>
        </button>
      )}
    </div>
  )
}

function Footer({ navigate, onLexi }: { navigate: (p: Page) => void; onLexi: () => void }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const cols: { title: string; links: { label: string; action: () => void }[] }[] = [
    { title: 'Plataforma', links: [
      { label: 'Buscar abogados', action: () => scrollTo('abogados') },
      { label: 'Consultar a Lexi', action: onLexi },
      { label: 'Cómo funciona', action: () => scrollTo('como-funciona') },
    ] },
    { title: 'Profesionales', links: [
      { label: 'Registrarme como abogado/a', action: () => navigate('register-lawyer') },
    ] },
    { title: 'Cuenta', links: [
      { label: 'Iniciar sesión', action: () => navigate('login') },
      { label: 'Crear cuenta', action: () => navigate('register-citizen') },
      { label: 'Verificar mi identidad', action: () => navigate('verify-citizen') },
    ] },
  ]
  return (
    <footer className="border-t border-line">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2.5"><Avatar src={logoImg} className="w-8 h-8" /><Wordmark /></div>
          <p className="mt-4 text-sm text-ink-3 leading-relaxed max-w-xs">Orientación legal con inteligencia artificial y abogados verificados en Córdoba.</p>
        </div>
        {cols.map(c => (
          <div key={c.title}>
            <p className="text-[13px] font-semibold">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map(l => <li key={l.label}><button onClick={l.action} className="text-sm text-ink-3 hover:text-ink transition-colors text-left">{l.label}</button></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-col md:flex-row gap-3 md:items-center justify-between text-[12px] text-ink-3">
          <p>© 2026 AbogacIA · Proyecto académico, Seminario.</p>
          <p className="max-w-xl md:text-right">La orientación de Lexi es informativa y no reemplaza el asesoramiento de un abogado matriculado. Perfiles y datos de demostración.</p>
        </div>
      </div>
    </footer>
  )
}
