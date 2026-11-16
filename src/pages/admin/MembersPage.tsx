import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Confirm } from '../../components/Confirm'
import { Hero } from '../../components/Hero'
import { MemberName, initialOf } from '../../components/MemberName'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/useToast'
import { useClubs, type Member } from '../../data/clubs'

type Tab = 'pending' | 'members'

/** 신청한 때를 "오늘 오전 9:12", "어제", "10월 10일"처럼 보여준다 */
function formatWhen(iso: string): string {
  const d = new Date(iso)
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((dayStart(new Date()) - dayStart(d)) / 86_400_000)
  if (days === 0) {
    const h = d.getHours()
    return `오늘 ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  if (days === 1) return '어제'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 회원 관리. 가입 승인과 거절, 운영진 지정과 해제, 탈퇴 처리 */
export function MembersPage() {
  const { members, applicants, approve, reject, setRole, removeMember } = useClubs()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>(applicants.length > 0 ? 'pending' : 'members')
  const [toast, say] = useToast()
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'reject' | 'remove'; who: Member } | null>(null)

  const open = members.find((m) => m.id === openId) ?? null

  const changeRole = (who: Member, role: 'admin' | 'member') => {
    setRole(who.id, role)
    setOpenId(null)
    say(role === 'admin' ? `${who.name} 님을 운영진으로 지정했어요` : `${who.name} 님을 운영진에서 해제했어요`)
  }

  return (
    <>
      <Hero title="회원 관리" onBack={() => navigate('/admin')} backLabel="관리로 돌아가기">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'pending'} onClick={() => setTab('pending')}>
            승인 대기
            {applicants.length > 0 && <span className="tab-count">{applicants.length}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'members'} onClick={() => setTab('members')}>
            회원 {members.length}명
          </button>
        </div>
      </Hero>

      {toast && <div role="status" className="alert alert--ok toast">{toast}</div>}

      {tab === 'pending' && applicants.length > 0 && (
        <div className="section">
          <p className="hint pad">승인하면 바로 모임과 명단을 볼 수 있어요.</p>
          {applicants.map((p) => (
            <div key={p.id} className="card applicant">
              <div className="applicant-head">
                <span className="avatar avatar--big" aria-hidden="true">{initialOf(p.name)}</span>
                <div>
                  <strong>
                    <MemberName name={p.name} nick={p.nick} />
                    {p.rejoin && <span className="badge badge--waiting">재가입</span>}
                  </strong>
                  <span>{formatWhen(p.requestedAt)} 신청</span>
                </div>
              </div>
              <div className="applicant-actions">
                <button className="btn btn--ghost" onClick={() => setConfirm({ kind: 'reject', who: p })}>
                  거절
                </button>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    approve(p.id)
                    say(`${p.name} 님을 승인했어요`)
                  }}
                >
                  승인
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'pending' && applicants.length === 0 && (
        <div className="section">
          <div className="card empty">
            <strong>승인을 기다리는 사람이 없어요</strong>
            <span className="muted">새로 가입 신청이 오면 여기에 보여요.</span>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="section">
          <p className="hint pad">이름을 누르면 운영진으로 지정하거나 해제할 수 있어요.</p>
          <ul className="row-list">
            {members.map((m) => (
              <li key={m.id}>
                <button onClick={() => setOpenId(m.id)}>
                  <span className="avatar avatar--small" aria-hidden="true">{initialOf(m.name)}</span>
                  <span className="row-name"><MemberName name={m.name} nick={m.nick} /></span>
                  {m.isMe && <span className="row-me">나</span>}
                  {m.role === 'admin' && <span className="badge badge--admin">운영진</span>}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-600)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <Sheet title={open.name} hideTitle onClose={() => setOpenId(null)}>
          <div className="sheet-person">
            <span className="avatar avatar--big" aria-hidden="true">{initialOf(open.name)}</span>
            <div>
              <h2><MemberName name={open.name} nick={open.nick} /></h2>
              <span>지금 역할 · {open.role === 'admin' ? '운영진' : '회원'}</span>
            </div>
          </div>
          {open.isMe && (
            <div className="alert alert--warn">
              내 운영진 권한은 직접 해제하거나 탈퇴 처리할 수 없어요. 다른 운영진에게 부탁해 주세요.
            </div>
          )}
          {!open.isMe && open.role === 'member' && (
            <>
              <p className="sheet-text">운영진은 모임 관리와 회원 관리를 할 수 있어요.</p>
              <button className="btn btn--primary" onClick={() => changeRole(open, 'admin')}>
                운영진으로 지정
              </button>
              <button
                className="btn btn--danger-outline"
                onClick={() => {
                  setOpenId(null)
                  setConfirm({ kind: 'remove', who: open })
                }}
              >
                탈퇴 처리
              </button>
            </>
          )}
          {!open.isMe && open.role === 'admin' && (
            <>
              <p className="sheet-text">해제하면 일반 회원이 되어 관리 메뉴를 쓸 수 없어요.</p>
              <button className="btn btn--danger-outline" onClick={() => changeRole(open, 'member')}>
                운영진 해제
              </button>
              <p className="hint">운영진은 바로 탈퇴 처리할 수 없어요. 먼저 해제해 주세요.</p>
            </>
          )}
          <button className="btn btn--ghost" onClick={() => setOpenId(null)}>
            닫기
          </button>
        </Sheet>
      )}

      {confirm?.kind === 'reject' && (
        <Confirm
          title={`${confirm.who.name} 님의 가입 신청을 거절할까요?`}
          points={['신청이 지워져요.', '초대 링크로 다시 들어오면 새로 신청할 수 있어요.']}
          action="거절"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            reject(confirm.who.id)
            setConfirm(null)
            say(`${confirm.who.name} 님의 신청을 거절했어요`)
          }}
        />
      )}
      {confirm?.kind === 'remove' && (
        <Confirm
          title={`${confirm.who.name} 님을 탈퇴 처리할까요?`}
          points={[
            '모임과 명단을 볼 수 없게 돼요.',
            '이미 한 투표와 게스트는 그대로 남아요. 빼야 하면 명단 수정에서 취소 처리해 주세요.',
            '본인이 다시 가입 신청하면 승인 대기에 올라와요.',
          ]}
          action="탈퇴 처리"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeMember(confirm.who.id)
            setConfirm(null)
            say(`${confirm.who.name} 님을 탈퇴 처리했어요`)
          }}
        />
      )}
    </>
  )
}
