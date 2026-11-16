import { useEffect, type ReactNode } from 'react'

interface Props {
  title: string
  /** 한 줄씩 점을 찍어 보여주는 안내 */
  points?: string[]
  /** 확인 버튼 글자. 없으면 닫기 버튼만 보인다 */
  action?: string
  actionDisabled?: boolean
  cancelLabel?: string
  onConfirm?: () => void
  onCancel: () => void
  children?: ReactNode
}

/** 되돌릴 수 없는 조치 앞에서 한 번 더 묻는 창 */
export function Confirm({ title, points, action, actionDisabled, cancelLabel, onConfirm, onCancel, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {points && (
          <ul>
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {children}
        <div className={action ? 'btn-row' : undefined}>
          <button className="btn btn--ghost" style={action ? undefined : { width: '100%' }} onClick={onCancel}>
            {cancelLabel ?? (action ? '취소' : '닫기')}
          </button>
          {action && (
            <button className="btn btn--danger" onClick={onConfirm} disabled={actionDisabled}>
              {action}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
