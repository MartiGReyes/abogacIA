import { t } from "../i18n/core"
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { createPortal } from "react-dom"
import { Icon } from "./Icon"
export { Icon } from "./Icon"
import { LanguageSelector } from "./LanguageSelector"

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`ui-button ui-button--${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export function Heading({
  level = 2,
  children,
  className = "",
}: {
  level?: 1 | 2 | 3
  children: ReactNode
  className?: string
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3"
  return (
    <Tag className={`ui-heading ui-heading--${level} ${className}`}>
      {children}
    </Tag>
  )
}
export function Card({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`ui-card ${className}`} {...props}>
      {children}
    </section>
  )
}
export function Badge({
  children,
  state = "",
}: {
  children: ReactNode
  state?: string
}) {
  const tone = ["Finalizada", "Cobrado", "Publicado", "Verificada"].includes(
    state,
  )
    ? "success"
    : ["Pendiente", "Borrador"].includes(state)
      ? "warning"
      : state === "Rechazada"
        ? "error"
        : "neutral"
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>
}
export function Field({
  label,
  error,
  help,
  multiline,
  children,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  help?: string
  multiline?: boolean
  children?: ReactNode
}) {
  const autoId = useId(),
    id = props.id || autoId,
    infoId = `${id}-info`
  return (
    <div className="ui-field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      {children ||
        (multiline ? (
          <textarea
            {...props as TextareaHTMLAttributes<HTMLTextAreaElement>}
            rows={4}
            id={id}
            aria-invalid={!!error}
            aria-describedby={error || help ? infoId : undefined}
          />
        ) : (
          <input
            {...props}
            id={id}
            aria-invalid={!!error}
            aria-describedby={error || help ? infoId : undefined}
          />
        ))}
      {(error || help) && (
        <p id={infoId} className={error ? "ui-error" : "ui-muted"}>
          {error ? t(error) : help}
        </p>
      )}
    </div>
  )
}
export function Select({
  label,
  children,
  error,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
}) {
  const autoId = useId(),
    id = props.id || autoId
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      <select
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {children}
      </select>
      {error && (
        <p className="ui-error" id={`${id}-error`}>
          {t(error)}
        </p>
      )}
    </div>
  )
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="ui-empty">
      <span className="ui-icon-tile">
        <Icon name="cases" />
      </span>
      <Heading level={3}>{title}</Heading>
      <p className="ui-muted">{children}</p>
      {action}
    </div>
  )
}
const modalStack: symbol[] = []
let originalBodyOverflow = ""
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const dialog = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose),
    titleId = useId()
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    if (!modalStack.length) originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const token = Symbol("modal")
    modalStack.push(token)
    const focusable = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length > 0)
    dialog.current?.focus()
    function key(e: KeyboardEvent) {
      if (modalStack[modalStack.length - 1] !== token) return
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopImmediatePropagation()
        closeRef.current()
      }
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1]
        if (!items.length) {
          e.preventDefault()
          return
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault()
          last?.focus()
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener("keydown", key)
    return () => {
      const wasTop = modalStack[modalStack.length - 1] === token
      const index = modalStack.indexOf(token)
      if (index !== -1) modalStack.splice(index, 1)
      document.removeEventListener("keydown", key)
      document.body.style.overflow = modalStack.length
        ? "hidden"
        : originalBodyOverflow
      if (wasTop && previous?.isConnected) previous.focus()
    }
  }, [])
  return createPortal(
    <div className="ui-modal-backdrop">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`ui-modal ${wide ? "ui-modal--wide" : ""}`}
      >
        <header className="ui-modal-header">
          <h2 id={titleId} className="ui-heading ui-heading--2">
            {title}
          </h2>
          <LanguageSelector />
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label={t("common.closeWindow")}
          >
            <Icon name="close" />
          </Button>
        </header>
        <div className="ui-modal-content">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
