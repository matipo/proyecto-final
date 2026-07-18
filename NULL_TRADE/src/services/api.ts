declare global {
  interface Window { __API_URL__?: string }
}

const BASE = window.__API_URL__ || 'http://localhost:8080'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export interface Game {
  id: string
  title: string
  price: number
  platform: string
  genre: string
  image: string
  description: string
  developer: string
  releaseYear: number
  rating: number
}

export interface CommunityItem {
  id: string
  title: string
  description: string
  icon: string
  items: Record<string, string | number>[]
}

export interface Order {
  id: string
  items: { id: string; title: string; price: number; quantity: number }[]
  total: number
  created_at: string
}

export function getGames(): Promise<Game[]> {
  return request<Game[]>('/games')
}

export function getGame(id: string): Promise<Game> {
  return request<Game>(`/games/${encodeURIComponent(id)}`)
}

export function getCommunity(): Promise<CommunityItem[]> {
  return request<CommunityItem[]>('/community')
}

export function createCommunityItem(data: Record<string, unknown>): Promise<{ ok: boolean; id: string }> {
  return request('/community', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getOrders(): Promise<Order[]> {
  return request<Order[]>('/checkout')
}
