import { useCallback, useState } from 'react'

/** 화면을 오가도 값이 남도록 이 탭에만 기억해 두는 상태 */
export function usePersisted<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    } catch {
      // 기억해 둔 값이 없거나 읽을 수 없으면 처음 값으로 시작한다
    }
    return initial
  })

  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        sessionStorage.setItem(key, JSON.stringify(next))
      } catch {
        // 기억하지 못해도 화면은 그대로 동작한다
      }
    },
    [key],
  )

  return [value, set]
}
