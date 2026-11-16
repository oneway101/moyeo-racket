import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { EntryLayout } from '../../components/EntryLayout'
import { useAuth } from '../../data/auth'
import { NICK_MAX, useClubs } from '../../data/clubs'

/** 초대 링크나 코드로 찾은 클럽에 가입 신청하는 화면 */
export function ClubJoinPage() {
  const { code = '' } = useParams()
  const { account } = useAuth()
  const { findByCode, getMyClub, requestJoin, switchClub } = useClubs()
  const navigate = useNavigate()
  const [nick, setNick] = useState('')
  const club = findByCode(code)

  if (!club) {
    return (
      <EntryLayout kicker="모여라켓" title={'클럽을\n찾지 못했어요'}>
        <div role="alert" className="alert alert--error">
          <strong>초대 링크가 맞지 않아요</strong>
          <span>링크가 바뀌었을 수 있어요. 운영진에게 새 초대 링크를 받아 주세요.</span>
        </div>
        <span className="grow" />
        <button className="btn btn--primary" onClick={() => navigate('/clubs/enter', { replace: true })}>
          초대 코드 직접 입력
        </button>
      </EntryLayout>
    )
  }

  const mine = getMyClub(club.id)
  if (mine?.status === 'pending') return <Navigate to={`/clubs/${club.id}/pending`} replace />

  if (mine) {
    return (
      <EntryLayout kicker={club.name} title={'이미 가입한\n클럽이에요'}>
        <span className="grow" />
        <button
          className="btn btn--primary"
          onClick={() => {
            switchClub(club.id)
            navigate('/', { replace: true })
          }}
        >
          클럽으로 들어가기
        </button>
      </EntryLayout>
    )
  }

  return (
    <EntryLayout kicker="초대받은 클럽" title={'이 클럽에\n가입할까요'}>
      <form
        className="entry-form entry-form--fill"
        onSubmit={(e) => {
          e.preventDefault()
          requestJoin(club.id, nick)
          navigate(`/clubs/${club.id}/pending`, { replace: true })
        }}
      >
        <div className="club-card">
          <span className="avatar avatar--lime" aria-hidden="true">{club.name[0]}</span>
          <div>
            <strong>{club.name}</strong>
            <span>회원 {club.others}명</span>
          </div>
        </div>
        <div className="fixed-row">
          <span>이름 (실명)</span>
          <strong>{account?.name}</strong>
        </div>
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
        <span className="hint">
          명단에는 "김도윤(도윤)"처럼 실명과 별명이 함께 보여요. 같은 클럽 회원은 서로 실명을 볼 수 있어요.
        </span>
        <span className="grow" />
        <button type="submit" className="btn btn--primary">
          가입 신청
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/clubs/enter', { replace: true })}>
          다른 코드 입력
        </button>
      </form>
    </EntryLayout>
  )
}
