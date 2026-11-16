import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EntryLayout } from '../../components/EntryLayout'
import { CLUB_NAME_MAX, NICK_MAX, useClubs } from '../../data/clubs'

/** 새 클럽 만들기. 만든 사람이 첫 운영진이 된다 */
export function ClubNewPage() {
  const { createClub } = useClubs()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nick, setNick] = useState('')
  const nameOk = name.trim().length > 0

  return (
    <EntryLayout kicker="새 클럽" title={'클럽을\n만들어요'} onBack={() => navigate(-1)}>
      <form
        className="entry-form entry-form--fill"
        onSubmit={(e) => {
          e.preventDefault()
          if (!nameOk) return
          const id = createClub(name, nick)
          navigate(`/clubs/${id}/invite`, { replace: true })
        }}
      >
        <label className="field">
          <span>클럽 이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, CLUB_NAME_MAX))}
            maxLength={CLUB_NAME_MAX}
            placeholder="예: 한강 테니스 클럽"
            autoFocus
          />
        </label>
        <label className="field">
          <span>
            이 클럽에서 쓸 별명 <em>(선택)</em>
          </span>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value.slice(0, NICK_MAX))}
            maxLength={NICK_MAX}
            placeholder="비우면 실명만 보여요"
          />
        </label>
        <div className="alert alert--info">
          클럽을 만든 사람이 첫 운영진이 돼요. 만든 뒤에 초대 링크를 카톡방에 올려 회원을 모을 수 있어요.
        </div>
        <span className="grow" />
        <button type="submit" className="btn btn--primary" disabled={!nameOk}>
          클럽 만들기
        </button>
      </form>
    </EntryLayout>
  )
}
