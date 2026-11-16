import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** 로그인한 사람. 실명은 첫 로그인 때 한 번 정하고 모든 클럽에서 같이 쓴다 */
export interface Account {
  id: string
  /** 아직 실명을 입력하지 않았으면 null */
  name: string | null
}

export const NAME_MAX = 10

interface AuthValue {
  account: Account | null
  /** 카카오 로그인. 지금은 가짜 로그인이고, 나중에 실제 카카오 로그인으로 바꾼다 */
  loginWithKakao: () => Promise<void>
  /** 실명 저장. 한 번 정하면 본인이 바꿀 수 없다 */
  saveName: (name: string) => void
  logout: () => void
}

const STORAGE_KEY = 'moyeo.account'
const AuthContext = createContext<AuthValue | null>(null)

function load(): Account | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Account) : null
  } catch {
    return null
  }
}

function store(account: Account | null) {
  try {
    if (account) localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장소를 쓸 수 없는 브라우저에서는 새로고침하면 로그인이 풀린다
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(load)

  const update = useCallback((next: Account | null) => {
    store(next)
    setAccount(next)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      account,
      loginWithKakao: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            update({ id: 'me', name: null })
            resolve()
          }, 1200)
        }),
      saveName: (name) => {
        const trimmed = name.trim().slice(0, NAME_MAX)
        if (!account || account.name || !trimmed) return
        update({ ...account, name: trimmed })
      },
      logout: () => update(null),
    }),
    [account, update],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider 안에서만 쓸 수 있어요')
  return value
}
