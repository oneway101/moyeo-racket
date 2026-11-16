import type { ReactNode } from 'react'

interface Props {
  /** 제목 위의 작은 글씨 */
  kicker: string
  title: string
  size?: 'tall' | 'normal' | 'short'
  onBack?: () => void
  children: ReactNode
}

/** 로그인과 클럽 가입처럼 하단 메뉴 없이 한 단계씩 보여주는 화면의 틀 */
export function EntryLayout({ kicker, title, size = 'normal', onBack, children }: Props) {
  return (
    <div className="entry">
      <header className={`entry-hero entry-hero--${size}`}>
        <div className="entry-hero-ring" />
        <div className="tennis-ball" aria-hidden="true" />
        <div className="entry-hero-arc" />
        {onBack && (
          <button className="entry-back" aria-label="뒤로" onClick={onBack}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <span className="entry-kicker">{kicker}</span>
        <h1>{title}</h1>
      </header>
      <div className="entry-body">{children}</div>
    </div>
  )
}
