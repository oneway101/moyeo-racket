import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClubList } from '../components/ClubList'
import { MeetingCard } from '../components/MeetingCard'
import { Sheet } from '../components/Sheet'
import { usePersisted } from '../components/usePersisted'
import { useAuth } from '../data/auth'
import { useClubs } from '../data/clubs'
import { useMeetings, type Meeting } from '../data/meetings'
import { DOT_ORDER, myStatusOf, type StatusKind } from '../data/status'
import {
  WEEKDAYS_MON, addDate, addMonths, dateParts, daysInMonth, formatSpan, kstParts, mondayOf, todayKst, weekdayMon,
} from '../data/time'

type View = 'day' | 'week' | 'month'
const VIEWS: { view: View; label: string }[] = [
  { view: 'day', label: '일간' }, { view: 'week', label: '주간' }, { view: 'month', label: '월간' },
]
const LEGEND: { kind: StatusKind; label: string }[] = [
  { kind: 'needs', label: '투표 필요' }, { kind: 'attend', label: '참석·늦참' }, { kind: 'wait', label: '대기' },
  { kind: 'soft', label: '불참' }, { kind: 'closed', label: '마감' },
]

const chevron = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const time = (iso: string) => new Date(iso).getTime()
const dayLabel = (date: string) => {
  const p = dateParts(date)
  return `${p.month}월 ${p.day}일 (${p.wd})`
}

/** 홈. 일간, 주간, 월간 달력으로 모임과 내 상태를 보여준다 */
export function HomePage() {
  const { account } = useAuth()
  const { current, myClubs, switchClub } = useClubs()
  const { meetings, now } = useMeetings()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const today = todayKst(now)
  const [view, setView] = usePersisted<View>('moyeo.home.view', 'day')
  const [sel, setSel] = usePersisted<string>('moyeo.home.date', today)

  if (!current) return null

  // 시작 전 모임은 회원 홈에 보이지 않는다. 모임 날짜(한국 시간)별로 묶는다
  const byDate = new Map<string, Meeting[]>()
  for (const m of meetings) {
    if (m.status === 'ready') continue
    const date = kstParts(m.at).date
    byDate.set(date, [...(byDate.get(date) ?? []), m])
  }
  // 같은 날의 모임은 마감이 가까운 순. 마감된 모임은 그 뒤에 온다
  const on = (date: string) =>
    [...(byDate.get(date) ?? [])].sort(
      (a, b) => Number(a.status === 'closed') - Number(b.status === 'closed') || time(a.closesAt) - time(b.closesAt),
    )
  const dotOf = (date: string): StatusKind | null => {
    const kinds = on(date).map((m) => myStatusOf(m).kind)
    return DOT_ORDER.find((k) => kinds.includes(k)) ?? null
  }

  const weekStart = mondayOf(sel)
  const week = Array.from({ length: 7 }, (_, i) => addDate(weekStart, i))
  const sp = dateParts(sel)
  const monthFirst = `${sel.slice(0, 8)}01`

  // 지금 화면에 보이는 날짜 범위
  const inRange = (date: string) =>
    view === 'day' ? date === sel : view === 'week' ? week.includes(date) : date.slice(0, 7) === sel.slice(0, 7)

  // 진행 중인데 아직 투표하지 않은 모임이 보고 있는 날짜 밖에 있으면 바로가기를 띄운다
  const banner = meetings
    .filter((m) => m.status === 'open' && myStatusOf(m).kind === 'needs' && !inRange(kstParts(m.at).date))
    .sort((a, b) => time(a.closesAt) - time(b.closesAt))

  const move = (dir: 1 | -1) => setSel(view === 'month' ? addMonths(sel, dir) : addDate(sel, dir * 7))
  const navLabel =
    view === 'day' ? dayLabel(sel)
    : view === 'week' ? `${dateParts(week[0]).month}/${dateParts(week[0]).day} ~ ${dateParts(week[6]).month}/${dateParts(week[6]).day}`
    : `${sp.year}년 ${sp.month}월`
  const dayList = on(sel)

  return (
    <>
      <header className="hero">
        <div className="hero-ring" />
        <div className="hero-ball" />
        <h1>
          <button className="club-switch" aria-haspopup="dialog" aria-label={`${current.name}, 클럽 바꾸기`} onClick={() => setSheetOpen(true)}>
            <span>{current.name}</span>
            {chevron('m6 9 6 6 6-6')}
          </button>
        </h1>
        <div className="tabs tabs--dark" role="tablist" aria-label="달력 보기">
          {VIEWS.map((v) => (
            <button key={v.view} role="tab" aria-selected={view === v.view} onClick={() => setView(v.view)}>
              {v.label}
            </button>
          ))}
        </div>
      </header>

      <div className="section home">
        {banner.map((m) => {
          const date = kstParts(m.at).date
          const p = dateParts(date)
          return (
            <button key={m.id} className="need-banner" onClick={() => setSel(date)}>
              <span>
                <strong>투표 필요 · {formatSpan(time(m.closesAt) - now)} 남음</strong>
                <span>{p.month}/{p.day}({p.wd}) {m.title}</span>
              </span>
              {chevron('m9 18 6-6-6-6')}
            </button>
          )
        })}

        <div className="cal-nav">
          <button aria-label="이전" onClick={() => move(-1)}>{chevron('m15 18-6-6 6-6')}</button>
          <div aria-live="polite">
            {navLabel}
            {view === 'day' && sel === today && <span className="today-tag">오늘</span>}
          </div>
          <button aria-label="다음" onClick={() => move(1)}>{chevron('m9 18 6-6-6-6')}</button>
        </div>
        {!inRange(today) && (
          <button className="go-today" onClick={() => setSel(today)}>오늘로</button>
        )}

        {view === 'day' && (
          <>
            <div className="strip">
              {week.map((date) => {
                const p = dateParts(date)
                const dot = dotOf(date)
                return (
                  <button
                    key={date}
                    className={`strip-day${date === sel ? ' strip-day--on' : ''}${date === today ? ' strip-day--today' : ''}`}
                    aria-pressed={date === sel}
                    aria-label={`${dayLabel(date)}${dot ? ', 모임 있음' : ''}`}
                    onClick={() => setSel(date)}
                  >
                    <span>{p.wd}</span>
                    <strong>{p.day}</strong>
                    <i className={dot ? `dot dot--${dot}` : 'dot'} />
                  </button>
                )
              })}
            </div>
            {dayList.map((m) => <MeetingCard key={m.id} meeting={m} now={now} size="big" />)}
            {dayList.length === 0 && <p className="cal-empty">이날 모임 없음</p>}
          </>
        )}

        {view === 'week' && (
          <div className="week">
            {week.map((date) => {
              const p = dateParts(date)
              const list = on(date)
              return (
                <div key={date} className={date === today ? 'week-row week-row--today' : 'week-row'}>
                  <div className="week-date">
                    <span>{p.wd}</span>
                    <strong>{p.day}</strong>
                  </div>
                  <div className="week-list">
                    {list.map((m) => <MeetingCard key={m.id} meeting={m} now={now} size="small" hideMin />)}
                    {list.length === 0 && <div className="week-none" />}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {view === 'month' && (
          <>
            <div className="month">
              <div className="month-head">
                {WEEKDAYS_MON.map((wd, i) => <span key={wd} className={i >= 5 ? 'weekend' : undefined}>{wd}</span>)}
              </div>
              <div className="month-grid">
                {Array.from({ length: weekdayMon(monthFirst) }, (_, i) => <span key={`blank-${i}`} />)}
                {Array.from({ length: daysInMonth(sel) }, (_, i) => {
                  const date = addDate(monthFirst, i)
                  const dot = dotOf(date)
                  return (
                    <button
                      key={date}
                      className={`month-day${date === sel ? ' month-day--on' : ''}${date === today ? ' month-day--today' : ''}`}
                      aria-pressed={date === sel}
                      aria-label={`${dayLabel(date)}${dot ? ', 모임 있음' : ''}`}
                      onClick={() => setSel(date)}
                    >
                      <strong>{i + 1}</strong>
                      <i className={dot ? `dot dot--${dot}` : 'dot'} />
                    </button>
                  )
                })}
              </div>
              <div className="legend">
                {LEGEND.map((l) => <span key={l.kind}><i className={`dot dot--${l.kind}`} />{l.label}</span>)}
              </div>
            </div>
            <div className="sel-label">{dayLabel(sel)}{sel === today && <span className="today-tag">오늘</span>}</div>
            {dayList.map((m) => <MeetingCard key={m.id} meeting={m} now={now} size="small" />)}
            {dayList.length === 0 && <p className="cal-empty">이날 모임 없음</p>}
          </>
        )}
      </div>

      {sheetOpen && (
        <Sheet title="내 클럽" onClose={() => setSheetOpen(false)}>
          <ClubList
            clubs={myClubs}
            myName={account?.name ?? ''}
            currentId={current.id}
            onPick={(club) => {
              setSheetOpen(false)
              if (club.status === 'pending') navigate(`/clubs/${club.id}/pending`)
              else switchClub(club.id)
            }}
          />
          <button className="btn btn--outline" onClick={() => navigate('/clubs/enter')}>
            다른 클럽 가입하거나 만들기
          </button>
          <button className="btn btn--ghost" onClick={() => setSheetOpen(false)}>
            닫기
          </button>
        </Sheet>
      )}
    </>
  )
}
