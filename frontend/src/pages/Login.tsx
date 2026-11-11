import { useContext, useState } from "react"
import { useLocation } from "react-router-dom"
import { t } from "../i18n/core"
import { iniciarSesion } from "../services/authService"
import { Alert, InputField, Spinner, card, primaryButton } from "../product/AuthField"
// Solo el contexto (sin el store): el frontend aislado de administración reutiliza esta pantalla.
import { ProductContext } from "../product/Context"
import type { Page } from "../ui"
import logoImg from "../imports/logoabogacIA.png"

type Tipo = "CIUDADANO" | "ABOGADO"

export default function LoginPage({ navigate, admin = false }: { navigate: (p: Page) => void; admin?: boolean }) {
  const location = useLocation()
  const pendingContact = useContext(ProductContext)?.pendingContact
  const [tipo, setTipo] = useState<Tipo>("CIUDADANO")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError(t("auth.completeAllFields"))
      return
    }
    setLoading(true)
    try {
      const sesion = await iniciarSesion(email.trim(), password, admin ? "ADMIN" : tipo)
      navigate(admin ? "admin" : sesion.rol === "ABOGADO" ? "dashboard" : "home")
    } catch (ex) {
      setError(ex instanceof TypeError ? "No se pudo conectar con el servicio. Intentá nuevamente." : (ex as Error).message)
    } finally {
      setPassword("")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="AbogacIA" className="h-20 w-20 object-contain mx-auto mb-4" />
          <h1 className="font-display font-extrabold text-3xl text-[#102247]">{admin ? "Acceso de administrador" : t("auth.signIn")}</h1>
          <p className="text-[#657084] mt-2 text-sm">{t("auth.accessYourAbogaciaAccount")}</p>
        </div>

        {!admin && pendingContact && (
          <div className="mb-4">
            <Alert kind="info">Iniciá sesión como ciudadano: después se abre el formulario para contactar a {pendingContact.name}.</Alert>
          </div>
        )}
        {location.state?.bajaExitosa && (
          <div className="mb-4">
            <Alert kind="ok">Baja registrada correctamente. Tu sesión se cerró.</Alert>
          </div>
        )}

        <div className={`${card} p-7`}>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!admin && (
              <div>
                <span className="block text-xs font-semibold text-[#34445f] mb-1.5">{t("auth.accountType")}</span>
                <div role="radiogroup" aria-label={t("auth.accountType")} className="grid grid-cols-2 gap-1 rounded-xl border border-[#d8d2c4] bg-[#fbf8ef] p-1">
                  {(
                    [
                      ["CIUDADANO", t("auth.iMACitizen")],
                      ["ABOGADO", t("auth.iMALawyer")],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={tipo === value}
                      onClick={() => {
                        setTipo(value)
                        setError("")
                      }}
                      className={`h-10 rounded-lg text-sm font-semibold transition-colors ${tipo === value ? "bg-[#102247] text-white" : "text-[#4a586e] hover:text-[#102247]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <InputField label={t("common.email")} id="email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" autoComplete="email" />
            <InputField label={t("auth.password")} id="password" type="password" value={password} onChange={setPassword} placeholder={t("auth.yourPassword")} autoComplete="current-password" />

            {error && (
              <Alert>
                {error} {!admin && "Si todavía no confirmaste tu email o no validaste tu identidad, tu cuenta sigue pendiente."}
              </Alert>
            )}

            <button type="submit" disabled={loading} className={primaryButton}>
              {loading ? (
                <>
                  <Spinner /> {t("auth.signingIn")}
                </>
              ) : (
                t("auth.login")
              )}
            </button>
          </form>

          {!admin && (
            <div className="mt-5 pt-5 border-t border-[#d8d2c4]/40 text-center space-y-2">
              <p className="text-sm text-[#657084]">
                {t("auth.donTHaveAnAccount")}{" "}
                <button onClick={() => navigate(tipo === "CIUDADANO" ? "register-citizen" : "register-lawyer")} className="text-[#926315] hover:underline font-medium">
                  {t("auth.registerForFree")}
                </button>
              </p>
              <p className="text-xs text-[#657084]">
                ¿Te falta validar tu identidad?{" "}
                <button onClick={() => navigate(tipo === "CIUDADANO" ? "verify-citizen" : "register-lawyer")} className="text-[#1f5f9b] hover:underline font-medium">
                  Retomar la verificación
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
