import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { MemberName } from '../components/MemberName'
import { useClubs, displayName } from '../data/clubs'
import { useMeetings } from '../data/meetings'
import { dateParts, formatKst, formatSpan, kstParts } from '../data/time'
import { lateDefault, useVotes, type Row } from '../data/votes'

const check = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
const clock = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
)

function Chips({ rows, numbered }: { rows: Row[]; numbered?: boolean }) {
  if (rows.length === 0) return <span className="fold-none">없음</span>
  return (
    <>
      {rows.map((r, i) => (
        <span key={r.id} className={r.isMe ? 'name-chip name-chip--me' : 'name-chip'}>
          {numbered ? `${i + 1}. ` : ''}{displayName(r.name, r.nick)}
        </span>
      ))}
    </>
  )
}

/** 모임 상세. 내 투표가 먼저, 명단은 그다음 */
export function MeetingDetailPage() {
  const { id } = useParams()
  const { current } = useClubs()
  const { getMeeting, now } = useMeetings()
  const { rosterOf, attend, decline, setLateTime, cancelLateTime } = useVotes()
  const navigate = useNavigate()
  const [lateOpen, setLateOpen] = useState(false)
  const [lateDraft, setLateDraft] = useState('')
  const meeting = id ? getMeeting(id) : null

  // 시작 전 모임은 회원에게 보이지 않는다
  if (!meeting || meeting.status === 'ready') return <Navigate to="/" replace />

  const roster = rosterOf(meeting)
  const { place, mine } = roster
  const open = meeting.status === 'open'
  const isIn = place.state === 'attend' || place.state === 'wait'
  const isLate = mine?.choice === 'late'
  const at = kstParts(meeting.at)
  const closes = new Date(meeting.closesAt).getTime()
  const draft = lateDraft || lateDefault(meeting)

  const phase = roster.canceled ? '취소됨' : open ? '진행 중' : '마감'

  return (
    <>
      <header className={open ? 'hero detail-hero' : 'hero hero--dark detail-hero'}>
        <div className="hero-ring" />
        <div className="detail-top">
          <button className="hero-back" aria-label="홈으로" onClick={() => navigate('/')}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          {current?.role === 'admin' && (
            <Link to={`/admin/meetings/${meeting.id}/edit`} className="detail-admin">이 모임 관리</Link>
          )}
        </div>
        <div className="detail-title">
          <span className="phase">{phase}</span>
          <h1>{meeting.title}</h1>
        </div>
        <span className="detail-when">
          {at.month}월 {at.day}일 ({dateParts(at.date).wd}) {at.time}{meeting.place && ` · ${meeting.place}`}
        </span>
        <div className="tiles">
          <div>
            <strong>{roster.canceled ? '취소됨' : open ? `${formatSpan(closes - now)} 남음` : '마감'}</strong>
            <span>{roster.canceled ? `최소 ${meeting.minPeople}명 미달` : `${formatKst(meeting.closesAt)} 마감`}</span>
          </div>
          <div>
            <strong>{meeting.capacity ? `${roster.attend.length}/${meeting.capacity}` : `${roster.attend.length}명`}</strong>
            <span>참석 인원{roster.wait.length > 0 && ` · 대기 ${roster.wait.length}`}</span>
          </div>
        </div>
      </header>

      <div className="section detail">
        {roster.canceled && (
          <div className="alert alert--warn">최소 {meeting.minPeople}명을 채우지 못해 모임이 취소됐어요.</div>
        )}
        {!open && !roster.canceled && (
          <div className="alert alert--plain">투표가 마감되어 바꿀 수 없어요. 변경은 운영진에게 요청해 주세요.</div>
        )}
        {open && meeting.minPeople && (
          <div className="alert alert--plain">최소 {meeting.minPeople}명 · 마감 때 이보다 적으면 모임이 자동으로 취소돼요.</div>
        )}

        <div className="vote-buttons">
          <button
            className={`vote-btn vote-btn--attend${isIn ? ' vote-btn--on' : ''}${place.state === 'wait' ? ' vote-btn--wait' : ''}`}
            aria-pressed={isIn}
            disabled={!open}
            onClick={() => {
              attend(meeting.id)
              setLateOpen(false)
            }}
          >
            {isIn && check}
            <strong>참석</strong>
          </button>
          <button
            className={`vote-btn vote-btn--no${place.state === 'no' ? ' vote-btn--on' : ''}`}
            aria-pressed={place.state === 'no'}
            disabled={!open}
            onClick={() => {
              decline(meeting.id)
              setLateOpen(false)
            }}
          >
            <strong>불참</strong>
          </button>
        </div>
        {open && place.state !== 'none' && (
          <p className="hint center">같은 버튼을 한 번 더 누르면 투표가 취소돼요. 마감 전까지 언제든 바꿀 수 있어요.</p>
        )}

        {open && isIn && !isLate && !lateOpen && (
          <button className="link-btn" onClick={() => setLateOpen(true)}>{clock}늦게 도착하나요?</button>
        )}

        {open && isIn && (isLate || lateOpen) && (
          <div className="late-box">
            <label>
              <strong>도착 시간</strong>
              <input
                type="time"
                value={isLate ? (mine?.lateTime ?? '') : draft}
                onChange={(e) => {
                  if (!e.target.value) return
                  if (isLate) setLateTime(meeting.id, e.target.value)
                  else setLateDraft(e.target.value)
                }}
              />
            </label>
            <span>누구에게나 사정은 있어요. 정시 도착이 어려울 경우 함께 운동하는 참석자에게 알려주세요.</span>
            {isLate ? (
              <>
                <span className="late-warn">늦참을 취소하면 순번을 새로 받아 정시 참석자 맨 뒤로 가요{roster.waitIfAttend > 0 && `. 지금 취소하면 대기 ${roster.waitIfAttend}번이 돼요`}</span>
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    cancelLateTime(meeting.id)
                    setLateOpen(false)
                  }}
                >
                  늦참 취소
                </button>
              </>
            ) : (
              <>
                <span className="late-warn">
                  늦참은 정시 참석자 뒤에 서요{roster.waitIfLate > 0 && `. 지금 바꾸면 대기 ${roster.waitIfLate}번이 돼요`}
                </span>
                <div className="btn-row">
                  <button className="btn btn--ghost btn--small" onClick={() => setLateOpen(false)}>닫기</button>
                  <button
                    className="btn btn--primary btn--small"
                    onClick={() => {
                      setLateTime(meeting.id, draft)
                      setLateOpen(false)
                    }}
                  >
                    늦참으로 바꾸기
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <section className="card roster" aria-label="명단">
          <div className="roster-head">
            <h2>참석</h2>
            <span>{meeting.capacity ? `${roster.attend.length}/${meeting.capacity}명` : `${roster.attend.length}명`}</span>
          </div>
          {roster.attend.length === 0 ? (
            <span className="muted">아직 참석한 사람이 없어요</span>
          ) : (
            <ol className="attend-list">
              {roster.attend.map((r, i) => (
                <li key={r.id} className={r.isMe ? 'attend-row attend-row--me' : 'attend-row'}>
                  <span className="attend-no">{i + 1}</span>
                  <span className="attend-name"><MemberName name={r.name} nick={r.nick} /></span>
                  {r.lateTime && <span className="attend-note">{r.lateTime} 도착</span>}
                </li>
              ))}
            </ol>
          )}
          <div className="folds">
            <div className="fold">
              <div className="fold-head"><span>대기</span><span>{roster.wait.length}명</span></div>
              <div className="fold-body"><Chips rows={roster.wait} numbered /></div>
            </div>
            <div className="fold">
              <div className="fold-head"><span>미정</span><span>{roster.maybe.length}명</span></div>
              <div className="fold-body"><Chips rows={roster.maybe} /></div>
            </div>
            <div className="fold">
              <div className="fold-head"><span>불참</span><span>{roster.no.length}명</span></div>
              <div className="fold-body"><Chips rows={roster.no} /></div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
