import { type ComponentChildren } from 'preact'

interface Props {
  children: ComponentChildren
  className?: string
}

export function PageLayout({ children, className = '' }: Props) {
  return (
    <div className="pt-13">
      <main className={`w-281.5 max-w-full mx-auto border-x border-(--border) min-h-svh flex flex-col box-border ${className}`}>
        {children}
      </main>
    </div>
  )
}
