import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Hero } from '../../components/Hero'
import { useToast } from '../../components/useToast'
import { useMeetings, type Meeting, type MeetingStatus } from '../../data/meetings'
import { attendLine } from '../../data/status'
import { formatKst, formatKstDay, formatSpan } from '../../data/time'
import { useVotes, type Roster } from '../../data/votes'

const LABEL: Record<MeetingStatus, string> = { open: '진행 중', ready: '시작 전', closed: '마감' }

function rightText(m: Meeting, now: number): string {
  if (m.status === 'open') return `마감 ${formatSpan(new Date(m.closesAt).getTime() - now)} 남음`
  if (m.status === 'ready') return `${formatSpan(new Date(m.opensAt).getTime() - now)} 뒤 열림`
  return `${formatKstDay(m.closesAt)} 마감`
}

function countText(m: Meeting, roster: Roster): string {
  if (m.status === 'ready') return m.capacity ? `정원 ${m.capacity}명` : '정원 없음'
  return attendLine(m, roster).replace(' 대기', ' · 대기')
}

const time = (iso: string) => new Date(iso).getTime()

/** 모임 관리 목록. 시작 전, 진행 중, 마감된 모임을 모두 보여준다 */
export function MeetingsPage() {
  const { meetings, now } = useMeetings()
  const { rosterOf } = useVotes()
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, say] = useToast()

  // 모임을 만들거나 고친 직후에는 안내를 한 번 보여준다
  const saved = (location.state as { toast?: string } | null)?.toast
  useEffect(() => {
    if (!saved) return
    say(saved)
    navigate(location.pathname, { replace: true, state: null })
  }, [saved, say, navigate, location.pathname])

  const groups: { status: MeetingStatus; items: Meeting[] }[] = [
    { status: 'open', items: meetings.filter((m) => m.status === 'open').sort((a, b) => time(a.closesAt) - time(b.closesAt)) },
    { status: 'ready', items: meetings.filter((m) => m.status === 'ready').sort((a, b) => time(a.opensAt) - time(b.opensAt)) },
    { status: 'closed', items: meetings.filter((m) => m.status === 'closed').sort((a, b) => time(b.at) - time(a.at)) },
  ]

  return (
    <>
      <Hero title="모임 관리" dark onBack={() => navigate('/admin')} backLabel="관리로 돌아가기" />

      {toast && <div role="status" className="alert alert--ok toast">{toast}</div>}

      <div className="section">
        <Link to="/admin/meetings/new" className="btn btn--primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          새 모임 만들기
        </Link>

        {meetings.length === 0 && (
          <div className="card empty">
            <strong>아직 만든 모임이 없어요</strong>
            <span className="muted">위의 버튼으로 첫 모임을 만들어 보세요.</span>
          </div>
        )}

        {meetings.length > 0 &&
          groups.map((g) => (
            <section key={g.status} className="meeting-group" aria-label={LABEL[g.status]}>
              <div className="group-head">
                <h2>{LABEL[g.status]}</h2>
                <span>{g.items.length}개</span>
              </div>
              {g.items.length === 0 && <span className="hint pad">{LABEL[g.status]} 모임이 없어요</span>}
              {g.items.map((m) => (
                <Link key={m.id} to={`/admin/meetings/${m.id}`} className={`meeting-card meeting-card--${m.status}`}>
                  <div className="meeting-card-top">
                    <span className={`pill pill--${m.status}`}>{LABEL[m.status]}</span>
                    <span className="meeting-right">{rightText(m, now)}</span>
                  </div>
                  <strong>{m.title}</strong>
                  <div className="meeting-card-bottom">
                    <span>{formatKst(m.at)}</span>
                    <span>{countText(m, rosterOf(m))}</span>
                  </div>
                </Link>
              ))}
            </section>
          ))}
      </div>
    </>
  )
}
