import { useCallback, useEffect, useRef, useState } from 'react'

/** 잠깐 보였다 사라지는 안내 문구 */
export function useToast(ms = 2400): [string, (text: string) => void] {
  const [text, setText] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const say = useCallback(
    (next: string) => {
      setText(next)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setText(''), ms)
    },
    [ms],
  )

  useEffect(() => () => clearTimeout(timer.current), [])
  return [text, say]
}
