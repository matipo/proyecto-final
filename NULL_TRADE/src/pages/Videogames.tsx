import { useState } from 'preact/hooks'
import { GameCard, useGames } from '../components/GameCard'
import { PageLayout } from '../components/PageLayout'

export function Videogames({ path: _path }: { path?: string }) {
  const { games: allGames, error } = useGames()
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')

  const genres = [...new Set(allGames.map(g => g.genre))].sort()

  const filtered = allGames.filter(g => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase())
    const matchGenre = !selectedGenre || g.genre === selectedGenre
    return matchSearch && matchGenre
  })

  return (
    <PageLayout>
      <section className="p-6 max-lg:p-4" aria-label="Catálogo de videojuegos">
        <h1 className="font-bold text-(--text-h) text-2xl mb-6 max-lg:text-xl">Catálogo de videojuegos</h1>

        <div className="flex gap-3 mb-6 max-lg:flex-col">
          <input id="game-search" type="text" placeholder="Buscar juego..." value={search} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} className="flex-1 px-3 py-2 rounded border border-(--border) bg-(--bg) text-(--text-h) text-sm outline-none focus:border-(--accent-border) focus:shadow-[0_0_8px_var(--accent-bg)] transition-all" />
          <select id="genre-filter" value={selectedGenre} onChange={(e) => setSelectedGenre((e.target as HTMLSelectElement).value)} className="px-3 py-2 rounded border border-(--border) bg-(--bg) text-(--text-h) text-sm outline-none focus:border-(--accent-border) focus:shadow-[0_0_8px_var(--accent-bg)] transition-all cursor-pointer">
            <option value="">Todos los géneros</option>
            {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {error ? (
            <div className="col-span-full border border-red-800 rounded p-4 bg-red-950/30 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : (
            filtered.map(game => <GameCard key={game.id} game={game} />)
          )}
        </div>

        {filtered.length === 0 && <p className="text-(--text) text-sm text-center mt-8">No se encontraron juegos.</p>}
      </section>
    </PageLayout>
  )
}
