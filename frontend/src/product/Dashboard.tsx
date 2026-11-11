import { t, uiText, formatNumber, intlLocale, TIME_ZONE } from "../i18n/core"
import { useEffect, useState } from "react"
import {
  AREAS,
  PERIODS,
  dateKey,
  inRange,
  localDate,
  localDateTime,
  periodRange,
  type ContactoGuardado,
  type DateRange,
  type Page,
  type Period,
  type ProfessionalCase,
} from "./model"
import { useProduct } from "./Store"
import { Badge, Button, Card, Empty, Field, Heading, Icon, Modal, Select } from "./UI"
import { CaseDetail } from "./PublicExperience"
import { contactosRecibidos } from "../services/contactoService.js"
import { comprimirImagen, crearCaso, eliminarCaso, misCasos, modificarCaso } from "../services/casosService.js"
import { obtenerMiPerfilAbogado } from "../services/abogadoService.js"

type Section = "dashboard" | "cases" | "statistics"
interface Perfil {
  nombre: string
  apellido: string
  especialidades: string[]
  whatsappAutorizado: boolean
  cuentaPrueba?: boolean
}
type Remote<T> = { loading: boolean; data: T; error: string }

function useRemote<T>(load: () => Promise<T>, initial: T, version: number): Remote<T> {
  const [state, setState] = useState<Remote<T>>({ loading: true, data: initial, error: "" })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: "" }))
    load()
      .then((data) => alive && setState({ loading: false, data, error: "" }))
      .catch((e: Error) => alive && setState({ loading: false, data: initial, error: e.message }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
  return state
}

function PeriodFilter({ period, setPeriod, custom, setCustom }: { period: Period; setPeriod: (v: Period) => void; custom: DateRange; setCustom: (v: DateRange) => void }) {
  return (
    <div className="period-filter">
      <Select label={t("dashboard.analysisPeriod")} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {uiText(p)}
          </option>
        ))}
      </Select>
      {period === "Personalizado" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("dashboard.from")} type="date" value={custom.start} max={custom.end} onChange={(e) => setCustom({ ...custom, start: e.target.value })} />
          <Field label={t("dashboard.to")} type="date" value={custom.end} min={custom.start} max={dateKey()} onChange={(e) => setCustom({ ...custom, end: e.target.value })} />
        </div>
      )}
    </div>
  )
}

/** Consultas recibidas agrupadas por día (o por mes en rangos largos). */
function buckets(rows: ContactoGuardado[], range: DateRange) {
  if (!range.start || !range.end || range.start > range.end) return []
  const days = (Date.parse(range.end) - Date.parse(range.start)) / 86400000 + 1
  const monthly = days > 70
  const grouped = new Map<string, { key: string; label: string; count: number }>()
  const end = new Date(`${range.end}T12:00:00Z`)
  for (
    let d = new Date(`${range.start}T12:00:00Z`);
    d <= end;
    monthly ? d.setUTCMonth(d.getUTCMonth() + 1, 1) : d.setUTCDate(d.getUTCDate() + Math.max(1, Math.ceil(days / 12)))
  ) {
    const key = d.toISOString().slice(0, monthly ? 7 : 10)
    grouped.set(key, {
      key,
      label: new Intl.DateTimeFormat(intlLocale(), monthly ? { month: "short", year: "2-digit", timeZone: TIME_ZONE } : { day: "numeric", month: "short", timeZone: TIME_ZONE }).format(d),
      count: 0,
    })
  }
  const all = [...grouped.values()].reverse()
  rows.forEach((r) => {
    if (!inRange(r.creadoEn, range)) return
    const k = dateKey(new Date(r.creadoEn)).slice(0, monthly ? 7 : 10)
    const b = all.find((b) => b.key <= k)
    if (b) b.count++
  })
  return [...grouped.values()]
}

function Bars({ rows }: { rows: ReturnType<typeof buckets> }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (!rows.some((r) => r.count > 0))
    return <Empty title={t("dashboard.noActivityInThisPeriod")}>{t("dashboard.tryAnotherPeriodOrAHistoricalDateRange")}</Empty>
  return (
    <>
      <div className="chart-legend">
        <span>
          <i className="legend-navy" /> Consultas recibidas
        </span>
      </div>
      <div className="chart-with-axis">
        <div className="chart-y-axis" aria-hidden="true">
          {[max, max / 2, 0].map((n, i) => (
            <span key={i}>{Number.isInteger(n) ? n : formatNumber(n, { maximumFractionDigits: 1 })}</span>
          ))}
        </div>
        <div className="chart" role="group" aria-label="Consultas recibidas en el tiempo">
          {rows.map((r) => (
            <div key={r.key} className="chart-column" tabIndex={0} aria-label={`${r.label}: ${r.count}`}>
              <div className="chart-tooltip" role="tooltip">
                {r.label}
                <br />
                {r.count} {r.count === 1 ? "consulta" : "consultas"}
              </div>
              <div className="bar-pair">
                <div className="bar bar-navy" style={{ height: `${(r.count / max) * 100}%` }} />
              </div>
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      </div>
      <details className="chart-data">
        <summary>{t("dashboard.viewChartData")}</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("dashboard.period")}</th>
                <th>Consultas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{formatNumber(r.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}

function ContactList({ rows, compact, onShowAll }: { rows: ContactoGuardado[]; compact?: boolean; onShowAll?: () => void }) {
  if (!rows.length)
    return <Empty title="Todavía no recibiste consultas">Cuando un ciudadano complete el formulario de contacto, vas a ver una copia acá.</Empty>
  return (
    <>
      <div className="request-list">
        {(compact ? rows.slice(0, 4) : rows).map((r) => (
          <article className="contact-card" key={r.id}>
            <header>
              <strong>{r.nombre}</strong>
              <span className="status-pill">
                <Icon name="calendar" /> {localDateTime(r.creadoEn)}
              </span>
            </header>
            <p className="preserve-lines">{r.resumen}</p>
            <p className="ui-muted">Teléfono de contacto: {r.telefono}</p>
          </article>
        ))}
      </div>
      {compact && rows.length > 4 && onShowAll && (
        <Button variant="ghost" onClick={onShowAll}>
          Ver todas las consultas <Icon name="arrow" />
        </Button>
      )}
    </>
  )
}

export function Dashboard({ section = "dashboard", navigate }: { section?: Section; navigate: (p: Page) => void }) {
  const store = useProduct()
  const [version, setVersion] = useState(0)
  const [casesVersion, setCasesVersion] = useState(0)
  const perfil = useRemote<Perfil | null>(() => obtenerMiPerfilAbogado(), null, version)
  const contactos = useRemote<ContactoGuardado[]>(() => contactosRecibidos(), [], version)
  const casos = useRemote<ProfessionalCase[]>(() => misCasos(), [], casesVersion)
  const [period, setPeriod] = useState<Period>("Este mes")
  const [custom, setCustom] = useState({ start: `${dateKey().slice(0, 7)}-01`, end: dateKey() })
  const range = periodRange(period, custom)
  const validRange = !!range.start && !!range.end && range.start <= range.end
  const enRango = contactos.data.filter((r) => inRange(r.creadoEn, range))
  const publicados = casos.data.filter((c) => c.publicado).length
  const p = perfil.data
  const titles = { dashboard: "dashboard.myProfessionalDashboard", cases: "dashboard.myProfessionalCases", statistics: "dashboard.myActivityStatistics" }
  const descriptions = {
    dashboard: "Consultas recibidas por WhatsApp, tus casos publicados y el estado de tu perfil.",
    cases: "dashboard.shareYourApproachWhileProtectingPeopleSPrivacy",
    statistics: "Evolución de las consultas que recibiste a través de la plataforma.",
  }
  return (
    <main className="product-page">
      <div className="product-breadcrumb">
        <Button variant="ghost" onClick={() => navigate("dashboard")}>
          {t("dashboard.myWorkspace")}
        </Button>
        <span aria-hidden="true">/</span>
        <span>{t(section === "dashboard" ? "dashboard.overview" : titles[section])}</span>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("dashboard.professionalWorkspace")}</p>
          <Heading level={1}>{uiText(titles[section])}</Heading>
          <p className="ui-muted page-description">{uiText(descriptions[section])}</p>
          <div className="professional-identity">
            <span className="avatar-initials">
              {(p?.nombre?.[0] ?? store.user?.nombre[0] ?? "").toUpperCase()}
              {(p?.apellido?.[0] ?? "").toUpperCase()}
            </span>
            <span>
              <strong>{p ? `${p.nombre} ${p.apellido}` : store.user?.nombre}</strong>
              <small>{p?.especialidades?.length ? p.especialidades.map(uiText).join(" · ") : "Especialidades no informadas"}</small>
            </span>
          </div>
        </div>
        {section === "statistics" && <PeriodFilter period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />}
      </div>
      {p?.cuentaPrueba && (
        <div className="demo-notice">
          <Icon name="shield" />
          <span>Cuenta de prueba — matrícula no verificada.</span>
        </div>
      )}
      {p && !p.whatsappAutorizado && (
        <div className="inline-notice">
          <Icon name="chat" /> Todavía no recibís consultas: activá el contacto por WhatsApp en{" "}
          <Button variant="ghost" onClick={() => navigate("lawyer-profile")}>
            Mi perfil profesional
          </Button>
        </div>
      )}
      <div className="section-tabs" aria-label={t("dashboard.professionalSections")}>
        {(
          [
            ["dashboard", "dashboard.overview", "briefcase"],
            ["cases", "dashboard.myCases", "cases"],
            ["statistics", "dashboard.statistics", "chart"],
          ] as const
        ).map(([key, label, icon]) => (
          <Button key={key} variant="ghost" className={section === key ? "is-active" : ""} aria-current={section === key ? "page" : undefined} onClick={() => navigate(key)}>
            <Icon name={icon} />
            {uiText(label)}
            {key === "cases" && !casos.loading && <span className="tab-count">{formatNumber(casos.data.length)}</span>}
          </Button>
        ))}
      </div>
      {(perfil.error || contactos.error) && section !== "cases" && (
        <div role="alert" className="inline-notice">
          {perfil.error || contactos.error}{" "}
          <Button variant="ghost" onClick={() => setVersion((v) => v + 1)}>
            Reintentar
          </Button>
        </div>
      )}

      {section === "dashboard" && (
        <>
          <div className="kpi-grid">
            {(
              [
                ["Consultas recibidas", contactos.loading ? "…" : formatNumber(contactos.data.length), "Histórico", "chat"],
                ["Este mes", contactos.loading ? "…" : formatNumber(contactos.data.filter((r) => dateKey(new Date(r.creadoEn)).startsWith(dateKey().slice(0, 7))).length), "Consultas del mes en curso", "calendar"],
                ["Casos publicados", casos.loading ? "…" : formatNumber(publicados), `${formatNumber(casos.data.length - publicados)} borradores`, "cases"],
                ["Contacto por WhatsApp", !p ? "…" : p.whatsappAutorizado ? "Activo" : "Inactivo", p?.whatsappAutorizado ? "Aparecés como contactable" : "Activalo desde tu perfil", "shield"],
              ] as const
            ).map(([title, value, detail, icon]) => (
              <Card className="kpi" key={title}>
                <div className="kpi-top">
                  <span className="ui-muted">{title}</span>
                  <span className="ui-icon-tile">
                    <Icon name={icon} />
                  </span>
                </div>
                <p className="kpi-value">{value}</p>
                <p className="ui-muted kpi-detail">{detail}</p>
              </Card>
            ))}
          </div>
          <Card>
            <div className="section-caption">
              <div>
                <Heading>Últimas consultas recibidas</Heading>
                <p className="ui-muted">Copia de los formularios que los ciudadanos confirmaron antes de abrir WhatsApp.</p>
              </div>
            </div>
            {contactos.loading ? <p className="loading-line">Cargando…</p> : <ContactList rows={contactos.data} compact onShowAll={() => navigate("statistics")} />}
          </Card>
          <CaseManager compact rows={casos} reload={() => setCasesVersion((v) => v + 1)} onShowAll={() => navigate("cases")} />
        </>
      )}

      {section === "statistics" && (
        <>
          {!validRange && (
            <p role="alert" className="ui-error">
              {t("dashboard.selectAValidDateRange")}
            </p>
          )}
          {validRange && (
            <>
              <div className="section-caption">
                <Heading>{t("dashboard.yourActivityInPerspective")}</Heading>
                <span className="ui-muted">
                  {localDate(range.start)} — {localDate(range.end)}
                </span>
              </div>
              <div className="kpi-grid">
                {(
                  [
                    ["Consultas en el período", formatNumber(enRango.length), "Formularios confirmados", "chat"],
                    ["Consultas históricas", formatNumber(contactos.data.length), "Desde que usás abogacIA", "briefcase"],
                    ["Casos publicados", formatNumber(publicados), "Visibles en tu perfil", "cases"],
                  ] as const
                ).map(([title, value, detail, icon]) => (
                  <Card className="kpi" key={title}>
                    <div className="kpi-top">
                      <span className="ui-muted">{title}</span>
                      <span className="ui-icon-tile">
                        <Icon name={icon} />
                      </span>
                    </div>
                    <p className="kpi-value">{value}</p>
                    <p className="ui-muted kpi-detail">{detail}</p>
                  </Card>
                ))}
              </div>
              <Card>
                <Heading level={3}>{t("dashboard.consultationsByPeriod")}</Heading>
                <p className="ui-muted card-subtitle">Según la fecha en que el ciudadano preparó el mensaje.</p>
                <Bars rows={buckets(contactos.data, range)} />
              </Card>
              <Card>
                <Heading>Consultas del período</Heading>
                <ContactList rows={enRango} />
              </Card>
            </>
          )}
        </>
      )}

      {section === "cases" && <CaseManager rows={casos} reload={() => setCasesVersion((v) => v + 1)} onShowAll={() => navigate("cases")} />}
      <footer className="product-footer">
        <span>{t("dashboard.abogaciaYourPracticeInOnePlace")}</span>
        <span>Córdoba, Argentina</span>
      </footer>
    </main>
  )
}

const blankCase = (): ProfessionalCase => ({
  titulo: "",
  area: AREAS[0],
  descripcion: "",
  situacion: "",
  intervencion: "",
  resultado: "",
  periodo: "",
  imagenes: [],
  publicado: false,
  consentimiento: false,
})

function CaseManager({ compact = false, rows, reload, onShowAll }: { compact?: boolean; rows: Remote<ProfessionalCase[]>; reload: () => void; onShowAll: () => void }) {
  const store = useProduct()
  const [editing, setEditing] = useState<ProfessionalCase | null>(null)
  const [preview, setPreview] = useState<ProfessionalCase | null>(null)
  const [deleting, setDeleting] = useState<ProfessionalCase | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [filter, setFilter] = useState("Todos")
  const filtered = rows.data.filter((c) => filter === "Todos" || (filter === "Publicados" ? c.publicado : !c.publicado))
  async function borrar() {
    if (!deleting?.id) return
    try {
      await eliminarCaso(deleting.id)
      setDeleting(null)
      store.setToast("dashboard.caseRemovedFromThePublicProfile")
      reload()
    } catch (e) {
      setDeleteError((e as Error).message)
    }
  }
  return (
    <Card className="case-section">
      <div className="section-caption">
        <div>
          <Heading>{t("dashboard.myProfessionalCases")}</Heading>
          <p className="ui-muted">{t("dashboard.publicExperiencesNotConfidentialCaseFiles")}</p>
        </div>
        <Button onClick={() => setEditing(blankCase())}>
          <Icon name="plus" /> {t("dashboard.addCase")}
        </Button>
      </div>
      <div className="inline-notice">
        <Icon name="shield" /> Publicá solo contenido anonimizado y autorizado. Los casos publicados se ven en tu perfil público.
      </div>
      <Select label={t("dashboard.showCases")} value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="Todos">{t("dashboard.all")}</option>
        <option value="Publicados">{t("dashboard.published")}</option>
        <option value="Borradores">{t("dashboard.drafts")}</option>
      </Select>
      {rows.loading ? (
        <p className="loading-line" role="status">
          Cargando casos…
        </p>
      ) : rows.error ? (
        <div role="alert">
          <p className="ui-error">{rows.error}</p>
          <Button variant="secondary" onClick={reload}>
            Reintentar
          </Button>
        </div>
      ) : !filtered.length ? (
        <Empty title={t("dashboard.noCasesInThisSection")}>{t("dashboard.addACaseOrChangeTheFilter")}</Empty>
      ) : (
        <div className="case-grid">
          {(compact ? filtered.slice(0, 2) : filtered).map((c) => (
            <article className="case-card" key={c.id}>
              {c.imagenes[0] ? (
                <img src={c.imagenes[0]} alt={t("cases.cover", { title: c.titulo })} className="case-cover" />
              ) : (
                <div className="case-cover case-cover--empty">
                  <Icon name="cases" />
                  <span>{uiText(c.area)}</span>
                </div>
              )}
              <div className="case-card-body">
                <Badge state={c.publicado ? "Publicado" : "Borrador"}>{uiText(c.publicado ? "Publicado" : "Borrador")}</Badge>
                <Heading level={3}>{c.titulo}</Heading>
                <p className="ui-muted">{c.descripcion}</p>
                <div className="action-row">
                  <Button variant="ghost" onClick={() => setPreview(c)}>
                    {t("dashboard.preview")}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing({ ...c })}>
                    {t("dashboard.edit")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDeleteError("")
                      setDeleting(c)
                    }}
                  >
                    {t("dashboard.delete")}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {compact && (
        <Button variant="ghost" onClick={onShowAll}>
          {t("dashboard.manageAllMyCases")} <Icon name="arrow" />
        </Button>
      )}
      {editing && (
        <CaseEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onPreview={setPreview}
          onSaved={(published) => {
            setEditing(null)
            store.setToast(published ? "Caso publicado en tu perfil" : "Borrador guardado")
            reload()
          }}
        />
      )}
      {preview && <CaseDetail item={preview} onClose={() => setPreview(null)} />}
      {deleting && (
        <Modal title={t("dashboard.deleteProfessionalCase")} onClose={() => setDeleting(null)}>
          <p>¿Eliminar «{deleting.titulo}»? Se quitará de tu perfil público. Esta acción no se puede deshacer.</p>
          {deleteError && (
            <p className="ui-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="action-row">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t("auth.cancel")}
            </Button>
            <Button variant="danger" onClick={() => void borrar()}>
              {t("dashboard.deleteCase")}
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  )
}

function CaseEditor({ initial, onClose, onPreview, onSaved }: { initial: ProfessionalCase; onClose: () => void; onPreview: (c: ProfessionalCase) => void; onSaved: (published: boolean) => void }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const update = (key: keyof ProfessionalCase, value: string | boolean | string[]) => setForm((f) => ({ ...f, [key]: value }))
  const areas = Array.from(new Set([...AREAS, initial.area]))
  async function images(files: FileList | null) {
    if (!files?.length) return
    if (form.imagenes.length + files.length > 4 || [...files].some((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 8 * 1024 * 1024)) {
      setErrors((e) => ({ ...e, imagenes: "Usá hasta 4 imágenes JPG, PNG o WEBP de hasta 8 MB." }))
      return
    }
    setUploading(true)
    try {
      const result = await Promise.all([...files].map((f) => comprimirImagen(f)))
      setForm((f) => ({ ...f, imagenes: [...f.imagenes, ...result] }))
      setErrors((e) => ({ ...e, imagenes: "" }))
    } catch {
      setErrors((e) => ({ ...e, imagenes: "dashboard.weCouldNotReadTheImagesTryAnotherFile" }))
    } finally {
      setUploading(false)
    }
  }
  async function save(publicado: boolean) {
    const e: Record<string, string> = {}
    if (form.titulo.trim().length < 5) e.titulo = "dashboard.enterATitleOfAtLeast5Characters"
    if (publicado) {
      for (const key of ["descripcion", "situacion", "intervencion"] as const)
        if (form[key].trim().length < 20) e[key] = "dashboard.enterAtLeast20CharactersWithoutIdentifyingInformation"
      if (!form.consentimiento) e.consentimiento = "dashboard.confirmAnonymisationAndPermissionsBeforePublishing"
    }
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    setError("")
    try {
      const item = { ...form, publicado }
      await (item.id ? modificarCaso(item) : crearCaso(item))
      onSaved(publicado)
    } catch (ex) {
      setError((ex as Error).message)
    } finally {
      setSaving(false)
    }
  }
  const busy = uploading || saving
  return (
    <Modal title={initial.id ? t("dashboard.editProfessionalCase") : t("dashboard.addProfessionalCase")} onClose={() => !saving && onClose()} wide>
      <p className="ui-muted">{t("dashboard.describeYourApproachClearlyDoNotIncludeNamesDni")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save(true)
        }}
        noValidate
      >
        <div className="form-grid">
          <Field label={t("dashboard.caseTitle")} required maxLength={120} value={form.titulo} onChange={(e) => update("titulo", e.target.value)} error={errors.titulo} />
          <Select label={t("dashboard.legalArea")} value={form.area} onChange={(e) => update("area", e.target.value)}>
            {areas.map((a) => (
              <option key={a} value={a}>
                {uiText(a)}
              </option>
            ))}
          </Select>
        </div>
        {(
          [
            ["descripcion", "dashboard.generalDescription"],
            ["situacion", "dashboard.reportedSituation"],
            ["intervencion", "dashboard.professionalIntervention"],
            ["resultado", "dashboard.outcomeOptional"],
          ] as const
        ).map(([key, label]) => (
          <Field
            key={key}
            label={uiText(label)}
            multiline
            required={key !== "resultado"}
            maxLength={4000}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
            error={uiText(errors[key] ?? "")}
          />
        ))}
        <Field label={t("dashboard.dateOrPeriodOptional")} maxLength={100} value={form.periodo} onChange={(e) => update("periodo", e.target.value)} />
        <Field
          label={t("dashboard.authorisedIllustrativeImages")}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            void images(e.target.files)
            e.target.value = ""
          }}
          error={errors.imagenes}
          help="Hasta 4 imágenes. Se reducen automáticamente antes de guardarse."
        />
        {uploading && <p role="status">{t("dashboard.readingImages")}</p>}
        <div className="image-previews">
          {form.imagenes.map((img, i) => (
            <div key={i}>
              <img src={img} alt={t("cases.previewImage", { number: i + 1 })} />
              <Button
                variant="danger"
                onClick={() =>
                  update(
                    "imagenes",
                    form.imagenes.filter((_, j) => j !== i),
                  )
                }
                aria-label={t("cases.removeImage", { number: i + 1 })}
              >
                <Icon name="close" />
              </Button>
            </div>
          ))}
        </div>
        <label className="consent">
          <input type="checkbox" checked={form.consentimiento} onChange={(e) => update("consentimiento", e.target.checked)} />{" "}
          {t("dashboard.iConfirmThatThisContentIsAnonymisedAndI")}
        </label>
        {errors.consentimiento && (
          <p role="alert" className="ui-error">
            {uiText(errors.consentimiento)}
          </p>
        )}
        {error && (
          <p role="alert" className="ui-error">
            {error}
          </p>
        )}
        <div className="action-row sticky-actions">
          <Button variant="secondary" onClick={() => onPreview(form)}>
            {t("dashboard.preview")}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void save(false)}>
            {t("dashboard.saveDraft")}
          </Button>
          <Button type="submit" disabled={busy}>
            {saving ? "Guardando…" : t("dashboard.publishCase")}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
