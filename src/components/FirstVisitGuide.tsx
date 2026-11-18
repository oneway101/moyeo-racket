import { useState } from 'react'
import { useNotify } from '../data/notify'
import { FixGuide } from './FixGuide'

const SEEN_KEY = 'moyeo.guideSeen'

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true
  }
}

/** 알림을 켤 수 없는 환경(아이폰 홈 화면 추가 전, 카카오톡 안)에서 첫 접속 때 한 번 보여주는 안내 */
export function FirstVisitGuide() {
  const { device } = useNotify()
  const [open, setOpen] = useState(() => !seen())
  if (!open || (device !== 'ios' && device !== 'kakao')) return null

  return (
    <FixGuide
      state={device}
      first
      onClose={() => {
        try {
          localStorage.setItem(SEEN_KEY, '1')
        } catch {
          // 기억하지 못하면 다음에 한 번 더 보여도 괜찮다
        }
        setOpen(false)
      }}
    />
  )
}
