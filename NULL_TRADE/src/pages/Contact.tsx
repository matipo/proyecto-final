import { PageLayout } from '../components/PageLayout'

const CONTACTS = [
  { title: 'Soporte Técnico', email: 'soporte@nulltrade.cl', note: 'Respuesta en 24-48 horas hábiles.' },
  { title: 'Ventas y Transacciones', email: 'ventas@nulltrade.cl', note: 'Consultas sobre compras, ventas y tradeos.' },
  { title: 'Reportar un Problema', email: 'reportes@nulltrade.cl', note: 'Fraude, estafas o conducta indebida.' },
  { title: 'Redes Sociales', email: 'Discord: NULL_TRADE', note: 'Comunidad y soporte en tiempo real.' },
]

export function Contact({ path: _path }: { path?: string }) {
  return (
    <PageLayout>
      <article className="p-6 max-lg:p-4 text-(--text) text-sm leading-relaxed">
        <h1 className="font-bold text-(--text-h) text-2xl mb-6 max-lg:text-xl">Contacto</h1>
        <p className="mb-6">¿Tienes preguntas, sugerencias o necesitas soporte? Estamos aquí para ayudarte.</p>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          {CONTACTS.map(c => (
            <div key={c.title} className="border border-(--border) rounded p-4">
              <h2 className="font-bold text-(--text-h) text-base mb-1">{c.title}</h2>
              <p>{c.email}</p>
              <p className="text-(--text) mt-1">{c.note}</p>
            </div>
          ))}
        </div>
      </article>
    </PageLayout>
  )
}
