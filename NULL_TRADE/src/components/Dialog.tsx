import { type ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { XIcon } from './Icons'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ComponentChildren
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (ref.current) {
      if (open) ref.current.showModal()
      else ref.current.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="backdrop:bg-black/60 bg-transparent p-0 m-auto max-w-lg w-full rounded-lg border border-(--border) shadow-xl"
    >
      <div className="bg-(--bg) rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
          <h3 className="font-bold text-(--text-h) text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 rounded hover:bg-(--bg-hover) transition-colors"
          >
            <XIcon width={16} height={16} fill="var(--text)" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </dialog>
  )
}
