import { AuthLayout, Icon, type Page } from '../ui'

const ITEMS = [
  { ok: true, title: 'Identidad validada', text: 'DNI y selfie verificados por Didit' },
  { ok: true, title: 'Email confirmado', text: 'Verificamos que la dirección es tuya' },
  { ok: false, title: 'Matrícula pendiente de revisión', text: 'La verificaremos con el Colegio de Abogados para activar tu perfil' },
]

export default function LawyerPendingPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <AuthLayout title="Tu cuenta profesional está creada" subtitle="Para publicar tu perfil y recibir consultas falta verificar tu matrícula. Hasta entonces no podrás iniciar sesión como profesional.">
      <ul className="card divide-y divide-line">
        {ITEMS.map(i => (
          <li key={i.title} className="flex items-center gap-4 px-5 py-4">
            <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${i.ok ? 'bg-ok/10 text-ok' : 'bg-gold-500/10 text-gold-400'}`}>
              <Icon name={i.ok ? 'check' : 'clock'} className="w-4.5 h-4.5" stroke={i.ok ? 2.25 : 1.75} />
            </span>
            <span><span className="block font-semibold text-[15px]">{i.title}</span><span className="block text-[13px] text-ink-3">{i.text}</span></span>
          </li>
        ))}
      </ul>
      <button onClick={() => navigate('home')} className="btn btn-primary btn-lg w-full mt-6">Ir al inicio</button>
    </AuthLayout>
  )
}
