import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Confirm } from '../../components/Confirm'
import { MemberName } from '../../components/MemberName'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/useToast'
import { displayName } from '../../data/clubs'
import { useMeetings } from '../../data/meetings'
import { dateParts, formatKst, formatSpan, kstParts } from '../../data/time'
import { useVotes, type Row } from '../../data/votes'

type Kind = 'attend' | 'wait' | 'maybe' | 'no'
interface Picked {
  row: Row
  kind: Kind
  /** 참석이면 몇 번째, 대기면 대기 몇 번 */
  no: number
}

const PHASE = { open: '진행 중', ready: '시작 전', closed: '마감' } as const
const chevron = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-600)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
)

function formatStamp(iso: string): string {
  const p = kstParts(iso)
  return `${p.month}/${p.day} ${p.time}`
}

/** 모임 관리. 명단과 지금 할 수 있는 조치가 먼저 보인다 */
export function MeetingManagePage() {
  const { id } = useParams()
  const { getMeeting, getTemplate, now, closeNow, deleteMeeting, stopTemplate } = useMeetings()
  const { rosterOf, adminCancel, processClose } = useVotes()
  const navigate = useNavigate()
  const [toast, say] = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [dialog, setDialog] = useState<'cancel' | 'closeNow' | 'delete' | null>(null)
  const meeting = id ? getMeeting(id) : null

  if (!meeting) return <Navigate to="/admin/meetings" replace />

  const roster = rosterOf(meeting)
  // 정기 모임이 만든 모임은 삭제 대신 "모임 중단"을 한다. 정기 모임이 이미 중단됐으면 그냥 삭제한다
  const template = meeting.templateId ? getTemplate(meeting.templateId) : null
  const { status } = meeting
  const closed = status === 'closed'
  const at = kstParts(meeting.at)
  const count = meeting.capacity ? `${roster.attendCount}/${meeting.capacity}명` : `${roster.attendCount}명`
  const deadline =
    status === 'open' ? `마감 ${formatSpan(new Date(meeting.closesAt).getTime() - now)} 남음 · ${formatKst(meeting.closesAt)}`
    : status === 'ready' ? `${formatKst(meeting.opensAt)} 열림`
    : `${formatKst(meeting.closesAt)} 마감`
  const waitingGuests = roster.wait.filter((r) => r.guestOf).length

  // 참석은 회원만 순번을 매기고 게스트는 "게"로 표시한다
  let memberNo = 0
  const sections: { kind: Kind; label: string; count: string; rows: { row: Row; no: number; mark: string }[] }[] = [
    {
      kind: 'attend', label: '참석',
      count: count + (roster.extraGuests > 0 ? ` · 정원 외 게스트 ${roster.extraGuests}명` : ''),
      rows: roster.attend.map((row) => (row.guestOf ? { row, no: 0, mark: '게' } : { row, no: ++memberNo, mark: String(memberNo) })),
    },
    { kind: 'wait', label: '대기', count: `${roster.wait.length}명`, rows: roster.wait.map((row, i) => ({ row, no: i + 1, mark: String(i + 1) })) },
    { kind: 'maybe', label: '미정', count: `${roster.maybe.length}명`, rows: roster.maybe.map((row) => ({ row, no: 0, mark: '' })) },
    { kind: 'no', label: '불참', count: `${roster.no.length}명`, rows: roster.no.map((row) => ({ row, no: 0, mark: '' })) },
  ]

  const pickedName = picked ? displayName(picked.row.name, picked.row.nick) : ''
  const pickedStatus = !picked ? ''
    : picked.kind === 'attend' ? (picked.row.guestOf ? `참석 · ${picked.row.guestOf} 게스트` : `참석 ${picked.no}번${picked.row.lateTime ? ` · ${picked.row.lateTime} 도착` : ''}`)
    : picked.kind === 'wait' ? `대기 ${picked.no}번${picked.row.guestOf ? ` · ${picked.row.guestOf} 게스트` : ''}`
    : '불참'
  const pickedNote = !picked ? ''
    : closed ? '마감 후 취소라 기록이 남아요. 아래 "마감 후 취소" 목록에 보이고, 본인에게는 "운영진이 취소 처리함"으로 보여요.'
    : picked.row.guestOf ? '명단에서 지워지고, 데려온 회원이 다시 등록할 수 있어요.'
    : `명단에서 지워지고, 본인이 다시 투표할 수 있어요.${picked.kind === 'attend' && roster.wait.some((r) => !r.guestOf) ? ' 대기 1번이 자동으로 참석이 돼요.' : ''}`

  return (
    <>
      <header className="hero hero--dark detail-hero">
        <div className="hero-ring" />
        <div className="detail-top">
          <button className="hero-back" aria-label="모임 관리로 돌아가기" onClick={() => navigate('/admin/meetings')}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button className="more-btn" aria-label="더보기" aria-haspopup="dialog" onClick={() => setMenuOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
        <div className="detail-title">
          <span className="pills">
            <span className={`phase phase--${status}${roster.canceled ? ' phase--canceled' : ''}`}>{roster.canceled ? '취소됨' : PHASE[status]}</span>
            {meeting.templateId && <span className="phase phase--reg">정기</span>}
          </span>
          <h1>{meeting.title}</h1>
        </div>
        <span className="detail-when">
          {at.month}월 {at.day}일 ({dateParts(at.date).wd}) {at.time}{meeting.place && ` · ${meeting.place}`}
        </span>
        <span className="manage-deadline">{deadline}</span>
      </header>

      {toast && <div role="status" className="alert alert--ok toast">{toast}</div>}

      <div className="section detail">
        {status === 'open' && (
          <button className="btn btn--dark" onClick={() => setDialog('closeNow')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            지금 마감하기
          </button>
        )}

        {roster.canceled && (
          <div className="alert alert--warn">최소 {meeting.minPeople}명을 채우지 못해 모임이 취소됐어요.</div>
        )}

        {roster.needsProcess && (
          <div className="alert alert--plain process-box">
            <span>대기 중인 게스트가 {waitingGuests}명 있어요. 마감 처리를 하면 빈자리에 순서대로 들어가요.</span>
            <button
              className="btn btn--primary btn--small"
              onClick={() => {
                processClose(meeting.id)
                say('마감 처리를 했어요')
              }}
            >
              마감 처리
            </button>
          </div>
        )}

        {status === 'ready' ? (
          <div className="card empty">
            <strong>아직 투표가 시작되지 않았어요</strong>
            <span className="muted">{formatKst(meeting.opensAt)}에 열리면 명단이 여기에 보여요.</span>
          </div>
        ) : (
          <>
            <p className="hint pad">이름을 누르면 취소 처리할 수 있어요</p>
            <div className="card manage-roster">
              {sections.map((sec) => (
                <section key={sec.kind} className="manage-sec" aria-label={sec.label}>
                  <div className="manage-sec-head">
                    <h2>{sec.label}</h2>
                    <span>{sec.count}</span>
                  </div>
                  {sec.rows.length === 0 && <span className="fold-none">없음</span>}
                  {sec.rows.map(({ row, no, mark }) => {
                    const body = (
                      <>
                        <span className={row.guestOf ? 'manage-no manage-no--guest' : mark ? 'manage-no' : 'manage-no manage-no--blank'}>{mark}</span>
                        <span className="manage-name">
                          <MemberName name={row.name} nick={row.nick} />
                          {row.guestOf && <span className="nick"> ({row.guestOf} 게스트)</span>}
                          {row.isMe && <span className="row-me"> 나</span>}
                        </span>
                        {row.lateTime && <span className="attend-note">{row.lateTime} 도착</span>}
                      </>
                    )
                    // 미정은 아직 투표하지 않은 회원이라 취소할 투표가 없다
                    return sec.kind === 'maybe' ? (
                      <div key={row.id} className="manage-row">{body}</div>
                    ) : (
                      <button key={row.id} className="manage-row manage-row--tap" onClick={() => setPicked({ row, kind: sec.kind, no })}>
                        {body}
                        {chevron}
                      </button>
                    )
                  })}
                </section>
              ))}
            </div>
          </>
        )}

        {closed && roster.canceledAfter.length > 0 && (
          <div className="card manage-roster">
            <section className="manage-sec" aria-label="마감 후 취소">
              <div className="manage-sec-head">
                <h2>마감 후 취소</h2>
                <span>{roster.canceledAfter.length}명</span>
              </div>
              {roster.canceledAfter.map((c) => (
                <div key={`${c.id}-${c.at}`} className="manage-row">
                  <span className="manage-name">
                    <MemberName name={c.name} nick={c.nick} />
                    {c.guestOf && <span className="nick"> ({c.guestOf} 게스트)</span>}
                  </span>
                  <span className="attend-note">{formatStamp(c.at)} 취소 처리</span>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>

      {menuOpen && (
        <Sheet title="모임 관리" onClose={() => setMenuOpen(false)}>
          <Link to={`/admin/meetings/${meeting.id}/edit`} className="btn btn--ghost">모임 정보 수정</Link>
          <Link to={`/meetings/${meeting.id}`} className="btn btn--ghost">회원 화면으로 보기</Link>
          <button
            className="btn btn--danger-outline"
            onClick={() => {
              setMenuOpen(false)
              setDialog('delete')
            }}
          >
            {template ? '모임 중단' : '모임 삭제'}
          </button>
          <button className="btn btn--text" onClick={() => setMenuOpen(false)}>닫기</button>
        </Sheet>
      )}

      {picked && !dialog && (
        <Sheet title={pickedName} hideTitle onClose={() => setPicked(null)}>
          <div className="sheet-person">
            <div>
              <h2>
                <MemberName name={picked.row.name} nick={picked.row.nick} />
              </h2>
              <span>{pickedStatus}</span>
            </div>
          </div>
          <p className="sheet-text">{pickedNote}</p>
          <button className="btn btn--danger" onClick={() => setDialog('cancel')}>취소 처리</button>
          <button className="btn btn--ghost" onClick={() => setPicked(null)}>닫기</button>
        </Sheet>
      )}

      {dialog === 'cancel' && picked && (
        <Confirm
          title={`${picked.row.name} 님을 취소 처리할까요?`}
          points={['되돌릴 수 없어요.', pickedNote]}
          action="취소 처리"
          cancelLabel="돌아가기"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            adminCancel(meeting.id, picked.row.id)
            setDialog(null)
            setPicked(null)
            say(`${picked.row.name} 님을 취소 처리했어요`)
          }}
        />
      )}
      {dialog === 'closeNow' && (
        <Confirm
          title="지금 마감할까요?"
          points={['바로 마감되고 마감 처리도 함께 실행돼요.', '이후에는 회원이 선택을 바꿀 수 없어요.']}
          action="지금 마감"
          cancelLabel="돌아가기"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            closeNow(meeting.id)
            setDialog(null)
            say('모임을 마감했어요')
          }}
        />
      )}
      {dialog === 'delete' && template && (
        <Confirm
          title="모임을 중단할까요?"
          points={[
            `"${template.title}" 정기 모임이 멈춰요.`,
            '앞으로 예정된 회차와 아직 모임 시각이 지나지 않은 모임이 모두 지워져요. 이 모임도 지워져요.',
            '지난 모임의 참석 내역은 그대로 남아요. 되돌릴 수 없어요.',
          ]}
          action="모임 중단"
          cancelLabel="돌아가기"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            const gone = new Date(meeting.at).getTime() > Date.now()
            stopTemplate(template.id)
            if (gone) navigate('/admin/meetings', { replace: true, state: { toast: '정기 모임을 중단했어요' } })
            else {
              setDialog(null)
              say('정기 모임을 중단했어요')
            }
          }}
        />
      )}
      {dialog === 'delete' && !template && (
        <Confirm
          title="모임을 삭제할까요?"
          points={['참석 내역과 게스트가 모두 지워져요.', '삭제하면 되돌릴 수 없어요.']}
          action="삭제"
          cancelLabel="돌아가기"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            deleteMeeting(meeting.id)
            navigate('/admin/meetings', { replace: true, state: { toast: '모임을 삭제했어요' } })
          }}
        />
      )}
    </>
  )
}
