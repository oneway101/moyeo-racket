import type { ReactNode } from 'react'

interface Props {
  title: string
  /** 관리 화면은 어둡게 쓴다 */
  dark?: boolean
  /** 있으면 제목 왼쪽에 뒤로 가기 버튼이 생긴다 */
  onBack?: () => void
  backLabel?: string
  /** 제목 아래 작은 글씨 */
  sub?: string
  children?: ReactNode
}

/** 화면 맨 위의 머리띠 */
export function Hero({ title, dark, onBack, backLabel = '뒤로', sub, children }: Props) {
  return (
    <header className={dark ? 'hero hero--dark' : 'hero'}>
      <div className="hero-ring" />
      {!dark && !onBack && <div className="hero-ball" />}
      <div className="hero-title">
        {onBack && (
          <button className="hero-back" aria-label={backLabel} onClick={onBack}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1>{title}</h1>
      </div>
      {sub && <span className="hero-sub">{sub}</span>}
      {children}
    </header>
  )
}
