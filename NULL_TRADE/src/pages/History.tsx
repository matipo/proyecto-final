import { useState, useEffect } from 'preact/hooks'
import { getOrders, type Order } from '../services/api'

function OrderCard({ order }: { order: Order }) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="border border-(--border) rounded p-4 bg-(--bg) hover:border-(--accent-border) transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-(--text)">Orden #{String(order.id).slice(0, 8)}</p>
          <p className="text-xs text-(--text) mt-1">{formatDate(order.created_at)}</p>
        </div>
        <span className="text-sm font-bold text-(--accent)">${Number(order.total).toLocaleString('es-CL')}</span>
      </div>

      <div className="border-t border-(--border) pt-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between items-center text-xs py-1">
            <span className="text-(--text-h) truncate flex-1">{item.title}</span>
            <span className="text-(--text) mx-2">x{item.quantity}</span>
            <span className="text-(--text)">${Number(item.price * item.quantity).toLocaleString('es-CL')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function History({ path: _path }: { path?: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getOrders()
      .then(setOrders)
      .catch(() => setError('No se pudieron cargar las órdenes'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="pt-13">
      <main className="w-281.5 max-w-full mx-auto border-x border-(--border) min-h-svh flex flex-col box-border">
        <section className="p-6 max-lg:p-4">
          <h1 className="font-bold text-(--text-h) text-2xl max-lg:text-xl">Historial de Compras</h1>
        </section>

        {loading ? (
          <p className="text-(--text) text-sm text-center p-8">Cargando...</p>
        ) : error ? (
          <div className="border border-red-800 rounded p-4 bg-red-950/30 text-center mx-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-(--text) text-sm">No hay órdenes registradas</p>
          </div>
        ) : (
          <div className="px-6 pb-6 max-lg:px-4 flex flex-col gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
