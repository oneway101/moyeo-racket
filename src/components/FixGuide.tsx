import { useState } from 'react'
import type { DeviceState } from '../data/notify'
import { isIos } from '../data/notify'
import { Sheet } from './Sheet'

const GUIDE: Partial<Record<DeviceState, { title: string; steps: string[] }>> = {
  blocked: {
    title: '휴대폰 설정에서 알림을 허용해 주세요',
    steps: ['휴대폰 설정 앱을 열어요', '사용 중인 브라우저(크롬, 삼성 인터넷 등)를 찾아요', '알림을 허용으로 바꿔요', '이 화면으로 돌아와 다시 확인을 눌러요'],
  },
  ios: {
    title: '홈 화면에 추가해 주세요',
    steps: ['사파리 아래쪽 공유 버튼을 눌러요', '홈 화면에 추가를 골라요', '홈 화면에 생긴 모여라켓 아이콘으로 열어요', '내 정보에서 알림을 켜요'],
  },
  kakao: {
    title: '다른 브라우저로 열어 주세요',
    steps: ['아래 버튼을 누르거나, 오른쪽 위 메뉴에서 다른 브라우저로 열기를 골라요', '열린 화면의 내 정보에서 알림을 켜요'],
  },
  unsupported: {
    title: '다른 브라우저로 열어 주세요',
    steps: ['안드로이드는 크롬, 아이폰은 사파리로 이 주소를 열어요', '열린 화면의 내 정보에서 알림을 켜요'],
  },
}

/** 알림을 켤 수 없을 때 해결 방법을 단계별로 보여주는 창. 첫 접속 안내에도 쓴다 */
export function FixGuide({ state, onClose, onRecheck, first }: {
  state: DeviceState
  onClose: () => void
  onRecheck?: () => void
  /** 첫 접속 때 한 번 보여주는 안내인지 */
  first?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const guide = GUIDE[state]
  if (!guide) return null
  const url = window.location.origin

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Sheet title={guide.title} onClose={onClose}>
      {first && <p className="sheet-text">알림을 받으려면 먼저 이렇게 해 주세요. 같은 안내를 내 정보에서 다시 볼 수 있어요.</p>}
      <ol className="steps">
        {guide.steps.map((step, i) => (
          <li key={step}><span>{i + 1}</span>{step}</li>
        ))}
      </ol>
      {state === 'kakao' && !isIos() && (
        // 안드로이드 카카오톡은 이 주소로 기본 브라우저를 연다
        <a className="btn btn--primary btn--small" href={`kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`}>
          다른 브라우저로 열기
        </a>
      )}
      {(state === 'unsupported' || (state === 'kakao' && isIos())) && (
        <button className="btn btn--primary btn--small" onClick={copy}>{copied ? '주소를 복사했어요' : '주소 복사'}</button>
      )}
      {state === 'blocked' && onRecheck && (
        <button className="btn btn--primary btn--small" onClick={onRecheck}>다시 확인</button>
      )}
      <button className="btn btn--ghost btn--small" onClick={onClose}>닫기</button>
    </Sheet>
  )
}
