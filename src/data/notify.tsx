import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * 알림 설정.
 * - "이 기기에서 알림 받기"는 기기마다 따로 켠다. 휴대폰이 알림을 켤 수 있는 상태인지 먼저 알아낸다.
 * - 받을 알림 종류는 회원 단위라 그 회원의 모든 기기에 같이 적용된다.
 * 실제로 알림을 보내는 것(웹 푸시 구독과 서버 발송)은 데이터베이스를 연결할 때 붙인다.
 */

export type DeviceState = 'on' | 'off' | 'blocked' | 'ios' | 'kakao' | 'unsupported'
export type NotifyType = 'start' | 'soon' | 'promote' | 'eve' | 'cancel'

// eslint-disable-next-line react-refresh/only-export-components
export const NOTIFY_TYPES: { type: NotifyType; label: string; desc: string }[] = [
  { type: 'start', label: '투표 시작', desc: '모임 투표가 열릴 때' },
  { type: 'soon', label: '마감 임박', desc: '마감 3시간 전, 아직 투표하지 않았을 때' },
  { type: 'promote', label: '대기자 승급', desc: '대기에서 참석으로 바뀔 때' },
  { type: 'eve', label: '모임 전날', desc: '참석하는 모임 24시간 전' },
  { type: 'cancel', label: '모임 취소', desc: '최소 인원 미달로 모임이 취소될 때' },
]

const DEVICE_KEY = 'moyeo.notify.device'
const TYPES_KEY = 'moyeo.notify.types'
const ALL_ON: Record<NotifyType, boolean> = { start: true, soon: true, promote: true, eve: true, cancel: true }

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 저장소를 쓸 수 없으면 새로고침할 때 처음 값으로 돌아간다
  }
}

/** 카카오톡 안의 브라우저로 열었는지 */
// eslint-disable-next-line react-refresh/only-export-components
export function isKakaoInApp(): boolean {
  return /KAKAOTALK/i.test(navigator.userAgent)
}

/** 아이폰이나 아이패드인지. 데스크톱처럼 보이는 아이패드도 포함한다 */
// eslint-disable-next-line react-refresh/only-export-components
export function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** 홈 화면에 추가한 앱으로 열었는지 */
// eslint-disable-next-line react-refresh/only-export-components
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** 이 기기가 지금 알림을 켤 수 있는 상태인지 알아낸다 */
// eslint-disable-next-line react-refresh/only-export-components
export function detectDevice(wantOn: boolean): DeviceState {
  if (isKakaoInApp()) return 'kakao'
  if (isIos() && !isStandalone()) return 'ios'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  return wantOn && Notification.permission === 'granted' ? 'on' : 'off'
}

interface NotifyValue {
  device: DeviceState
  /** 이 기기에서 알림 받기를 켠다. 휴대폰이 허락을 물어본다 */
  turnOn: () => Promise<void>
  turnOff: () => void
  /** 휴대폰 설정을 바꾸고 돌아왔을 때 다시 확인한다 */
  recheck: () => void
  types: Record<NotifyType, boolean>
  setType: (type: NotifyType, on: boolean) => void
}

const NotifyContext = createContext<NotifyValue | null>(null)

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [wantOn, setWantOn] = useState(() => read(DEVICE_KEY) === 'on')
  const [tick, setTick] = useState(0)
  const [types, setTypes] = useState<Record<NotifyType, boolean>>(() => {
    try {
      return { ...ALL_ON, ...JSON.parse(read(TYPES_KEY) ?? '{}') }
    } catch {
      return ALL_ON
    }
  })

  const setDevice = useCallback((on: boolean) => {
    write(DEVICE_KEY, on ? 'on' : 'off')
    setWantOn(on)
  }, [])

  const value = useMemo<NotifyValue>(() => {
    void tick
    return {
      device: detectDevice(wantOn),
      turnOn: async () => {
        if (!('Notification' in window)) return
        const result = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
        setDevice(result === 'granted')
        setTick((t) => t + 1)
      },
      turnOff: () => setDevice(false),
      recheck: () => setTick((t) => t + 1),
      types,
      setType: (type, on) => {
        const next = { ...types, [type]: on }
        write(TYPES_KEY, JSON.stringify(next))
        setTypes(next)
      },
    }
  }, [wantOn, tick, types, setDevice])

  return <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>
}

/** 로그아웃하면 그 기기의 알림은 꺼진다 */
// eslint-disable-next-line react-refresh/only-export-components
export function clearDeviceNotify() {
  write(DEVICE_KEY, 'off')
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotify(): NotifyValue {
  const value = useContext(NotifyContext)
  if (!value) throw new Error('NotifyProvider 안에서만 쓸 수 있어요')
  return value
}
