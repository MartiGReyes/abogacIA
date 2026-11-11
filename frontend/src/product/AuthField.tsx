import type { ReactNode } from "react"

/** Campo de formulario con el estilo de las pantallas de cuenta del diseño. */
export function InputField({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  disabled,
  hint,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  autoComplete?: string
  disabled?: boolean
  hint?: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#34445f] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-[#fbf8ef] border rounded-xl px-4 py-3 text-sm text-[#102247] placeholder-[#6b7587] focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${
          error ? "border-red-500/70" : "border-[#d8d2c4] focus:border-[#94651c]/70"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[#5d6777]">
          {hint}
        </p>
      )}
    </div>
  )
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "info"; children: ReactNode }) {
  const tone =
    kind === "ok"
      ? "bg-emerald-500/10 border-emerald-600/30 text-emerald-800"
      : kind === "info"
        ? "bg-[#eef1f5] border-[#1f5f9b]/25 text-[#1f5f9b]"
        : "bg-red-500/10 border-red-500/30 text-red-700"
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`border rounded-xl px-4 py-3 text-sm ${tone}`}>
      {children}
    </div>
  )
}

export const Spinner = () => <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />

export const primaryButton =
  "w-full bg-[#102247] hover:bg-[#1b3566] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
export const card = "bg-white border border-[#d8d2c4]/60 rounded-2xl shadow-sm shadow-[#102247]/5"
