import { useEffect, type ReactNode } from 'react'

/** 아래에서 올라오는 창. 바깥을 누르거나 Esc를 누르면 닫힌다 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <span className="sheet-handle" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
