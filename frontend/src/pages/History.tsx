import { useEffect, useState } from "react"
import { t, uiText, formatNumber } from "../i18n/core"
import { eliminarDelHistorial, listarHistorial } from "../services/historialService"
import { Alert, card } from "../product/AuthField"
import { Modal } from "../product/UI"
import { dateKey, localDateTime } from "../product/model"
import { useProduct } from "../product/Store"
import type { Page } from "../ui"
import lexiImg from "../imports/mazcotalexi.png"

interface Consulta {
  id: number
  consulta: string
  respuesta: string
  especialidad: string | null
  creadaEn: string
}
const SIN_AREA = "Sin especialidad identificada"

export default function HistoryPage({ navigate }: { navigate: (p: Page) => void }) {
  const store = useProduct()
  const [rows, setRows] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<Consulta | null>(null)
  const [filter, setFilter] = useState("Todas")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError("")
    listarHistorial()
      .then((r: Consulta[]) => alive && setRows(r))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [version])

  // Las consultas nuevas se guardan mientras el chat está abierto: se recarga al cerrarlo.
  useEffect(() => {
    if (!store.chatOpen) setVersion((v) => v + 1)
  }, [store.chatOpen])

  const area = (c: Consulta) => c.especialidad || SIN_AREA
  const tipos = ["Todas", ...Array.from(new Set(rows.map(area)))]
  const filtered = filter === "Todas" ? rows : rows.filter((h) => area(h) === filter)
  const mes = dateKey().slice(0, 7)

  async function borrar(c: Consulta) {
    setDeleting(true)
    try {
      await eliminarDelHistorial(c.id)
      setRows((r) => r.filter((x) => x.id !== c.id))
      setSelected(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-[#102247]">Historial de Lexi</h1>
            <p className="text-[#657084] mt-1 text-sm">
              {formatNumber(rows.length)} {t("auth.consultationsWithLexi")}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => store.setChatOpen(true)} className="text-sm bg-[#102247] hover:bg-[#1b3566] text-white font-bold px-4 py-2 rounded-xl">
              Nueva consulta
            </button>
            <button onClick={() => navigate("profile")} className="text-sm text-[#657084] hover:text-[#102247] border border-[#d8d2c4] px-4 py-2 rounded-xl">
              {t("auth.myDetails")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            [t("auth.totalConsultations"), rows.length],
            [uiText("Este mes"), rows.filter((r) => dateKey(new Date(r.creadaEn)).startsWith(mes)).length],
            [t("auth.specialties"), new Set(rows.map((r) => r.especialidad).filter(Boolean)).size],
          ].map(([label, value]) => (
            <div key={String(label)} className={`${card} px-4 py-4`}>
              <p className="text-[#926315] font-bold text-xl">{formatNumber(Number(value))}</p>
              <p className="text-[#657084] text-xs">{label}</p>
            </div>
          ))}
        </div>

        {tipos.length > 2 && (
          <div className="flex gap-2 mb-5 flex-wrap" role="group" aria-label="Filtrar por especialidad">
            {tipos.map((tp) => (
              <button
                key={tp}
                onClick={() => setFilter(tp)}
                aria-pressed={filter === tp}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  filter === tp ? "bg-[#102247] border-[#102247] text-white" : "border-[#d8d2c4] text-[#657084] hover:border-[#94651c]/50 hover:text-[#102247]"
                }`}
              >
                {uiText(tp)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4">
            <Alert>
              {error}{" "}
              <button className="underline font-semibold" onClick={() => setVersion((v) => v + 1)}>
                Reintentar
              </button>
            </Alert>
          </div>
        )}

        {loading && !rows.length ? (
          <p className="loading-line">Cargando historial…</p>
        ) : !filtered.length && !error ? (
          <div className={`${card} p-10 text-center`}>
            <img src={lexiImg} alt="" className="w-16 h-16 object-contain mx-auto mb-3" />
            <p className="font-bold text-[#102247]">Todavía no consultaste a Lexi</p>
            <p className="text-sm text-[#657084] mt-1">Tus consultas quedan guardadas acá cuando iniciás sesión como ciudadano.</p>
            <button onClick={() => store.setChatOpen(true)} className="mt-5 text-sm bg-[#102247] hover:bg-[#1b3566] text-white font-bold px-5 py-2.5 rounded-xl">
              {t("home.talkToLexi")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((h) => (
              <button key={h.id} onClick={() => setSelected(h)} className="history-item">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <img src={lexiImg} alt="" className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#102247] text-sm font-medium leading-snug line-clamp-2">{h.consulta}</p>
                      <p className="text-[#657084] text-xs mt-2 line-clamp-1">{h.respuesta}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block bg-[#eef1f5] text-[#1f5f9b] text-xs px-2 py-0.5 rounded-full mb-1">{uiText(area(h))}</span>
                    <p className="text-[#5d6777] text-xs">{localDateTime(h.creadaEn)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal title={t("auth.consultationWithLexi")} onClose={() => setSelected(null)}>
          <p className="text-[#657084] text-xs mb-4">{localDateTime(selected.creadaEn)}</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#5d6777] font-medium mb-1.5">{t("auth.yourEnquiry")}</p>
              <div className="bg-[#f0c25a]/15 border border-[#f0c25a]/40 rounded-xl px-4 py-3">
                <p className="text-[#102247] text-sm leading-relaxed whitespace-pre-wrap">{selected.consulta}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#5d6777] font-medium mb-1.5">{t("auth.lexiSReply")}</p>
              <div className="bg-[#eef1f5] rounded-xl px-4 py-3 max-h-[50vh] overflow-y-auto">
                <p className="text-[#243653] text-sm leading-relaxed whitespace-pre-wrap">{selected.respuesta}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="bg-[#eef1f5] text-[#1f5f9b] text-xs px-3 py-1 rounded-full">{uiText(area(selected))}</span>
              <div className="flex gap-2">
                <button disabled={deleting} onClick={() => void borrar(selected)} className="text-sm text-red-700 border border-red-500/30 px-3 py-1.5 rounded-xl disabled:opacity-50">
                  Eliminar
                </button>
                <button onClick={() => setSelected(null)} className="text-sm text-[#657084] hover:text-[#102247] px-3 py-1.5">
                  {t("auth.close")}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
