import { useState } from "react"
import { t, uiText } from "../i18n/core"
import { confirmarRegistro, identidadCiudadano, registrarCiudadano } from "../services/ciudadanoService"
import { Alert, InputField, Spinner, card, primaryButton } from "../product/AuthField"
import type { Page } from "../ui"
import lexiImg from "../imports/mazcotalexi.png"

// Con texto se garantiza dd/mm/aaaa (el input de fecha nativo depende del idioma del navegador).
function mascaraFecha(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/")
}
function fechaIso(v: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v)
  if (!m) return null
  const [, dia, mes, anio] = m
  const f = new Date(Number(anio), Number(mes) - 1, Number(dia))
  if (f.getFullYear() !== Number(anio) || f.getMonth() !== Number(mes) - 1 || f.getDate() !== Number(dia)) return null
  return `${anio}-${mes}-${dia}`
}

const Check = () => (
  <svg className="w-4 h-4 text-[#926315] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

export default function RegisterCitizenPage({ navigate }: { navigate: (p: Page) => void }) {
  const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", nacimiento: "", email: "", telefono: "", password: "", confirmPassword: "", terms: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState<"form" | "verification">("form")
  const [codigo, setCodigo] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = t("auth.required")
    if (!form.apellido.trim()) e.apellido = t("auth.required")
    if (!/^\d{7,8}$/.test(form.dni)) e.dni = t("auth.invalidDni78Digits")
    const nacimiento = fechaIso(form.nacimiento)
    if (!form.nacimiento) e.nacimiento = t("auth.required")
    else if (!nacimiento) e.nacimiento = "Fecha inválida (dd/mm/aaaa)"
    else if (nacimiento >= new Date().toLocaleDateString("sv-SE")) e.nacimiento = "Ingresá una fecha anterior a hoy"
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t("auth.invalidEmail")
    if (form.password.length < 8) e.password = t("auth.atLeast8Characters")
    if (form.password !== form.confirmPassword) e.confirmPassword = t("auth.passwordsDoNotMatch")
    if (!form.terms) e.terms = t("auth.youMustAcceptTheTerms")
    return e
  }

  async function ejecutar(accion: () => Promise<void>) {
    setCargando(true)
    setError("")
    try {
      await accion()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    void ejecutar(async () => {
      await registrarCiudadano({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni,
        fechaNacimiento: fechaIso(form.nacimiento)!,
        mail: form.email.trim(),
        nroCelular: form.telefono.trim(),
        contrasena: form.password,
      })
      setCodigo("")
      setStep("verification")
    })
  }

  function handleVerify(ev: React.FormEvent) {
    ev.preventDefault()
    void ejecutar(async () => {
      await confirmarRegistro(codigo)
      // La contraseña recién ingresada habilita el acceso temporal para Didit; después se descarta.
      await identidadCiudadano.accederRegistro(form.email.trim(), form.password).catch(() => {})
      setForm((f) => ({ ...f, password: "", confirmPassword: "" }))
      navigate("verify-citizen")
    })
  }

  if (step === "verification") {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="w-16 h-16 bg-[#7bc8f6]/10 border border-[#7bc8f6]/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#1f5f9b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[#926315] text-xs font-bold uppercase tracking-wider mb-2">{t("auth.emailVerification")}</p>
            <h1 className="font-display font-extrabold text-3xl text-[#102247]">{t("auth.checkYourInbox")}</h1>
            <p className="text-[#657084] mt-3 text-sm leading-relaxed">
              {t("auth.weSentA6DigitCodeTo")} <strong className="text-[#102247]">{form.email}</strong>. Ingresalo para continuar con la validación de identidad.
            </p>
          </div>
          <div className={`${card} p-7`}>
            <form onSubmit={handleVerify}>
              <label htmlFor="verification-code" className="block text-xs font-semibold text-[#34445f] mb-2 text-center">
                {t("auth.verificationCode")}
              </label>
              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={codigo}
                aria-invalid={!!error}
                onChange={(e) => {
                  setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
                  setError("")
                }}
                placeholder="000000"
                className={`w-full bg-[#fbf8ef] border rounded-xl px-4 py-3.5 text-center text-2xl tracking-[0.45em] font-bold text-[#102247] placeholder-[#a3abb8] focus:outline-none transition-colors ${
                  error ? "border-red-500/70" : "border-[#d8d2c4] focus:border-[#94651c]/70"
                }`}
              />
              {error && <p className="text-red-700 text-xs text-center mt-2">{error}</p>}
              <button type="submit" disabled={cargando || codigo.length !== 6} className={`${primaryButton} mt-5`}>
                {cargando ? (
                  <>
                    <Spinner /> {t("auth.verifying")}
                  </>
                ) : (
                  "Verificar y continuar"
                )}
              </button>
            </form>
            <div className="mt-5 pt-5 border-t border-[#d8d2c4]/40 text-center">
              <button type="button" onClick={() => setStep("form")} className="text-xs text-[#1f5f9b] hover:underline">
                {t("auth.changeEmailAddress")}
              </button>
            </div>
          </div>
          <div className="mt-4 bg-[#eef1f5]/60 border border-[#d8d2c4]/40 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-[#657084]">
              En desarrollo el código no se envía por email: abrí <strong>ver-codigos.bat</strong> o ejecutá <code>docker compose logs ciudadanos</code>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const field = (id: keyof typeof form, label: string, type = "text", placeholder?: string, autoComplete?: string) => (
    <InputField
      label={uiText(label)}
      id={`rc-${id}`}
      type={type}
      value={form[id] as string}
      onChange={(v) => set(id, id === "dni" ? v.replace(/\D/g, "").slice(0, 8) : id === "nacimiento" ? mascaraFecha(v) : v)}
      placeholder={placeholder}
      error={errors[id]}
      autoComplete={autoComplete}
    />
  )

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-12 items-start">
          <div className="flex-1 max-w-lg">
            <div className="mb-8">
              <h1 className="font-display font-extrabold text-3xl text-[#102247]">{t("auth.createYourAbogaciaAccount")}</h1>
              <p className="text-[#657084] mt-2">{t("auth.registerToFindLawyersAndRequestInitialLegalGuidance")}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("nombre", "auth.firstName", "text", "Juan", "given-name")}
                {field("apellido", "auth.lastName", "text", "García", "family-name")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("dni", "DNI", "text", "12345678")}
                {field("nacimiento", "auth.dateOfBirth", "text", "dd/mm/aaaa", "bday")}
              </div>
              {field("email", "Email", "email", "juan@email.com", "email")}
              {field("telefono", "auth.phone", "tel", "+54 351 123 4567", "tel")}
              {field("password", "auth.password", "password", t("auth.atLeast8Characters"), "new-password")}
              {field("confirmPassword", "auth.confirmPassword", "password", t("auth.repeatYourPassword"), "new-password")}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 w-4 h-4" aria-invalid={!!errors.terms} />
                  <span className="text-sm text-[#657084]">Acepto los términos y condiciones y la política de privacidad de abogacIA.</span>
                </label>
                {errors.terms && <p className="mt-1 text-xs text-red-700 ml-7">{errors.terms}</p>}
              </div>
              <Alert kind="info">Después de confirmar tu email vas a validar tu identidad con Didit, con tu DNI y una selfie.</Alert>
              {error && <Alert>{error}</Alert>}
              <button type="submit" disabled={cargando} className={`${primaryButton} mt-2`}>
                {cargando ? (
                  <>
                    <Spinner /> Creando cuenta…
                  </>
                ) : (
                  t("auth.createAccount")
                )}
              </button>
            </form>
            <p className="text-center text-sm text-[#657084] mt-5">
              {t("auth.alreadyHaveAnAccount")}{" "}
              <button onClick={() => navigate("login")} className="text-[#926315] hover:underline font-medium">
                {t("auth.signIn")}
              </button>
            </p>
          </div>

          <div className="hidden lg:flex flex-col items-center gap-6 flex-shrink-0 w-72 sticky top-24">
            <div className={`${card} p-6 text-center w-full`}>
              <img src={lexiImg} alt="Lexi" className="w-28 h-28 object-contain mx-auto mb-4" />
              <h3 className="font-display font-bold text-[#102247] mb-3">{t("auth.withYourAccountYouCan")}</h3>
              <ul className="text-sm text-[#657084] space-y-2 text-left">
                {["Contactar abogados por WhatsApp", "auth.consultLexiWithoutLimits", "Guardar tus consultas enviadas", "auth.viewConsultationHistory"].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check />
                    {uiText(b)}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-[#657084] text-center">
              {t("auth.areYouALawyer")}{" "}
              <button onClick={() => navigate("register-lawyer")} className="text-[#926315] hover:underline font-medium">
                {t("auth.registerAsAProfessional")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
