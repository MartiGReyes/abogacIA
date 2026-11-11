import { useEffect, useState } from "react"
import { t } from "../i18n/core"
import { darDeBajaCiudadano, modificarCiudadano, obtenerMisDatos } from "../services/ciudadanoService"
import { cerrarSesion } from "../services/authService"
import { Alert, InputField, card } from "../product/AuthField"
import { Modal } from "../product/UI"
import type { Page } from "../ui"

interface Ciudadano {
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  direccion: string | null
  mail: string
  nroCelular: string | null
  verificacionDni?: string
}

const fechaAr = (fecha: string) => (fecha ? fecha.split("-").reverse().join("/") : "—")
const smallBtn = "text-sm border px-3 py-1.5 rounded-xl transition-all"

export default function ProfilePage({ navigate, onUpdated }: { navigate: (p: Page) => void; onUpdated: () => void }) {
  const [user, setUser] = useState<Ciudadano | null>(null)
  const [loadError, setLoadError] = useState("")
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Ciudadano | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  useEffect(() => {
    obtenerMisDatos()
      .then((c: Ciudadano) => {
        setUser(c)
        setForm(c)
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  const set = (k: keyof Ciudadano, v: string) => setForm((f) => f && { ...f, [k]: v })

  async function handleSave() {
    if (!form || !user) return
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = t("auth.required")
    if (!form.apellido.trim()) e.apellido = t("auth.required")
    if (!/\S+@\S+\.\S+/.test(form.mail)) e.mail = t("auth.invalidEmail")
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    setError("")
    try {
      const actualizado: Ciudadano = await modificarCiudadano(user.dni, {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        fechaNacimiento: form.fechaNacimiento,
        direccion: user.direccion,
        mail: form.mail.trim(),
        nroCelular: form.nroCelular?.trim() ?? "",
      })
      setUser(actualizado)
      setForm(actualizado)
      setEditing(false)
      setSaved(true)
      onUpdated()
      setTimeout(() => setSaved(false), 3000)
    } catch (ex) {
      setError((ex as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!user || deleteConfirm !== user.mail) return
    try {
      await darDeBajaCiudadano(user.dni)
      cerrarSesion()
      navigate("home")
    } catch (ex) {
      setError((ex as Error).message)
      setShowDeleteModal(false)
    }
  }

  if (loadError || !user || !form)
    return (
      <div className="min-h-screen pt-28 pb-16 max-w-3xl mx-auto px-4">
        {loadError ? <Alert>{loadError}</Alert> : <p className="loading-line">Cargando tus datos…</p>}
      </div>
    )

  const field = (id: keyof Ciudadano, label: string, type = "text") => (
    <InputField label={label} id={`pf-${id}`} type={type} value={(form[id] as string) ?? ""} onChange={(v) => set(id, v)} error={errors[id]} />
  )

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-[#102247]">{t("auth.myProfile")}</h1>
            <p className="text-[#657084] mt-1 text-sm">{t("auth.viewAndEditYourPersonalDetails")}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("consultations")} className={`${smallBtn} text-[#1f5f9b] border-[#d8d2c4] hover:text-[#102247]`}>
              {t("navigation.myConsultations")}
            </button>
            <button onClick={() => navigate("history")} className={`${smallBtn} text-[#1f5f9b] border-[#d8d2c4] hover:text-[#102247]`}>
              Historial de Lexi
            </button>
          </div>
        </div>

        {saved && (
          <div className="mb-5">
            <Alert kind="ok">{t("auth.detailsUpdatedSuccessfully")}</Alert>
          </div>
        )}
        {error && (
          <div className="mb-5">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className={`${card} p-6 mb-5`}>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-[#f0c25a] rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-[#102247] font-bold text-3xl">
                {user.nombre[0]}
                {user.apellido[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-[#102247] text-xl">
                {user.nombre} {user.apellido}
              </h2>
              <p className="text-[#657084] text-sm break-all">{user.mail}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-block bg-[#7bc8f6]/10 text-[#1f5f9b] border border-[#7bc8f6]/25 text-xs px-3 py-1 rounded-full font-medium">{t("auth.citizen")}</span>
                {user.verificacionDni === "APROBADA" && (
                  <span className="inline-block bg-emerald-500/10 text-emerald-800 border border-emerald-600/25 text-xs px-3 py-1 rounded-full font-medium">Identidad verificada</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${card} p-6 mb-5`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-[#102247] text-lg">{t("auth.personalDetails")}</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className={`${smallBtn} text-[#926315] border-[#f0a500]/30 hover:border-[#f0a500]/60`}>
                {t("auth.modify")}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false)
                    setForm(user)
                    setErrors({})
                    setError("")
                  }}
                  className={`${smallBtn} text-[#657084] border-[#d8d2c4] hover:text-[#102247]`}
                >
                  {t("auth.cancel")}
                </button>
                <button onClick={handleSave} disabled={saving} className="text-sm bg-[#102247] hover:bg-[#1b3566] disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-xl transition-colors">
                  {saving ? "Guardando…" : t("auth.save")}
                </button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("nombre", t("auth.firstName"))}
                {field("apellido", t("auth.lastName"))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="DNI" id="pf-dni" value={user.dni} onChange={() => {}} disabled hint="El DNI no puede modificarse: fue validado con Didit." />
                {field("fechaNacimiento", t("auth.dateOfBirth"), "date")}
              </div>
              {field("mail", "Email", "email")}
              {field("nroCelular", t("auth.phone"), "tel")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                [t("auth.firstName"), user.nombre],
                [t("auth.lastName"), user.apellido],
                ["DNI", user.dni],
                [t("auth.dateOfBirth"), fechaAr(user.fechaNacimiento)],
                ["Email", user.mail],
                [t("auth.phone"), user.nroCelular || "—"],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#fbf8ef]/60 rounded-xl px-4 py-3">
                  <p className="text-xs text-[#5d6777] font-medium mb-0.5">{label}</p>
                  <p className="text-[#102247] text-sm font-medium break-words">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-red-500/20 rounded-2xl p-6">
          <h3 className="font-display font-bold text-red-700 text-lg mb-2">{t("auth.dangerZone")}</h3>
          <p className="text-[#657084] text-sm mb-4">Tu cuenta queda deshabilitada y no podrás volver a iniciar sesión con ella.</p>
          <button onClick={() => setShowDeleteModal(true)} className="border border-red-500/40 hover:border-red-500/70 text-red-700 hover:text-red-800 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all">
            Dar de baja mi cuenta
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <Modal
          title={t("auth.confirmAccountDeletion")}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteConfirm("")
          }}
        >
          <p className="text-[#657084] text-sm mb-4">{t("auth.thisCannotBeUndoneToConfirmEnterYourEmail")}</p>
          <label htmlFor="delete-confirm" className="sr-only">
            Email
          </label>
          <input
            id="delete-confirm"
            autoComplete="off"
            className="w-full bg-[#fbf8ef] border border-red-500/30 rounded-xl px-4 py-3 text-sm text-[#102247] focus:outline-none focus:border-red-500/60 mb-4"
            placeholder={user.mail}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setDeleteConfirm("")
              }}
              className="flex-1 border border-[#d8d2c4] text-[#657084] hover:text-[#102247] font-semibold py-3 rounded-xl"
            >
              {t("auth.cancel")}
            </button>
            <button onClick={handleDelete} disabled={deleteConfirm !== user.mail} className="flex-1 bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white font-bold py-3 rounded-xl">
              Dar de baja
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
