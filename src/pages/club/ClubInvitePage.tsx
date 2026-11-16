import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { EntryLayout } from '../../components/EntryLayout'
import { useClubs } from '../../data/clubs'

/** 초대 링크 주소. 지금 열려 있는 주소를 기준으로 만든다 */
// eslint-disable-next-line react-refresh/only-export-components
export function inviteLink(code: string): string {
  return `${window.location.origin}/join/${code}`
}

// eslint-disable-next-line react-refresh/only-export-components
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** 클럽을 만든 직후 초대 코드와 링크를 보여주는 화면 */
export function ClubInvitePage() {
  const { id } = useParams()
  const { getMyClub, switchClub } = useClubs()
  const navigate = useNavigate()
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const club = id ? getMyClub(id) : null

  if (!club || club.role !== 'admin') return <Navigate to="/" replace />
  const link = inviteLink(club.code)

  return (
    <EntryLayout kicker={club.name} title={'클럽이\n만들어졌어요'}>
      <div className="invite-box">
        <span>초대 코드</span>
        <strong>{club.code}</strong>
        <span className="invite-link">{link.replace(/^https?:\/\//, '')}</span>
      </div>
      <span className="hint">
        링크를 카톡방에 올리면 회원이 가입 신청을 해요. 신청이 오면 관리의 회원 관리에서 승인해 주세요.
      </span>
      {copied === 'ok' && <div role="status" className="alert alert--ok">초대 링크를 복사했어요</div>}
      {copied === 'fail' && (
        <div role="alert" className="alert alert--error">
          <strong>복사하지 못했어요</strong>
          <span>위 주소를 길게 눌러 직접 복사해 주세요.</span>
        </div>
      )}
      <span className="grow" />
      <button
        className="btn btn--primary"
        onClick={async () => setCopied((await copyText(link)) ? 'ok' : 'fail')}
      >
        초대 링크 복사
      </button>
      <button
        className="btn btn--ghost"
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
