import { useState, useEffect } from 'preact/hooks'
import { type ComponentChildren } from 'preact'
import { getCommunity, createCommunityItem } from '../services/api'
import { Gamepad, Arrowright, CheckIcon } from '../components/Icons'
import { addItem, type CartItemType } from '../store/cart'
import { toast } from "sonner"
import { Dialog } from '../components/Dialog'

type SectionId = 'cuentas' | 'skins' | 'tradeos'

const SECTIONS: { id: SectionId; title: string; description: string }[] = [
  { id: 'cuentas', title: 'Cuentas', description: 'Cuentas de juego disponibles para compra' },
  { id: 'skins', title: 'Skins', description: 'Skins y cosméticos para intercambiar' },
  { id: 'tradeos', title: 'Tradeos', description: 'Intercambios entre jugadores' },
]

function AddToCartButton({ id, title, price, type, subtitle }: { id: string; title: string; price: number; type: CartItemType; subtitle: string }) {
  return (
    <button
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        addItem({ id, title, price, type, subtitle })
        toast(`${title} agregado al carrito`)
      }}
      className="mt-2 w-full py-1.5 text-[11px] font-bold rounded bg-(--accent) text-white cursor-pointer hover:opacity-90 active:scale-95 transition-all"
    >
      AGREGAR_AL_CARRITO
    </button>
  )
}

type FieldType = 'text' | 'number'

function CreatePostDialog({ sectionId, onCreated }: { sectionId: SectionId; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const FIELDS: Record<SectionId, { key: string; label: string; type: FieldType }[]> = {
    cuentas: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'platform', label: 'Plataforma', type: 'text' },
      { key: 'level', label: 'Nivel', type: 'text' },
      { key: 'seller', label: 'Vendedor', type: 'text' },
      { key: 'price', label: 'Precio', type: 'number' },
    ],
    skins: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'game', label: 'Juego', type: 'text' },
      { key: 'rarity', label: 'Rareza', type: 'text' },
      { key: 'seller', label: 'Vendedor', type: 'text' },
      { key: 'price', label: 'Precio', type: 'number' },
    ],
    tradeos: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'offer', label: 'Ofreces', type: 'text' },
      { key: 'want', label: 'Buscas', type: 'text' },
      { key: 'user', label: 'Tu usuario', type: 'text' },
      { key: 'steam_trade_url', label: 'URL de intercambio de Steam', type: 'text' },
    ],
  }

  const typeMap: Record<SectionId, string> = { cuentas: 'account', skins: 'skin', tradeos: 'trade' }
  const fields = FIELDS[sectionId] || []

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { type: typeMap[sectionId], ...form }
      if (payload.price) payload.price = Number(payload.price)
      await createCommunityItem(payload)
      toast('Publicación creada')
      setForm({})
      setOpen(false)
      onCreated()
    } catch {
      toast.error('Error al crear')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-4 px-3 py-1 text-[11px] font-bold rounded bg-(--accent-bg) text-(--accent) border border-(--accent-border) cursor-pointer hover:bg-(--accent) hover:text-white transition-all active:scale-95"
      >
        + CREAR
      </button>

      <Dialog open={open} onClose={() => { setOpen(false); setForm({}) }} title={`Crear ${SECTIONS.find(s => s.id === sectionId)?.title}`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-xs text-(--text)">
                {f.label}
                <input
                  type={f.type}
                  required={f.key !== 'level' && f.key !== 'steam_trade_url'}
                  value={form[f.key] || ''}
                  onInput={(e) => setForm({ ...form, [f.key]: (e.target as HTMLInputElement).value })}
                  className="px-2 py-1.5 rounded border border-(--border) bg-(--bg) text-(--text-h) text-xs focus:outline-none focus:border-(--accent)"
                  placeholder={f.key === 'steam_trade_url' ? 'https://steamcommunity.com/tradeoffer/...' : undefined}
                />
                {f.key === 'steam_trade_url' && (
                  <a
                    href="https://steamcommunity.com/profiles/76561198972581169/tradeoffers/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-(--accent) hover:underline"
                  >
                    ¿No sabes dónde sacar tu link de intercambio?
                  </a>
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-[11px] font-bold rounded bg-(--accent) text-white cursor-pointer hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? 'CREANDO...' : 'PUBLICAR'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setForm({}) }}
              className="px-4 py-1.5 text-[11px] font-bold rounded border border-(--border) text-(--text) cursor-pointer hover:bg-(--bg-hover) transition-all"
            >
              CANCELAR
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

function AccountCard({ item }: { item: Record<string, string | number> }) {
  return (
    <div className="border border-(--border) rounded p-4 bg-(--bg) hover:border-(--accent-border) hover:shadow-(--shadow) transition-all">
      <h3 className="font-bold text-(--text-h) text-sm truncate">{item.title}</h3>
      <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-(--text)">
        <p>Plataforma: <span className="text-(--text-h)">{item.platform}</span></p>
        {item.level && <p>Nivel: <span className="text-(--text-h)">{item.level}</span></p>}
        <p>Vendedor: <span className="text-(--text-h)">{item.seller}</span></p>
      </div>
      <p className="text-(--accent) font-bold text-sm mt-2">${Number(item.price).toLocaleString('es-CL')}</p>
      <AddToCartButton id={`account-${item.id}`} title={String(item.title)} price={Number(item.price)} type="account" subtitle={String(item.platform)} />
    </div>
  )
}

function SkinCard({ item }: { item: Record<string, string | number> }) {
  return (
    <div className="border border-(--border) rounded p-4 bg-(--bg) hover:border-(--accent-border) hover:shadow-(--shadow) transition-all">
      <h3 className="font-bold text-(--text-h) text-sm truncate">{item.title}</h3>
      <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-(--text)">
        <p>Juego: <span className="text-(--text-h)">{item.game}</span></p>
        <p>Rareza: <span className="text-(--accent)">{item.rarity}</span></p>
        <p>Vendedor: <span className="text-(--text-h)">{item.seller}</span></p>
      </div>
      <p className="text-(--accent) font-bold text-sm mt-2">${Number(item.price).toLocaleString('es-CL')}</p>
      <AddToCartButton id={`skin-${item.id}`} title={String(item.title)} price={Number(item.price)} type="skin" subtitle={String(item.game)} />
    </div>
  )
}

function TradeCard({ item }: { item: Record<string, string | number> }) {
  const [proposed, setProposed] = useState(false)

  const handlePropose = (e: MouseEvent) => {
    e.preventDefault()
    const url = String(item.steam_trade_url || '')
    if (url && url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    setProposed(true)
    toast(`Intercambio propuesto: ${item.offer} → ${item.want}`)
  }

  return (
    <div className="border border-(--border) rounded p-4 bg-(--bg) hover:border-(--accent-border) hover:shadow-(--shadow) transition-all">
      <h3 className="font-bold text-(--text-h) text-sm truncate">{item.title}</h3>
      <div className="flex items-center gap-2 mt-1.5 text-xs">
        <span className="px-2 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800">{item.offer}</span>
        <Arrowright width={14} height={14} />
        <span className="px-2 py-0.5 rounded bg-(--accent-bg) text-(--accent) border border-(--accent-border)">{item.want}</span>
      </div>
      <p className="text-xs text-(--text) mt-2">Por <span className="text-(--text-h)">{item.user}</span></p>
      {proposed ? (
        <button disabled className="mt-2 w-full py-1.5 text-[11px] font-bold rounded bg-green-900/40 text-green-400 border border-green-800 cursor-default flex items-center justify-center gap-1">
          <CheckIcon width={14} height={14} fill="#4ade80" /> PROPUESTO
        </button>
      ) : (
        <button
          onClick={handlePropose}
          className="mt-2 w-full py-1.5 text-[11px] font-bold rounded bg-(--accent-bg) text-(--accent) border border-(--accent-border) cursor-pointer hover:bg-(--accent) hover:text-white transition-all active:scale-95"
        >
          PROPONER_INTERCAMBIO
        </button>
      )}
    </div>
  )
}

const RENDERERS: Record<SectionId, (item: Record<string, string | number>) => ComponentChildren> = {
  cuentas: (item) => <AccountCard item={item} />,
  skins: (item) => <SkinCard item={item} />,
  tradeos: (item) => <TradeCard item={item} />,
}

function CommunitySection({ section, items, onCreated }: { section: typeof SECTIONS[0]; items: Record<string, string | number>[]; onCreated: () => void }) {
  const Icon = Gamepad
  const CardRenderer = RENDERERS[section.id]

  return (
    <section id={section.id} className="p-6 max-lg:p-4">
      <div className="flex items-center gap-3 max-lg:justify-center">
        <Icon className="max-lg:mx-auto" />
        <h2 className="font-bold text-[24px] leading-[118%] tracking-[-0.24px] text-(--text-h) max-lg:text-[20px]">{section.title}</h2>
        <CreatePostDialog sectionId={section.id} onCreated={onCreated} />
      </div>
      <p className="m-0 text-(--text) mt-2 max-lg:text-center">{section.description}</p>

      <div className="grid grid-cols-3 gap-3 mt-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {items.length > 0 ? (
          items.map((card, i) => CardRenderer ? <div key={String(card.id || i)}>{CardRenderer(card)}</div> : null)
        ) : (
          <p className="col-span-full text-center text-(--text) text-xs py-4">No hay publicaciones aún</p>
        )}
      </div>
    </section>
  )
}

export function Community({ path: _path }: { path?: string }) {
  const [data, setData] = useState<Record<SectionId, Record<string, string | number>[]>>({
    cuentas: [],
    skins: [],
    tradeos: [],
  })
  const [error, setError] = useState<string | null>(null)

  const fetchData = () => {
    setError(null)
    getCommunity()
      .then((sections) => {
        const grouped: Record<SectionId, Record<string, string | number>[]> = {
          cuentas: [],
          skins: [],
          tradeos: [],
        }
        sections.forEach((section) => {
          if (grouped[section.id as SectionId]) {
            grouped[section.id as SectionId] = section.items
          }
        })
        setData(grouped)
      })
      .catch(() => setError('No se pudo conectar con el servidor. Verifica que la API esté activa.'))
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="pt-13">
      <main className="w-281.5 max-w-full mx-auto border-x border-(--border) min-h-svh flex flex-col box-border">
        <section className="p-6 max-lg:p-4">
          <h1 className="font-bold text-(--text-h) text-2xl max-lg:text-xl">Comunidad</h1>
        </section>

        {error && (
          <div className="border border-red-800 rounded p-4 bg-red-950/30 text-center mx-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {SECTIONS.map((section, i) => (
          <div key={section.id}>
            <CommunitySection section={section} items={data[section.id]} onCreated={fetchData} />
            {i < SECTIONS.length - 1 && <div className="border-t border-(--border)" />}
          </div>
        ))}
      </main>
    </div>
  )
}
