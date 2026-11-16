import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EntryLayout } from '../../components/EntryLayout'
import { useAuth } from '../../data/auth'
import { CODE_LENGTH, cleanCode, useClubs } from '../../data/clubs'

/** 초대 코드를 적어 클럽을 찾거나, 새 클럽을 만들러 가는 화면 */
export function ClubEnterPage() {
  const { logout } = useAuth()
  const { myClubs, findByCode } = useClubs()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [notFound, setNotFound] = useState(false)
  const codeOk = code.length === CODE_LENGTH

  const find = () => {
    if (!codeOk) return
    if (findByCode(code)) navigate(`/join/${code}`)
    else setNotFound(true)
  }

  return (
    <EntryLayout
      kicker="모여라켓"
      title={'어느 클럽에\n들어갈까요'}
      onBack={myClubs.length > 0 ? () => navigate('/clubs') : undefined}
    >
      <form
        className="entry-form"
        onSubmit={(e) => {
          e.preventDefault()
          find()
        }}
      >
        <label className="field">
          <span>초대 코드</span>
          <input
            className={notFound ? 'code-input input--error' : 'code-input'}
            value={code}
            onChange={(e) => {
              setCode(cleanCode(e.target.value))
              setNotFound(false)
            }}
            placeholder="예: TN4K7P"
            autoCapitalize="characters"
            autoComplete="off"
            aria-invalid={notFound}
          />
        </label>
        {notFound ? (
          <div role="alert" className="alert alert--error">
            <strong>클럽을 찾지 못했어요</strong>
            <span>코드를 다시 확인하거나 운영진에게 새 초대 링크를 받아 주세요.</span>
          </div>
        ) : (
          <span className="hint">
            클럽 운영진에게 받은 여섯 자리 코드를 적어 주세요. 초대 링크로 들어오면 코드를 적지 않아도 돼요.
          </span>
        )}
        <button type="submit" className="btn btn--primary" disabled={!codeOk}>
          클럽 찾기
        </button>
      </form>
      <span className="grow" />
      <div className="divider-text">클럽을 새로 시작한다면</div>
      <button className="btn btn--outline" onClick={() => navigate('/clubs/new')}>
        새 클럽 만들기
      </button>
      {myClubs.length === 0 && (
        <button className="btn btn--text" onClick={logout}>
          로그아웃
        </button>
      )}
    </EntryLayout>
  )
}
