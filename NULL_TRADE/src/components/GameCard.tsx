import { useState, useEffect } from 'preact/hooks'
import ghostoftsushima from '../assets/ghostoftsushima.webp'
import { getGames, getGame, type Game } from '../services/api'
import { addItem } from '../store/cart'
import { toast } from "sonner"

import {
  IconAction,
  IconRPG,
  IconStrategy,
  IconMetroidvania,
  IconRoguelike,
  IconSandbox,
  IconTactic,
  IconRacing,
  AddCartIcon
} from './Icons'

interface GenreStyle {
  icon: typeof IconAction
  color: string
  bg: string
  border: string
}

const genreStyles: Record<string, GenreStyle> = {
  'Acción':        { icon: IconAction,      color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)',  border: 'rgba(239, 68, 68, 0.5)' },
  'RPG':           { icon: IconRPG,          color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.5)' },
  'Estrategia':    { icon: IconStrategy,     color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.5)' },
  'Metroidvania':  { icon: IconMetroidvania, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.5)' },
  'Roguelike':     { icon: IconRoguelike,    color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.5)' },
  'Sandbox':       { icon: IconSandbox,      color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 0.5)' },
  'Shooter táctico': { icon: IconTactic,     color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)',  border: 'rgba(244, 63, 94, 0.5)' },
  'Carreras':      { icon: IconRacing,       color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)',  border: 'rgba(6, 182, 212, 0.5)' },
}

let cachedGames: Game[] | null = null

export function useGames(): { games: Game[]; error: string | null } {
  const [games, setGames] = useState<Game[]>(cachedGames || [])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedGames) return
    getGames().then(data => {
      cachedGames = data
      setGames(data)
    }).catch(() => setError('No se pudo conectar con el servidor. Verifica que la API esté activa.'))
  }, [])

  return { games, error }
}

export function useGame(id: string): { game: Game | undefined; error: string | null } {
  const [game, setGame] = useState<Game | undefined>(() => {
    if (cachedGames) return cachedGames.find(g => g.id === id)
    return undefined
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (game) return
    getGame(id).then(setGame).catch(() => setError('No se pudo cargar el juego. Verifica que la API esté activa.'))
  }, [id])

  return { game, error }
}

export function getGameImage(image: string): string {
  try {
    return new URL(`/src/assets/${image}`, import.meta.url).href
  } catch {
    return ghostoftsushima
  }
}

function GenreBadge({ genre }: { genre: string }) {
  const style = genreStyles[genre]
  if (!style) return null
  const Icon = style.icon
  return (
    <span className="text-[12px] mt-1 px-1.5 py-0.5 rounded w-fit inline-flex items-center gap-1" style={{ color: style.color, backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
      <Icon width={15} height={15} />
    </span>
  )
}

export function GameCard({ game }: { game: Game }) {
  const handleAddToCart = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id: game.id, title: game.title, price: game.price, type: 'game', subtitle: game.platform })
    toast(`${game.title} agregado al carrito`)
  }

  return (
    <a href={`/videogames/${game.id}`} className="group flex border border-(--border) rounded bg-(--bg) overflow-hidden transition-shadow duration-200 hover:shadow-(--shadow) hover:border-(--accent-border) no-underline">
      <div className="shrink-0 overflow-hidden bg-(--bg)">
        <img src={getGameImage(game.image)} alt={game.title} className="w-24 h-30 object-cover transition-transform duration-200 group-hover:scale-105 drop-shadow-[0_0_4px_rgba(103,58,184,0.5)]" />
      </div>
      <div className="flex flex-col justify-center px-3 py-2 min-w-0 flex-1">
        <h3 className="font-bold text-(--text-h) text-sm leading-tight truncate">{game.title}</h3>
        <p className="text-(--text) text-xs mt-0.5">{game.platform}</p>
        <GenreBadge genre={game.genre} />
        <div className="flex items-center justify-between mt-1">
          <p className="text-(--accent) text-sm font-bold">${game.price.toLocaleString('es-CL')}</p>
          <button onClick={handleAddToCart} className="text-[10px] px-2 py-1 rounded bg-(--accent-bg) text-(--accent) border border-(--accent-border) cursor-pointer hover:bg-(--accent) hover:text-white transition-all active:scale-95">
            <AddCartIcon height={15} width={15} />
          </button>
        </div>
      </div>
    </a>
  )
}
