import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Confirm } from '../../components/Confirm'
import { Hero } from '../../components/Hero'
import { useToast } from '../../components/useToast'
import { CLUB_NAME_MAX, useClubs } from '../../data/clubs'
import { copyText, inviteLink } from '../club/ClubInvitePage'

type Dialog = 'regen' | 'delete1' | 'delete2' | null

/** 클럽 설정. 클럽 이름, 초대 링크, 클럽 삭제 */
export function ClubSettingsPage() {
  const { current, renameClub, regenerateCode, deleteClub } = useClubs()
  const navigate = useNavigate()
  const [toast, say] = useToast()
  const [name, setName] = useState(current?.name ?? '')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [typed, setTyped] = useState('')

  if (!current) return null
  const changed = name.trim().length > 0 && name.trim() !== current.name
  const link = inviteLink(current.code)
  const close = () => {
    setDialog(null)
    setTyped('')
  }

  return (
    <>
      <Hero title="클럽 설정" onBack={() => navigate('/admin')} backLabel="관리로 돌아가기" sub={current.name} />

      {toast && <div role="status" className="alert alert--ok toast">{toast}</div>}

      <div className="section">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            if (!changed) return
            renameClub(name)
            setName(name.trim())
            say('클럽 이름을 바꿨어요')
          }}
        >
          <label className="field">
            <span>클럽 이름</span>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, CLUB_NAME_MAX))} maxLength={CLUB_NAME_MAX} />
          </label>
          <button type="submit" className="btn btn--primary btn--small" disabled={!changed}>
            이름 저장
          </button>
        </form>

        <div className="card">
          <strong className="card-title">초대</strong>
          <div className="invite-box invite-box--tint">
            <span>초대 코드</span>
            <strong>{current.code}</strong>
            <span className="invite-link">{link.replace(/^https?:\/\//, '')}</span>
          </div>
          <button
            className="btn btn--primary btn--small"
            onClick={async () => say((await copyText(link)) ? '초대 링크를 복사했어요' : '복사하지 못했어요. 주소를 길게 눌러 복사해 주세요')}
          >
            초대 링크 복사
          </button>
          <span className="hint">링크를 카톡방에 올리면 회원이 가입 신청을 해요. 신청은 회원 관리에서 승인해요.</span>
          <button className="btn btn--ghost btn--small" onClick={() => setDialog('regen')}>
            초대 코드 새로 만들기
          </button>
        </div>

        <div className="card">
          <strong className="card-title">클럽 삭제</strong>
          <span className="hint">클럽과 모든 모임, 투표 기록, 회원 명단이 지워져요. 되돌릴 수 없어요.</span>
          <button className="btn btn--danger-outline btn--small" onClick={() => setDialog('delete1')}>
            클럽 삭제
          </button>
        </div>
      </div>

      {dialog === 'regen' && (
        <Confirm
          title="초대 코드를 새로 만들까요?"
          points={['지금 코드와 이미 올린 초대 링크는 더 쓸 수 없어요.', '이미 가입한 회원과 승인 대기 중인 신청은 그대로예요.']}
          action="새로 만들기"
          onCancel={close}
          onConfirm={() => {
            regenerateCode()
            close()
            say('초대 코드를 새로 만들었어요')
          }}
        />
      )}
      {dialog === 'delete1' && (
        <Confirm
          title={`"${current.name}"을(를) 삭제할까요?`}
          points={[
            '모든 모임과 투표 기록, 정기 모임이 지워져요.',
            `회원 ${current.memberCount}명 모두 이 클럽을 볼 수 없게 돼요.`,
            '삭제하면 되돌릴 수 없어요.',
          ]}
          action="계속"
          onCancel={close}
          onConfirm={() => setDialog('delete2')}
        />
      )}
      {dialog === 'delete2' && (
        <Confirm
          title="클럽 이름을 적어 주세요"
          action="클럽 삭제"
          actionDisabled={typed.trim() !== current.name}
          onCancel={close}
          onConfirm={() => {
            deleteClub()
            navigate('/', { replace: true })
          }}
        >
          <label className="field">
            <span className="dialog-text">
              실수로 지우지 않도록, 삭제하려면 클럽 이름 "{current.name}"을(를) 그대로 적어 주세요.
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={current.name} aria-label="삭제할 클럽 이름" autoFocus />
          </label>
        </Confirm>
      )}
    </>
  )
}
