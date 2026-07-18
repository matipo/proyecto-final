import heroImg from '../assets/icon.webp'
import { useGames, GameCard } from '../components/GameCard'
import { Gamepad, Arrowright, Facelaugh, CheckIcon } from '../components/Icons'
import { PageLayout } from '../components/PageLayout'

const STEPS = [
  { num: 1, title: 'Elige tu juego', text: 'Explora nuestro catálogo con precios en CLP. Filtra por género, plataforma o busca directamente el título que quieras.' },
  { num: 2, title: 'Agrega al carrito', text: 'Añade juegos, cuentas o skins a tu carrito. Paga de forma segura y recibe tus claves digitales al instante.' },
  { num: 3, title: 'Juega o intercambia', text: 'Activa tu juego y empieza a jugar, o únete a la comunidad para hacer trueques y encontrar ofertas exclusivas.' },
]


const FEATURES = [
  { title: 'Entrega instantánea', text: 'Recibe claves digitales en segundos tras la compra.' },
  { title: 'Sin comisiones en trueques', text: 'Intercambia directamente con otros jugadores.' },
  { title: 'Pagos en CLP', text: 'Todos los precios en pesos chilenos, sin sorpresas.' },
  { title: 'Comunidad verificada', text: 'Vendedores y cuentas con sistema de reputación.' },
]

export function Home({ path: _path }: { path?: string }) {
  const { games: allGames, error } = useGames()
  const featured = allGames.slice(0, 4)

  return (
    <PageLayout>
      <section className="flex flex-col gap-6.25 justify-center items-center grow p-8 max-lg:py-8 max-lg:px-5 max-lg:gap-4.5" aria-label="Inicio">
        <img src={heroImg} className="w-67.5" width="270" height="279" alt="NULL_TRADE logo" />
        <h1 className="font-bold text-[56px] tracking-[-1.68px] my-8 text-(--text-h) max-lg:text-[36px] max-lg:my-5">NULL_TRADE</h1>
        <p className="text-(--text) text-base max-w-md mx-auto max-lg:text-sm">Tu plataforma para comprar, vender e intercambiar videojuegos, cuentas, skins y más con la comunidad.</p>
        <button onClick={() => { window.location.href = '/videogames' }} className="active:scale-95 active:shadow-[0_0_5px_var(--glow-color)] bg-(--btn-primary) text-(--btn-primary-text) px-10 py-4 transition-all cursor-pointer hover:shadow-[0_0_30px_var(--glow-color)]">
          INITIALIZE_TERMINAL
        </button>
      </section>

      <section className="border-t border-(--border) p-8 max-lg:p-5">
        <h2 className="font-bold text-[24px] leading-[118%] tracking-[-0.24px] mb-2 text-(--text-h) max-lg:text-[20px]">Juegos destacados</h2>
        <p className="text-(--text) text-sm mb-6">Los títulos más buscados por la comunidad chilena</p>
        {error ? (
          <div className="border border-red-800 rounded p-4 bg-red-950/30 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
            {featured.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        )}
        <div className="mt-6 text-center">
          <a href="/videogames" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-(--social-bg) text-(--text-h) text-sm transition-shadow hover:shadow-(--shadow) no-underline">
            <Arrowright width={16} height={16} /> Ver todo el catálogo
          </a>
        </div>
      </section>

      <section className="border-t border-(--border) flex max-lg:flex-col max-lg:text-center">
        <div className="flex-1 p-8 border-r border-(--border) max-lg:border-r-0 max-lg:border-b max-lg:p-5">
          <Gamepad className="mb-4 max-lg:mx-auto" />
          <h2 className="font-bold text-[24px] leading-[118%] tracking-[-0.24px] mb-2 text-(--text-h) max-lg:text-[20px]">Videojuegos digitales y físicos</h2>
          <p className="text-(--text) m-0 text-sm">Compra títulos originales para PC, PlayStation, Xbox y Nintendo Switch. Claves digitales instantáneas o copias físicas con despacho a todo Chile.</p>
          <ul className="list-none p-0 flex gap-2 mt-6 max-lg:flex-wrap max-lg:justify-center">
            <li>
              <a href="/videogames" className="flex items-center gap-2 p-[6px_12px] rounded-md bg-(--social-bg) text-(--text-h) text-sm transition-shadow hover:shadow-(--shadow) no-underline">
                <Arrowright width={16} height={16} /> Explorar catálogo
              </a>
            </li>
          </ul>
        </div>
        <div className="flex-1 p-8 max-lg:p-5">
          <Facelaugh className="mb-4 max-lg:mx-auto" />
          <h2 className="font-bold text-[24px] leading-[118%] tracking-[-0.24px] mb-2 text-(--text-h) max-lg:text-[20px]">Comunidad y trueque</h2>
          <p className="text-(--text) m-0 text-sm">Vende cuentas verificadas, intercambia skins exclusivas y propone tradeos directos con otros jugadores. Sin intermediarios, sin comisiones.</p>
          <ul className="list-none p-0 flex gap-2 mt-6 max-lg:flex-wrap max-lg:justify-center">
            <li>
              <a href="/community" className="flex items-center gap-2 p-[6px_12px] rounded-md bg-(--social-bg) text-(--text-h) text-sm transition-shadow hover:shadow-(--shadow) no-underline">
                <Arrowright width={16} height={16} /> Ir a comunidad
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section className="border-t border-(--border) p-8 max-lg:p-5">
        <h2 className="font-bold text-[24px] leading-[118%] tracking-[-0.24px] mb-6 text-(--text-h) max-lg:text-[20px] text-center">¿Cómo funciona NULL_TRADE?</h2>
        <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1 max-lg:gap-5">
          {STEPS.map(step => (
            <div key={step.num} className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-(--accent-bg) border border-(--accent-border) flex items-center justify-center text-(--accent) font-bold text-xl">{step.num}</div>
              <h3 className="font-bold text-(--text-h) text-sm">{step.title}</h3>
              <p className="text-(--text) text-xs m-0">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-(--border) p-8 max-lg:p-5">
        <div className="border border-(--border) rounded p-6 max-lg:p-5 flex flex-col gap-4">
          <h3 className="font-bold text-(--text-h) text-center max-lg:text-[20px]">¿Por qué elegir NULL_TRADE?</h3>
          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
            {FEATURES.map(f => (
              <div key={f.title} className="flex gap-3">
                <CheckIcon width={20} height={20} fill="var(--accent)" className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-(--text-h) text-sm m-0">{f.title}</p>
                  <p className="text-(--text) text-xs m-0 mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-22 border-t border-(--border) max-lg:h-12" />
    </PageLayout>
  )
}
