import { useEffect, useRef, useState } from 'react'
import { Avatar, Icon, Wordmark, logoImg, useEscape, type Page, type User } from './ui'

// ─── Navbar ───────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; target: string }[] = [
  { label: 'Abogados', target: 'abogados' },
  { label: 'Lexi', target: 'lexi' },
  { label: 'Cómo funciona', target: 'como-funciona' },
  { label: 'Para abogados', target: 'profesionales' },
]

export default function Navbar({ navigate, user, onLogout, onSection }: { navigate: (p: Page) => void; user: User | null; onLogout: () => void; onSection: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!userMenuOpen) return
    const onDown = (e: MouseEvent) => { if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [userMenuOpen])

  useEscape(userMenuOpen || menuOpen, () => { setUserMenuOpen(false); setMenuOpen(false) })

  const solid = scrolled || menuOpen

  return (
    <nav aria-label="Principal" className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 border-b ${solid ? 'bg-navy-950/85 backdrop-blur-xl border-line' : 'bg-transparent border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
        <button onClick={() => navigate('home')} className="flex items-center gap-2.5 shrink-0 rounded-lg" aria-label="AbogacIA, ir al inicio">
          <Avatar src={logoImg} className="w-8 h-8" />
          <Wordmark />
        </button>

        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <button key={item.label} onClick={() => onSection(item.target)} className="text-sm font-medium text-ink-2 hover:text-ink px-3 py-2 rounded-lg transition-colors">{item.label}</button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(o => !o)} aria-expanded={userMenuOpen} aria-haspopup="menu" className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 border border-line-strong hover:bg-white/5 transition-colors">
                <span className="w-7 h-7 rounded-full bg-gold-500 text-[#0b1020] text-[11px] font-bold grid place-items-center">{user.nombre[0]}{user.apellido[0]}</span>
                <span className="text-sm font-semibold">{user.nombre}</span>
                <Icon name="chevron" className={`w-4 h-4 text-ink-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div role="menu" className="fade-in absolute right-0 mt-2 w-64 card p-1.5 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.8)]">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold">{user.nombre} {user.apellido}</p>
                    <p className="text-xs text-ink-3 truncate">{user.email}</p>
                  </div>
                  <div className="h-px bg-line my-1" />
                  {[
                    { label: 'Mis datos', icon: 'user' as const, page: 'profile' as Page },
                    { label: 'Historial de consultas', icon: 'list' as const, page: 'history' as Page },
                  ].map(item => (
                    <button role="menuitem" key={item.label} onClick={() => { navigate(item.page); setUserMenuOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-2 hover:text-ink hover:bg-white/5">
                      <Icon name={item.icon} className="w-4 h-4" />{item.label}
                    </button>
                  ))}
                  <div className="h-px bg-line my-1" />
                  <button role="menuitem" onClick={() => { onLogout(); setUserMenuOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-2 hover:text-err hover:bg-white/5">
                    <Icon name="logout" className="w-4 h-4" />Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button onClick={() => navigate('login')} className="btn btn-ghost btn-sm">Iniciar sesión</button>
              <button onClick={() => navigate('register-citizen')} className="btn btn-primary btn-sm">Registrarme</button>
            </>
          )}
        </div>

        <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} className="md:hidden btn btn-ghost w-11 px-0 -mr-2">
          <Icon name={menuOpen ? 'close' : 'menu'} className="w-6 h-6" />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fade-in border-t border-line px-5 pt-2 pb-5">
          {NAV_ITEMS.map(item => (
            <button key={item.label} onClick={() => { onSection(item.target); setMenuOpen(false) }} className="w-full text-left py-3 text-[15px] font-medium text-ink-2 hover:text-ink border-b border-line">{item.label}</button>
          ))}
          <div className="pt-4 grid grid-cols-2 gap-2">
            {user ? (
              <>
                <button onClick={() => { navigate('profile'); setMenuOpen(false) }} className="btn btn-secondary">Mis datos</button>
                <button onClick={() => { navigate('history'); setMenuOpen(false) }} className="btn btn-secondary">Historial</button>
                <button onClick={() => { onLogout(); setMenuOpen(false) }} className="btn btn-ghost col-span-2">Cerrar sesión</button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate('login'); setMenuOpen(false) }} className="btn btn-secondary">Iniciar sesión</button>
                <button onClick={() => { navigate('register-citizen'); setMenuOpen(false) }} className="btn btn-primary">Registrarme</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
