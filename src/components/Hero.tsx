import type { ReactNode } from 'react'

/** 화면 맨 위의 머리띠. 관리 화면은 dark로 어둡게 쓴다 */
export function Hero({ title, dark, children }: { title: string; dark?: boolean; children?: ReactNode }) {
  return (
    <header className={dark ? 'hero hero--dark' : 'hero'}>
      <div className="hero-ring" />
      {!dark && <div className="hero-ball" />}
      <h1>{title}</h1>
      {children}
    </header>
  )
}
