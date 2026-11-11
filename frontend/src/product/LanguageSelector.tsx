import { useEffect, useId, useRef, useState } from "react"
import { languages, setLocale, t } from "../i18n/core"
import { useLocale } from "../i18n/useLocale"
import { Icon } from "./Icon"

export function LanguageSelector({ onOpen }: { onOpen?: () => void }) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()
  const selected = languages.findIndex((language) => language.locale === locale)
  function close(restore = false) {
    setOpen(false)
    if (restore) trigger.current?.focus()
  }
  function show(index = selected) {
    onOpen?.()
    setOpen(true)
    requestAnimationFrame(() => options.current[index]?.focus())
  }
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        close(true)
      }
    }
    document.addEventListener("pointerdown", outside)
    root.current?.addEventListener("keydown", escape)
    const element = root.current
    return () => {
      document.removeEventListener("pointerdown", outside)
      element?.removeEventListener("keydown", escape)
    }
  }, [open])
  return (
    <div
      className="language-selector"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false)
      }}
    >
      <button
        ref={trigger}
        className="ui-button ui-button--ghost language-trigger"
        type="button"
        aria-label={`${t("language.choose")}: ${languages[selected].name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            show(event.key === "ArrowUp" ? languages.length - 1 : selected)
          }
        }}
      >
        <Icon name="globe" />
        <span>{languages[selected].code}</span>
        <Icon name="down" />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={t("language.menu")}
          className="language-menu"
          onKeyDown={(event) => {
            const index = options.current.indexOf(
              document.activeElement as HTMLButtonElement,
            )
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              options.current[index]?.click()
              return
            }
            let next: number | undefined
            if (event.key === "ArrowDown") next = (index + 1) % languages.length
            if (event.key === "ArrowUp")
              next = (index - 1 + languages.length) % languages.length
            if (event.key === "Home") next = 0
            if (event.key === "End") next = languages.length - 1
            if (next !== undefined) {
              event.preventDefault()
              options.current[next]?.focus()
            } else if (
              event.key.length === 1 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              const match = languages.findIndex((language) =>
                language.name
                  .toLocaleLowerCase()
                  .startsWith(event.key.toLocaleLowerCase()),
              )
              if (match >= 0) {
                event.preventDefault()
                options.current[match]?.focus()
              }
            }
          }}
        >
          {languages.map((language, index) => (
            <button
              key={language.locale}
              type="button"
              ref={(element) => {
                options.current[index] = element
              }}
              role="menuitemradio"
              aria-checked={language.locale === locale}
              lang={language.locale}
              tabIndex={-1}
              onClick={() => {
                setLocale(language.locale)
                setAnnouncement(
                  t("language.changed", { language: language.name }),
                )
                close(true)
              }}
            >
              <span>{language.name}</span>
              {language.locale === locale && <Icon name="check" />}
            </button>
          ))}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
