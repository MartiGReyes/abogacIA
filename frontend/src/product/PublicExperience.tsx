import { t, uiText, formatMoney } from "../i18n/core"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { localDateTime, toLawyer, type ContactoGuardado, type Lawyer, type Page, type PerfilContacto, type ProfessionalCase } from "./model"
import { useProduct } from "./Store"
import { Badge, Button, Card, Empty, Field, Heading, Icon, Modal } from "./UI"
import { LawyerBadge } from "./LawyerCarousel"
import lexiImg from "../imports/mazcotalexi.png"
import { casosPublicos } from "../services/casosService.js"
import { AVISO_CONTACTO, mensajeWhatsApp, misContactos, prepararContacto } from "../services/contactoService.js"

// ─── Casos ────────────────────────────────────────────────────────────────────

export function CaseDetail({ item, onClose }: { item: ProfessionalCase; onClose: () => void }) {
  return (
    <Modal title={item.titulo || t("public.casePreview")} onClose={onClose} wide>
      <div className="detail-top">
        <Badge>{uiText(item.area)}</Badge>
        {item.periodo && <span className="ui-muted">{item.periodo}</span>}
      </div>
      {(
        [
          ["dashboard.generalDescription", item.descripcion],
          ["dashboard.reportedSituation", item.situacion],
          ["dashboard.professionalIntervention", item.intervencion],
          ["public.publishedOutcome", item.resultado || t("public.theProfessionalHasNotPublishedAnOutcome")],
        ] as const
      ).map(([title, text]) => (
        <section key={title} className="case-detail-section">
          <Heading level={3}>{uiText(title)}</Heading>
          <p className="preserve-lines" translate="no">
            {text || t("public.notCompleted")}
          </p>
        </section>
      ))}
      {!!item.imagenes.length && (
        <section>
          <Heading level={3}>{t("public.authorisedImageGallery")}</Heading>
          <div className="case-gallery">
            {item.imagenes.map((img, i) => (
              <img key={i} src={img} alt={t("cases.illustration", { number: i + 1, title: item.titulo })} />
            ))}
          </div>
        </section>
      )}
      <p className="ui-muted privacy-note">
        <Icon name="shield" /> {t("public.pastOutcomesDoNotGuaranteeFutureResultsCaseFiles")}
      </p>
    </Modal>
  )
}

function ProfileModal({ lawyer, onClose }: { lawyer: Lawyer; onClose: () => void }) {
  const store = useProduct()
  const [selectedCase, setSelectedCase] = useState<ProfessionalCase | null>(null)
  const [tab, setTab] = useState<"info" | "cases">("info")
  const [cases, setCases] = useState<{ loading: boolean; rows: ProfessionalCase[]; error: string }>({ loading: true, rows: [], error: "" })
  const profesional = lawyer.perfil.referencia.tipo === "PROFESIONAL"
  useEffect(() => {
    if (!profesional) {
      setCases({ loading: false, rows: [], error: "" })
      return
    }
    const abort = new AbortController()
    casosPublicos(lawyer.perfil.referencia.id, abort.signal)
      .then((rows: ProfessionalCase[]) => !abort.signal.aborted && setCases({ loading: false, rows, error: "" }))
      .catch((e: Error) => !abort.signal.aborted && setCases({ loading: false, rows: [], error: e.message }))
    return () => abort.abort()
  }, [lawyer.perfil.referencia.id, profesional])
  const tabs = [
    ["info", "Información"],
    ["cases", "Casos y experiencia"],
  ] as const
  return (
    <Modal title={t("auth.professionalProfile")} onClose={onClose} wide>
      <div className="public-profile-heading">
        <span className="initials-photo" aria-hidden="true">
          {lawyer.initials}
        </span>
        <div>
          <p className="eyebrow">{lawyer.specialties.map(uiText).join(" · ") || "Profesional del derecho"}</p>
          <Heading level={1}>{lawyer.name}</Heading>
          <p>{lawyer.location}</p>
          <div className="action-row">
            <LawyerBadge lawyer={lawyer} />
            {lawyer.years != null && <span className="rating-text">{t("common.years", { count: lawyer.years })} de experiencia</span>}
          </div>
        </div>
      </div>
      <div className="section-tabs" role="tablist" aria-label={t("auth.professionalProfile")}>
        {tabs.map(([key, label], i) => (
          <Button
            id={`profile-tab-${i}`}
            key={key}
            role="tab"
            aria-selected={tab === key}
            aria-controls="profile-panel"
            variant="ghost"
            className={tab === key ? "is-active" : ""}
            onClick={() => setTab(key)}
          >
            {uiText(label)}
            {key === "cases" && !cases.loading && <span className="tab-count">{cases.rows.length}</span>}
          </Button>
        ))}
      </div>
      <div id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${tab === "info" ? 0 : 1}`} tabIndex={0}>
        {tab === "info" ? (
          <>
            <Heading>{t("public.professionalIntroduction")}</Heading>
            <p className="profile-description">{lawyer.description || "El profesional todavía no publicó una presentación."}</p>
            <div className="profile-info-grid">
              <Card>
                <Heading level={3}>{t("auth.specialties")}</Heading>
                <div className="action-row">
                  {lawyer.specialties.length ? lawyer.specialties.map((a) => <Badge key={a}>{uiText(a)}</Badge>) : <span className="ui-muted">No informadas</span>}
                </div>
              </Card>
              <Card>
                <Heading level={3}>{t("public.experienceAndEducation")}</Heading>
                <p>{lawyer.years != null ? `${t("common.years", { count: lawyer.years })} de experiencia profesional.` : "Experiencia no informada."}</p>
                {lawyer.college && <p className="ui-muted">{lawyer.college}</p>}
              </Card>
              <Card>
                <Heading level={3}>Contacto</Heading>
                <p>{lawyer.contactEnabled ? "Recibe consultas por WhatsApp." : "Este profesional todavía no habilitó el contacto por WhatsApp."}</p>
                {lawyer.maskedPhone && <p className="ui-muted">Destino: {lawyer.maskedPhone}</p>}
              </Card>
              <Card>
                <Heading level={3}>{t("auth.indicativeFees")}</Heading>
                <p className="kpi-value">{lawyer.fee != null ? formatMoney(lawyer.fee) : "A convenir"}</p>
                <p className="ui-muted">{t("public.thisIsNotAFinalQuoteAgreeOnScope")}</p>
              </Card>
            </div>
            <Button variant="secondary" onClick={() => setTab("cases")}>
              {t("public.exploreCasesAndExperience")} <Icon name="arrow" />
            </Button>
          </>
        ) : (
          <>
            <Heading>{t("public.professionalCasesAndExperience")}</Heading>
            <p className="ui-muted">Experiencias anonimizadas publicadas por el profesional.</p>
            {cases.loading ? (
              <p className="loading-line" role="status">
                Cargando casos…
              </p>
            ) : cases.error ? (
              <p role="alert" className="ui-error">
                {cases.error}
              </p>
            ) : cases.rows.length ? (
              <div className="case-grid">
                {cases.rows.map((c) => (
                  <article className="case-card" key={c.id}>
                    {c.imagenes[0] ? (
                      <img className="case-cover" src={c.imagenes[0]} alt={t("cases.cover", { title: c.titulo })} />
                    ) : (
                      <div className="case-cover case-cover--empty">
                        <Icon name="cases" />
                        <span>{uiText(c.area)}</span>
                      </div>
                    )}
                    <div className="case-card-body">
                      <Badge>{uiText(c.area)}</Badge>
                      <Heading level={3}>{c.titulo}</Heading>
                      <p className="ui-muted">{c.descripcion}</p>
                      <Button variant="secondary" onClick={() => setSelectedCase(c)}>
                        {t("public.viewCase")} <Icon name="arrow" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title={t("public.noPublishedCases")}>Este profesional todavía no compartió casos.</Empty>
            )}
            <p className="ui-muted privacy-note">{t("public.pastOutcomesDoNotGuaranteeFutureResults")}</p>
          </>
        )}
      </div>
      <div className="action-row sticky-actions">
        <Button variant="secondary" onClick={onClose}>
          {t("auth.close")}
        </Button>
        <Button onClick={() => store.setContact(lawyer)} disabled={!lawyer.contactEnabled}>
          {lawyer.contactEnabled ? t("public.contactLawyer") : "Contacto no disponible"} <Icon name="arrow" />
        </Button>
      </div>
      {selectedCase && <CaseDetail item={selectedCase} onClose={() => setSelectedCase(null)} />}
    </Modal>
  )
}

// ─── Contacto por WhatsApp ────────────────────────────────────────────────────

function ContactForm({ lawyer, seed, navigate }: { lawyer: Lawyer; seed: string; navigate: (p: Page) => void }) {
  const store = useProduct()
  const perfil = lawyer.perfil
  const [datos, setDatos] = useState({
    nombre: store.user ? `${store.user.nombre} ${store.user.apellido}`.trim() : "",
    telefono: "",
    resumen: seed.slice(0, 800),
  })
  const [consentimiento, setConsentimiento] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [prepared, setPrepared] = useState<{ url: string; aviso: string; continuar: boolean } | null>(null)
  const ventana = useRef<Window | null>(null)
  const alive = useRef(true)
  const mensaje = mensajeWhatsApp(perfil, datos)
  const firma = `${perfil.referencia.tipo}:${perfil.referencia.id}:${mensaje}`
  const completo = Object.values(datos).every((v) => v.trim())
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      ventana.current?.close()
    }
  }, [])
  function editar(campo: keyof typeof datos, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setConsentimiento("")
    setError("")
  }
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!completo || consentimiento !== firma || sending) return
    // La ventana se abre antes de esperar al backend para que el navegador no la bloquee.
    ventana.current = window.open("about:blank", "_blank")
    if (ventana.current) ventana.current.opener = null
    setSending(true)
    setError("")
    try {
      const data = await prepararContacto(perfil, datos, mensaje)
      if (!alive.current) return
      const continuar = !ventana.current || ventana.current.closed
      if (!continuar) ventana.current!.location.replace(data.url)
      ventana.current = null
      setPrepared({ ...data, continuar })
      store.setToast("Consulta guardada en Mis consultas")
    } catch (ex) {
      ventana.current?.close()
      ventana.current = null
      if (alive.current) setError((ex as Error).message)
    } finally {
      if (alive.current) setSending(false)
    }
  }
  if (prepared)
    return (
      <Modal title="Mensaje preparado" onClose={() => store.setContact(null)}>
        <div className="success-state">
          <span className="success-mark">
            <Icon name="check" />
          </span>
          <Heading>Tu consulta está lista en WhatsApp</Heading>
          <p>{prepared.aviso}</p>
          {prepared.continuar && (
            <a className="ui-button ui-button--primary" href={prepared.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
              Continuar en WhatsApp <Icon name="arrow" />
            </a>
          )}
          <p className="ui-muted">
            Guardamos una copia en <strong>{t("navigation.myConsultations")}</strong>.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              store.setContact(null)
              store.setProfile(null)
              store.setChatOpen(false)
              navigate("consultations")
            }}
          >
            {t("public.viewMyConsultations")} <Icon name="arrow" />
          </Button>
        </div>
      </Modal>
    )
  return (
    <Modal title={t("contact.title", { name: lawyer.name })} onClose={() => !sending && store.setContact(null)}>
      <div className="contact-summary">
        <span className="initials-photo" aria-hidden="true">
          {lawyer.initials}
        </span>
        <div>
          <strong>{lawyer.name}</strong>
          <small>
            {lawyer.specialties.map(uiText).join(" · ")} · {lawyer.location}
          </small>
        </div>
      </div>
      {lawyer.test && <p className="inline-notice">Cuenta de prueba — matrícula no verificada.</p>}
      <p className="ui-muted">
        Armamos el mensaje y lo abrís en WhatsApp para enviarlo vos. Destino registrado: {lawyer.maskedPhone || "se confirma al preparar el mensaje"}.
      </p>
      <form noValidate onSubmit={enviar} aria-busy={sending} autoComplete="off">
        <div className="form-grid">
          <Field label={t("auth.fullName")} required maxLength={100} value={datos.nombre} onChange={(e) => editar("nombre", e.target.value)} />
          <Field
            label={t("public.contactPhone")}
            type="tel"
            required
            maxLength={35}
            placeholder="+54 9 351 123 4567"
            value={datos.telefono}
            onChange={(e) => editar("telefono", e.target.value)}
            help="Formato +54 9, código de área y número, sin 0 ni 15."
          />
        </div>
        <Field
          label="Resumen de tu consulta"
          multiline
          required
          maxLength={800}
          value={datos.resumen}
          onChange={(e) => editar("resumen", e.target.value)}
          help={`${datos.resumen.length}/800 · No incluyas DNI, matrícula ni datos sensibles innecesarios.`}
        />
        <section aria-label="Vista previa del mensaje">
          <Heading level={3}>Vista previa del mensaje</Heading>
          <p className="message-preview">{mensaje}</p>
        </section>
        <label className="consent">
          <input
            type="checkbox"
            disabled={!completo || sending}
            checked={consentimiento === firma}
            onChange={(e) => setConsentimiento(e.target.checked ? firma : "")}
          />{" "}
          Revisé el destinatario y el mensaje. Autorizo compartir estos datos con el profesional y WhatsApp/Meta, y que abogacIA guarde una copia en Mis
          consultas. Abrir el enlace no confirma el envío. Aviso {AVISO_CONTACTO}.
        </label>
        {error && (
          <p className="ui-error" role="alert">
            {error}
          </p>
        )}
        <div className="action-row">
          <Button type="submit" disabled={!completo || consentimiento !== firma || sending}>
            {sending ? "Preparando…" : "Abrir WhatsApp"}
            <Icon name="arrow" />
          </Button>
          <Button disabled={sending} variant="secondary" onClick={() => store.setContact(null)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Lexi ─────────────────────────────────────────────────────────────────────

type Recomendacion = { estado: string; especialidad: string | null; abogados: PerfilContacto[]; error: string; consulta: string }

function LexiRecommendations({ id, data }: { id: string; data: Recomendacion }) {
  const store = useProduct()
  const decidir = (aceptar: boolean) => void store.conversation.decidir(id, aceptar)
  if (data.estado === "oferta")
    return (
      <div className="lexi-offer">
        <p>¿Querés ver abogados para consultar por tu caso?</p>
        <div className="action-row">
          <Button onClick={() => decidir(true)}>Sí, ver abogados</Button>
          <Button variant="secondary" onClick={() => decidir(false)}>
            No, gracias
          </Button>
        </div>
      </div>
    )
  if (data.estado === "rechazada") return <p className="ui-muted">Podés seguir conversando con Lexi.</p>
  if (data.estado === "cargando")
    return (
      <p className="loading-line" role="status">
        Buscando abogados disponibles…
      </p>
    )
  if (data.estado === "error")
    return (
      <div className="lexi-offer" role="alert">
        <p>{data.error}</p>
        <Button variant="secondary" onClick={() => decidir(true)}>
          Reintentar búsqueda
        </Button>
      </div>
    )
  const lawyers = data.abogados.map(toLawyer)
  return (
    <div className="recommendations">
      {data.especialidad && <p className="ui-muted">Especialidad sugerida: {uiText(data.especialidad)}</p>}
      {!lawyers.length && <p>No hay perfiles disponibles para esta consulta.</p>}
      {lawyers.map((l) => (
        <article key={l.id} className="recommendation">
          <span className="initials-photo" aria-hidden="true">
            {l.initials}
          </span>
          <div>
            <strong>{l.name}</strong>
            <small>
              {l.specialties.map(uiText).join(" · ")} · {l.location}
            </small>
            <LawyerBadge lawyer={l} />
          </div>
          <p>{t("public.shownBecauseTheSpecialtyMatchesNotAsAGuarantee")}</p>
          <div className="action-row">
            <Button variant="secondary" onClick={() => store.setProfile(l)}>
              {t("lawyers.viewProfile")}
            </Button>
            <Button disabled={!l.contactEnabled} onClick={() => store.setContact(l, data.consulta)}>
              {l.contactEnabled ? t("lawyers.contact") : "Contacto no disponible"}
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

export function LexiPanel() {
  const store = useProduct()
  const conversation = store.conversation
  const { msgs, typing, error, retry, recomendaciones } = useSyncExternalStore(conversation.subscribe, conversation.getSnapshot)
  const ofertas = recomendaciones as Record<string, Recomendacion>
  const [input, setInput] = useState("")
  const list = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  useEffect(() => {
    if (stickToBottom.current) list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" })
  }, [msgs, typing, recomendaciones])
  function send(text: string) {
    const value = text.trim()
    if (!value || typing || value.length > 2000) return
    stickToBottom.current = true
    setInput("")
    void conversation.send(value)
    document.getElementById("lexi-message")?.focus()
  }
  return (
    <div className="lexi-panel">
      <div className="lexi-identity">
        <img src={lexiImg} alt={t("public.lexiLegalAssistant")} />
        <div>
          <Heading level={3}>Lexi</Heading>
          <span>{t("public.initialLegalGuidance")}</span>
        </div>
        <Badge>IA</Badge>
      </div>
      <div
        className="lexi-messages"
        ref={list}
        role="log"
        aria-label={t("public.conversationWithLexi")}
        aria-live="polite"
        onScroll={() => {
          const el = list.current
          if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
        }}
      >
        {msgs.map((m: { id: string; from: string; text: string }) => (
          <div key={m.id} className={`chat-message chat-message--${m.from}`}>
            <strong className="sr-only">{m.from === "user" ? t("public.you") : "Lexi"}: </strong>
            <p translate="no" className="preserve-lines">
              {m.text}
            </p>
            {ofertas[m.id] && <LexiRecommendations id={m.id} data={ofertas[m.id]} />}
          </div>
        ))}
        {error && (
          <div role="alert" className="lexi-offer">
            <p>{error}</p>
            {retry && (
              <Button variant="secondary" disabled={typing} onClick={() => void conversation.retry()}>
                Reintentar consulta
              </Button>
            )}
          </div>
        )}
        {typing && (
          <p role="status" className="typing-indicator">
            {t("public.lexiIsPreparingSomeGuidance")}
          </p>
        )}
      </div>
      {msgs.length === 1 && !typing && (
        <div className="lexi-suggestions">
          {["Tuve un accidente de tránsito", "Me despidieron sin causa", "Quiero divorciarme", "Tengo un problema con el alquiler"].map((s) => (
            <Button key={s} variant="secondary" onClick={() => send(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}
      <div className="lexi-disclaimer">
        {t("public.lexiProvidesGeneralLegalGuidanceAndDoesNotReplace")}
        {store.user?.role === "citizen" ? " Tus consultas se guardan en tu Historial de Lexi." : ""}
      </div>
      <form
        className="lexi-input"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <Field
          label={t("public.yourEnquiryForLexi")}
          id="lexi-message"
          placeholder={t("public.tellMeWhatYouNeedHelpWith")}
          value={input}
          maxLength={2000}
          autoComplete="off"
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" disabled={typing || !input.trim()} aria-label={t("public.sendMessageToLexi")}>
          <Icon name="arrow" />
        </Button>
      </form>
    </div>
  )
}

// ─── Mis consultas (formularios de contacto guardados) ────────────────────────

export function CitizenConsultations({ navigate }: { navigate: (p: Page) => void }) {
  const store = useProduct()
  const [state, setState] = useState<{ loading: boolean; rows: ContactoGuardado[]; error: string }>({ loading: true, rows: [], error: "" })
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState("")
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: "" }))
    misContactos()
      .then((rows: ContactoGuardado[]) => alive && setState({ loading: false, rows, error: "" }))
      .catch((e: Error) => alive && setState({ loading: false, rows: [], error: e.message }))
    return () => {
      alive = false
    }
  }, [version])
  const q = query.trim().toLowerCase()
  const rows = state.rows.filter((r) => !q || `${r.abogado} ${r.especialidades} ${r.resumen}`.toLowerCase().includes(q))
  const lawyerFor = (r: ContactoGuardado) => store.lawyers.find((l) => l.perfil.referencia.tipo === "PROFESIONAL" && l.perfil.referencia.id === String(r.idAbogado))
  return (
    <main className="product-page">
      <p className="eyebrow">{t("public.myWorkspace")}</p>
      <Heading level={1}>{t("navigation.myConsultations")}</Heading>
      <p className="ui-muted page-description">Los formularios que completaste para contactar abogados por WhatsApp.</p>
      <div className="action-row">
        <Button
          variant="secondary"
          onClick={() => {
            store.setHomeSection("catalog")
            navigate("home")
          }}
        >
          {t("home.findALawyer")}
        </Button>
        <Button variant="secondary" onClick={() => store.setChatOpen(true)}>
          {t("public.chatWithLexi")}
        </Button>
        <Button variant="ghost" onClick={() => navigate("history")}>
          Historial de Lexi
        </Button>
      </div>
      <Card>
        <div className="section-caption">
          <Heading>Consultas enviadas</Heading>
          <Field label="Buscar" placeholder="Abogado, especialidad o texto" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {state.loading ? (
          <p className="loading-line" role="status">
            Cargando tus consultas…
          </p>
        ) : state.error ? (
          <div role="alert">
            <p className="ui-error">{state.error}</p>
            <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>
              Reintentar
            </Button>
          </div>
        ) : rows.length ? (
          <div className="request-list">
            {rows.map((r) => {
              const l = lawyerFor(r)
              return (
                <article className="contact-card" key={r.id}>
                  <header>
                    <div>
                      <strong>{r.abogado}</strong>
                      {r.especialidades && <small className="ui-muted"> · {r.especialidades}</small>}
                    </div>
                    <span className="status-pill">
                      <Icon name="calendar" /> {localDateTime(r.creadoEn)}
                    </span>
                  </header>
                  <p className="preserve-lines">{r.resumen}</p>
                  <p className="ui-muted">
                    Enviado como {r.nombre} · {r.telefono}
                  </p>
                  {l && (
                    <div className="action-row">
                      <Button variant="ghost" onClick={() => store.setProfile(l)}>
                        {t("lawyers.viewProfile")}
                      </Button>
                      <Button variant="secondary" disabled={!l.contactEnabled} onClick={() => store.setContact(l, r.resumen)}>
                        Volver a escribir
                      </Button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <Empty title={state.rows.length ? "Sin resultados" : "Todavía no contactaste a ningún abogado"}>
            {state.rows.length ? "Probá con otra búsqueda." : "Elegí un profesional del catálogo y completá el formulario de contacto."}
          </Empty>
        )}
      </Card>
    </main>
  )
}

// ─── Capas globales ───────────────────────────────────────────────────────────

export function ProductOverlays({ navigate }: { navigate: (p: Page) => void }) {
  const store = useProduct()
  const leave = (p: Page) => {
    store.setPendingContact(store.contact)
    store.setContact(null)
    store.setProfile(null)
    store.setChatOpen(false)
    navigate(p)
  }
  return (
    <>
      {store.chatOpen && (
        <Modal title={t("public.legalGuidanceWithLexi")} onClose={() => store.setChatOpen(false)}>
          <LexiPanel />
        </Modal>
      )}
      {store.profile && <ProfileModal key={store.profile.id} lawyer={store.profile} onClose={() => store.setProfile(null)} />}
      {store.contact &&
        (!store.user ? (
          <Modal title={t("public.signInToSendYourEnquiry")} onClose={() => store.setContact(null)}>
            <Heading>
              {t("public.continueWith")} {store.contact.name}
            </Heading>
            <p>Iniciá sesión como ciudadano para completar el formulario. Después de ingresar se abre el contacto con este profesional.</p>
            <div className="action-row">
              <Button onClick={() => leave("login")}>{t("auth.login")}</Button>
              <Button variant="secondary" onClick={() => leave("register-citizen")}>
                {t("auth.createAccount")}
              </Button>
            </div>
          </Modal>
        ) : store.user.role !== "citizen" ? (
          <Modal title={t("public.enquiriesForCitizens")} onClose={() => store.setContact(null)}>
            <p>{t("public.thisFormIsAvailableToCitizensSignInWith")}</p>
            <Button onClick={() => store.setContact(null)}>{t("public.gotIt")}</Button>
          </Modal>
        ) : (
          <ContactForm key={`${store.contact.id}-${store.user.email}`} lawyer={store.contact} seed={store.contactSeed} navigate={navigate} />
        ))}
      {store.information && (
        <Modal title={uiText(store.information.title)} onClose={() => store.setInformation(null)}>
          <p>{uiText(store.information.body)}</p>
          <Button onClick={() => store.setInformation(null)}>{t("public.gotIt")}</Button>
        </Modal>
      )}
      {store.toast && (
        <div className="ui-toast" role="status">
          <Icon name="check" />
          <span>{uiText(store.toast)}</span>
          <Button variant="ghost" onClick={() => store.setToast("")} aria-label={t("public.dismissNotification")}>
            <Icon name="close" />
          </Button>
        </div>
      )}
    </>
  )
}
