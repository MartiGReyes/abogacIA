import { t, uiText } from "../i18n/core"
import { useEffect, useRef, useState } from "react"
import { useProduct } from "./Store"
import { Button, Heading, Icon, Modal } from "./UI"
import type { Page, SessionUser } from "./model"
import logoImg from "../imports/logoabogacIA.png"
import { LanguageSelector } from "./LanguageSelector"

type Link = { label: string; page?: Page; action: () => void }

export function Navigation({
  navigate,
  user,
  onLogout,
  page,
}: {
  navigate: (p: Page) => void
  user: SessionUser | null
  onLogout: () => void
  page?: Page
}) {
  const store = useProduct()
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState(false)
  const [help, setHelp] = useState(false)
  const [scrolled, setScrolled] = useState(window.scrollY > 12)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  useEffect(() => {
    if (!account) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setAccount(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAccount(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [account])
  const go = (p: Page) => {
    navigate(p)
    setOpen(false)
    setAccount(false)
  }
  const catalog = () => {
    store.setHomeSection("catalog")
    go("home")
  }
  const lexi = () => {
    setOpen(false)
    store.setChatOpen(true)
  }
  const links: Link[] =
    user?.role === "lawyer"
      ? [
          { label: "navigation.dashboard", page: "dashboard", action: () => go("dashboard") },
          { label: "dashboard.myCases", page: "cases", action: () => go("cases") },
          { label: "dashboard.statistics", page: "statistics", action: () => go("statistics") },
          { label: "navigation.myProfessionalProfile", page: "lawyer-profile", action: () => go("lawyer-profile") },
        ]
      : user?.role === "admin"
        ? [
            { label: "navigation.home", page: "home", action: () => go("home") },
            { label: "Panel administrativo", page: "admin", action: () => go("admin") },
          ]
        : [
            { label: "navigation.home", page: "home", action: () => go("home") },
            { label: user ? "navigation.findLawyers" : "navigation.lawyers", action: catalog },
            { label: user ? "home.consultLexi" : "navigation.legalGuidance", action: lexi },
            ...(user
              ? [
                  { label: "navigation.myConsultations", page: "consultations" as Page, action: () => go("consultations") },
                  { label: "Historial de Lexi", page: "history" as Page, action: () => go("history") },
                ]
              : [
                  {
                    label: "navigation.howItWorks",
                    action: () => {
                      setOpen(false)
                      setHelp(true)
                    },
                  },
                ]),
          ]
  const roleLabel = user?.role === "lawyer" ? t("navigation.lawyer") : user?.role === "admin" ? "Administrador" : t("auth.citizen")
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("navigation.skipToMainContent")}
      </a>
      <nav className={`product-nav ${scrolled ? "product-nav--scrolled" : ""}`} aria-label={t("navigation.mainNavigation")}>
        <div className="product-nav-inner">
          <Button variant="ghost" className="brand" onClick={() => go(user?.role === "lawyer" ? "dashboard" : "home")} aria-label={t("navigation.brandHome")}>
            <img src={logoImg} alt="" />
            <span>
              abogac<b>IA</b>
            </span>
          </Button>
          <div className="desktop-nav">
            {links.map((link) => (
              <Button
                key={link.label}
                variant="ghost"
                className={link.page && page === link.page ? "nav-active" : ""}
                aria-current={link.page && page === link.page ? "page" : undefined}
                onClick={link.action}
              >
                {uiText(link.label)}
              </Button>
            ))}
          </div>
          <div className="nav-account">
            <LanguageSelector onOpen={() => setAccount(false)} />
            {user ? (
              <div ref={menuRef} style={{ position: "relative" }}>
                <Button variant="ghost" className="account-button" aria-expanded={account} aria-haspopup="menu" onClick={() => setAccount((v) => !v)}>
                  <span className="nav-avatar">
                    {user.nombre[0]}
                    {user.apellido[0] ?? ""}
                  </span>
                  <span className="account-name">{user.nombre.split(" ")[0]}</span>
                  <Icon name="down" />
                </Button>
                {account && (
                  <div className="account-menu" role="menu">
                    <strong>
                      {user.nombre} {user.apellido}
                    </strong>
                    <small>
                      {roleLabel}
                      {user.cuentaPrueba ? " · cuenta de prueba" : ""}
                      {user.email ? ` · ${user.email}` : ""}
                    </small>
                    {user.role !== "admin" && (
                      <Button variant="ghost" role="menuitem" onClick={() => go(user.role === "lawyer" ? "lawyer-profile" : "profile")}>
                        {t("auth.myProfile")}
                      </Button>
                    )}
                    {user.role === "citizen" && (
                      <>
                        <Button variant="ghost" role="menuitem" onClick={() => go("consultations")}>
                          {t("navigation.myConsultations")}
                        </Button>
                        <Button variant="ghost" role="menuitem" onClick={() => go("history")}>
                          Historial de Lexi
                        </Button>
                      </>
                    )}
                    {user.role === "admin" && (
                      <Button variant="ghost" role="menuitem" onClick={() => go("admin")}>
                        Panel administrativo
                      </Button>
                    )}
                    <Button variant="ghost" role="menuitem" onClick={catalog}>
                      {t("navigation.exploreCatalogue")}
                    </Button>
                    <Button
                      variant="ghost"
                      role="menuitem"
                      onClick={() => {
                        setAccount(false)
                        setOpen(false)
                        onLogout()
                      }}
                    >
                      {t("navigation.signOut")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-nav">
                <Button variant="ghost" onClick={() => go("login")}>
                  {t("auth.login")}
                </Button>
                <Button variant="secondary" onClick={() => go("register-citizen")}>
                  {t("auth.register")}
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              className="mobile-menu-toggle"
              aria-label={open ? t("navigation.closeNavigationMenu") : t("navigation.openNavigationMenu")}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <Icon name={open ? "close" : "menu"} />
            </Button>
          </div>
        </div>
        {open && (
          <div className="mobile-nav">
            {links.map((link) => (
              <Button key={link.label} variant="ghost" onClick={link.action}>
                {uiText(link.label)}
              </Button>
            ))}
            {!user ? (
              <>
                <Button variant="ghost" onClick={() => go("login")}>
                  {t("auth.login")}
                </Button>
                <Button variant="secondary" onClick={() => go("register-citizen")}>
                  {t("auth.register")}
                </Button>
              </>
            ) : (
              <>
                {user.role === "citizen" && (
                  <Button variant="ghost" onClick={() => go("profile")}>
                    {t("auth.myProfile")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpen(false)
                    onLogout()
                  }}
                >
                  {t("navigation.signOut")}
                </Button>
              </>
            )}
          </div>
        )}
      </nav>
      {help && (
        <Modal title={t("navigation.howAbogaciaWorks")} onClose={() => setHelp(false)}>
          <ol className="how-it-works">
            <li>
              <Heading level={3}>{t("navigation.findYourSpecialty")}</Heading>
              <p>{t("navigation.searchByLegalAreaOrTalkToLexiFor")}</p>
            </li>
            <li>
              <Heading level={3}>{t("navigation.meetTheProfessionals")}</Heading>
              <p>Revisá su perfil, honorarios publicados y casos antes de elegir.</p>
            </li>
            <li>
              <Heading level={3}>Escribile por WhatsApp</Heading>
              <p>Iniciá sesión como ciudadano, completá el formulario y abrí el mensaje en WhatsApp. Queda guardado en Mis consultas.</p>
            </li>
          </ol>
          <Button
            onClick={() => {
              setHelp(false)
              catalog()
            }}
          >
            {t("navigation.exploreLawyers")} <Icon name="arrow" />
          </Button>
        </Modal>
      )}
    </>
  )
}
