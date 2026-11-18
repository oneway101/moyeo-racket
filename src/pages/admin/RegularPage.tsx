import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Confirm } from '../../components/Confirm'
import { Hero } from '../../components/Hero'
import { useToast } from '../../components/useToast'
import { useMeetings, type Occurrence, type Template } from '../../data/meetings'
import { offsetText, repeatLabel } from '../../data/recurrence'
import { dateParts, formatKst, kstParts } from '../../data/time'

function dayText(date: string): string {
  const p = dateParts(date)
  return `${p.month}/${p.day}(${p.wd})`
}

/** 한 회차의 설명과 버튼 */
function OccurrenceRow({ o, onSkip }: { o: Occurrence; onSkip: (skip: boolean) => void }) {
  if (o.meeting) {
    const label = o.meeting.status === 'open' ? '투표 진행 중' : o.meeting.status === 'closed' ? '투표 마감' : '시작 전'
    return (
      <li className="occ">
        <div><strong>{dayText(o.date)}</strong><span>{label}</span></div>
        <Link to={`/admin/meetings/${o.meeting.id}`} className="sm-btn sm-btn--green">모임 보기</Link>
      </li>
    )
  }
  if (o.skipped) {
    return (
      <li className="occ occ--skip">
        <div><strong>{dayText(o.date)}</strong><span>이 회차는 건너뛰어요</span></div>
        <button className="sm-btn sm-btn--dark" onClick={() => onSkip(false)}>건너뛰기 취소</button>
      </li>
    )
  }
  return (
    <li className="occ">
      <div><strong>{dayText(o.date)}</strong><span>{formatKst(o.opensAt)} 열림</span></div>
      <button className="sm-btn" onClick={() => onSkip(true)}>건너뛰기</button>
    </li>
  )
}

/** 정기 모임 목록. 다가오는 회차를 보고 건너뛰거나, 설정을 고치거나, 모임을 중단한다 */
export function RegularPage() {
  const { templates, upcomingOf, setSkip, stopTemplate } = useMeetings()
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, say] = useToast()
  const [stopping, setStopping] = useState<Template | null>(null)

  const saved = (location.state as { toast?: string } | null)?.toast
  useEffect(() => {
    if (!saved) return
    say(saved)
    navigate(location.pathname, { replace: true, state: null })
  }, [saved, say, navigate, location.pathname])

  return (
    <>
      <Hero title="정기 모임" dark onBack={() => navigate('/admin/meetings')} backLabel="모임 관리로 돌아가기" />

      {toast && <div role="status" className="alert alert--ok toast">{toast}</div>}

      <div className="section">
        <Link to="/admin/meetings/new?regular=1" className="btn btn--primary btn--small">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          정기 모임 추가
        </Link>

        {templates.length === 0 && (
          <div className="card empty">
            <strong>등록한 정기 모임이 없어요</strong>
            <span className="muted">매주 같은 요일처럼 반복되는 모임을 등록하면 투표가 자동으로 열리고 닫혀요.</span>
          </div>
        )}

        {templates.map((t) => {
          const date = kstParts(t.firstAt).date
          const meta = [
            t.place,
            t.capacity ? `정원 ${t.capacity}명` : '정원 없음',
            t.guestAllowed ? (t.capacity && t.guestInCapacity ? '게스트 정원 포함' : '게스트 허용') : '게스트 안 받음',
          ].filter(Boolean).join(' · ')
          return (
            <div key={t.id} className="card template">
              <strong className="template-title">{t.title}</strong>
              <span className="template-repeat">
                {repeatLabel(t.repeat, date)} {kstParts(t.firstAt).time}
                {t.endDate && ` · ${dayText(t.endDate)}까지`}
              </span>
              <span className="template-meta">{meta}</span>
              <span className="template-meta">
                투표는 {offsetText(t.firstAt, t.openOffset)}에 열리고 {offsetText(t.firstAt, t.closeOffset)}에 마감
              </span>
              <h3 className="occ-head">다가오는 모임</h3>
              <ul className="occ-list">
                {upcomingOf(t, 4).map((o) => (
                  <OccurrenceRow
                    key={o.date}
                    o={o}
                    onSkip={(skip) => {
                      setSkip(t.id, o.date, skip)
                      say(skip ? `${dayText(o.date)} 회차를 건너뛰어요` : `${dayText(o.date)} 회차를 다시 열어요`)
                    }}
                  />
                ))}
              </ul>
              {upcomingOf(t, 1).length === 0 && <span className="hint">종료일까지 남은 회차가 없어요</span>}
              <div className="btn-row">
                <Link to={`/admin/regular/${t.id}/edit`} className="btn btn--ghost btn--small">설정 수정</Link>
                <button className="btn btn--danger-outline btn--small" onClick={() => setStopping(t)}>모임 중단</button>
              </div>
            </div>
          )
        })}
      </div>

      {stopping && (
        <Confirm
          title={`"${stopping.title}" 정기 모임을 중단할까요?`}
          points={[
            '앞으로 예정된 회차와 아직 모임 시각이 지나지 않은 모임이 모두 지워져요.',
            '지난 모임의 참석 내역은 그대로 남아요.',
            '되돌릴 수 없어요.',
          ]}
          action="모임 중단"
          cancelLabel="돌아가기"
          onCancel={() => setStopping(null)}
          onConfirm={() => {
            stopTemplate(stopping.id)
            setStopping(null)
            say('정기 모임을 중단했어요')
          }}
        />
      )}
    </>
  )
}
