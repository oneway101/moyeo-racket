import { useState } from 'react'
import { EntryLayout } from '../components/EntryLayout'
import { NAME_MAX, useAuth } from '../data/auth'

type Step = 'start' | 'loading' | 'name'

const TITLES: Record<Step, string> = {
  start: '함께 치는 즐거움,\n여기서 시작해요',
  loading: '잠시만요',
  name: '이름을\n확인해 주세요',
}

/** 로그인 전과 첫 로그인(실명 입력) 화면. 한 번에 한 단계만 보인다 */
export function LoginPage() {
  const { account, loginWithKakao, saveName, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [name, setName] = useState('')

  const step: Step = busy ? 'loading' : account ? 'name' : 'start'
  const nameOk = name.trim().length > 0

  const startKakao = async () => {
    setFailed(false)
    setBusy(true)
    try {
      await loginWithKakao()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <EntryLayout kicker="모여라켓" title={TITLES[step]} size={step === 'start' ? 'tall' : 'normal'}>
      {step === 'start' && (
        <>
          {failed && (
            <div role="alert" className="alert alert--error">
              <strong>로그인하지 못했어요</strong>
              <span>카카오 로그인이 취소됐거나 연결이 끊겼어요. 다시 시도해 주세요.</span>
            </div>
          )}
          <span className="grow" />
          <button className="btn btn--kakao" onClick={startKakao}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.76l-.95 3.48c-.08.3.26.55.53.38l4.15-2.74c.53.07 1.07.12 1.61.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>
        </>
      )}

      {step === 'loading' && (
        <div className="entry-loading" role="status">
          <div className="spinner" />
          <span>카카오 계정을 확인하고 있어요</span>
        </div>
      )}

      {step === 'name' && (
        <form
          className="entry-form entry-form--fill"
          onSubmit={(e) => {
            e.preventDefault()
            saveName(name)
          }}
        >
          <label className="field">
            <span>이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
              placeholder="예: 김도윤"
              autoComplete="name"
              autoFocus
            />
          </label>
          <span className="hint">
            운영진이 알아볼 수 있도록 실명으로 적어 주세요. 한 번 정하면 직접 바꿀 수 없어요.
          </span>
          <span className="grow" />
          <button type="submit" className="btn btn--primary" disabled={!nameOk}>
            다음
          </button>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            로그아웃
          </button>
        </form>
      )}
    </EntryLayout>
  )
}
