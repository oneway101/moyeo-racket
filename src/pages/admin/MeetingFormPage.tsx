import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Hero } from '../../components/Hero'
import {
  CAPACITY_MAX, OPEN_DAYS_MAX, PLACE_MAX, TITLE_MAX, useMeetings,
  type CloseRule, type Meeting, type OpenRule,
} from '../../data/meetings'
import { addDays, formatKst, kstParts, kstToIso } from '../../data/time'

const OPEN_OPTIONS: { rule: OpenRule; label: string }[] = [
  { rule: 14, label: '2주 전' }, { rule: 7, label: '7일 전' }, { rule: 3, label: '3일 전' },
  { rule: 1, label: '1일 전' }, { rule: 'custom', label: '직접 선택' },
]
const CLOSE_OPTIONS: { rule: CloseRule; label: string }[] = [
  { rule: 1, label: '하루 전' }, { rule: 3, label: '3일 전' }, { rule: 5, label: '5일 전' },
  { rule: 'custom', label: '직접 선택' },
]

interface Form {
  title: string
  date: string
  time: string
  place: string
  cap: string
  minP: string
  openRule: OpenRule
  openDate: string
  openTime: string
  closeRule: CloseRule
  closeDate: string
  closeTime: string
  guestOn: boolean
  guestCap: boolean
}

function initialForm(m: Meeting | null): Form {
  if (!m) {
    return {
      title: '', date: '', time: '', place: '', cap: '', minP: '',
      openRule: 7, openDate: '', openTime: '', closeRule: 1, closeDate: '', closeTime: '',
      guestOn: true, guestCap: true,
    }
  }
  const at = kstParts(m.at), open = kstParts(m.opensAt), close = kstParts(m.closesAt)
  return {
    title: m.title, date: at.date, time: at.time, place: m.place,
    cap: m.capacity ? String(m.capacity) : '', minP: m.minPeople ? String(m.minPeople) : '',
    openRule: m.openRule, openDate: open.date, openTime: open.time,
    closeRule: m.closeRule, closeDate: close.date, closeTime: close.time,
    guestOn: m.guestAllowed, guestCap: m.guestInCapacity,
  }
}

/** 숫자만 남기고, 1부터 999까지만 받는다 */
function cleanCount(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+/, '').slice(0, 3)
  return digits && Number(digits) > CAPACITY_MAX ? String(CAPACITY_MAX) : digits
}

/** 날짜와 시각을 함께 고르는 칸. 날짜를 오늘로 바꾸면 시각도 지금으로 맞춘다 */
function DateTimeFields(props: {
  date: string
  time: string
  onChange: (date: string, time: string) => void
  label: string
}) {
  return (
    <div className="datetime">
      <input
        type="date"
        value={props.date}
        aria-label={`${props.label} 날짜`}
        onChange={(e) => {
          const date = e.target.value
          const nowKst = kstParts(new Date().toISOString())
          props.onChange(date, date === nowKst.date && date !== props.date ? nowKst.time : props.time)
        }}
      />
      <input
        type="time"
        value={props.time}
        aria-label={`${props.label} 시각`}
        onChange={(e) => props.onChange(props.date, e.target.value)}
      />
    </div>
  )
}

/** 새 모임과 모임 수정. 입력 항목이 같다 */
export function MeetingFormPage() {
  const { id } = useParams()
  const { getMeeting, createMeeting, updateMeeting, now } = useMeetings()
  const navigate = useNavigate()
  const editing = id ? getMeeting(id) : null
  const [f, setF] = useState<Form>(() => initialForm(editing))
  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }))

  if (id && !editing) return <Navigate to="/admin/meetings" replace />

  const at = kstToIso(f.date, f.time)
  // 며칠 전을 골라 두면 모임 일시를 바꿀 때 시작과 마감도 같이 옮겨진다
  const opensAt = f.openRule === 'custom' ? kstToIso(f.openDate, f.openTime) : at && addDays(at, -f.openRule)
  const closesAt = f.closeRule === 'custom' ? kstToIso(f.closeDate, f.closeTime) : at && addDays(at, -f.closeRule)

  const cap = f.cap ? Number(f.cap) : null
  const minP = f.minP ? Number(f.minP) : null
  const minError = cap !== null && minP !== null && minP > cap

  const t = (iso: string) => new Date(iso).getTime()
  let timeError = ''
  if (at && opensAt && closesAt) {
    if (t(opensAt) < t(addDays(at, -OPEN_DAYS_MAX))) timeError = `투표 시작은 모임 ${OPEN_DAYS_MAX}일 전부터 고를 수 있어요.`
    else if (t(closesAt) <= t(opensAt)) timeError = '마감은 시작보다 뒤여야 해요.'
    else if (t(closesAt) > t(at)) timeError = '마감은 모임 시각보다 늦을 수 없어요.'
    else if (!editing && t(closesAt) <= now) timeError = '마감 시각이 이미 지났어요. 모임 일시나 마감을 바꿔 주세요.'
  }

  // 게스트를 정원에 포함할지는 게스트를 허용하고 정원이 있을 때만 고를 수 있다
  const guestCapLocked = !f.guestOn ? '게스트 허용을 켜면 고를 수 있어요' : cap === null ? '정원이 없으면 게스트도 바로 참석해요' : ''
  const guestCapOn = f.guestOn && cap !== null && f.guestCap

  const ready = f.title.trim().length > 0 && !!at && !!opensAt && !!closesAt && !minError && !timeError

  const submit = () => {
    if (!ready || !at || !opensAt || !closesAt) return
    const input = {
      title: f.title.trim(), at, place: f.place.trim(), capacity: cap, minPeople: minP,
      openRule: f.openRule, opensAt, closeRule: f.closeRule, closesAt,
      guestAllowed: f.guestOn, guestInCapacity: guestCapOn,
    }
    if (editing) updateMeeting(editing.id, input)
    else createMeeting(input)
    navigate('/admin/meetings', { replace: true, state: { toast: editing ? '모임을 고쳤어요' : '모임을 만들었어요' } })
  }

  const resultText = (iso: string | null, verb: string) => (iso ? `${formatKst(iso)}에 ${verb}` : '모임 일시를 고르면 알려 드려요')

  return (
    <>
      <Hero title={editing ? '모임 수정' : '새 모임'} dark onBack={() => navigate('/admin/meetings')} backLabel="모임 관리로 돌아가기" />

      <form
        className="section"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="card form-card">
          <label className="field field--compact">
            <span>제목 <b className="req">*</b></span>
            <input
              value={f.title}
              onChange={(e) => set({ title: e.target.value.slice(0, TITLE_MAX) })}
              maxLength={TITLE_MAX}
              placeholder="예: 토요일 아침 정기 모임"
            />
          </label>
          <div className="field field--compact">
            <span>모임 일시 <b className="req">*</b></span>
            <DateTimeFields label="모임" date={f.date} time={f.time} onChange={(date, time) => set({ date, time })} />
          </div>
          <label className="field field--compact">
            <span>장소</span>
            <input
              value={f.place}
              onChange={(e) => set({ place: e.target.value.slice(0, PLACE_MAX) })}
              maxLength={PLACE_MAX}
              placeholder="예: 남산 실내 코트"
            />
          </label>
          <label className="field field--compact">
            <span>정원</span>
            <div className="with-unit">
              <input inputMode="numeric" value={f.cap} onChange={(e) => set({ cap: cleanCount(e.target.value) })} placeholder="비우면 제한 없음" />
              <span>명</span>
            </div>
          </label>
          <label className="field field--compact">
            <span>최소 인원</span>
            <div className="with-unit">
              <input
                inputMode="numeric"
                value={f.minP}
                onChange={(e) => set({ minP: cleanCount(e.target.value) })}
                placeholder="비우면 자동 취소 없음"
                aria-invalid={minError}
                className={minError ? 'input--error' : undefined}
              />
              <span>명</span>
            </div>
            {minError ? (
              <span className="field-error" role="alert">최소 인원은 정원보다 클 수 없어요</span>
            ) : (
              <span className="hint">마감 때 참석 인원이 이보다 적으면 모임이 자동으로 취소돼요</span>
            )}
          </label>
        </div>

        <div className="card form-card">
          <div className="field field--compact">
            <span>투표 시작</span>
            <div className="chips">
              {OPEN_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={f.openRule === o.rule}
                  onClick={() => {
                    // 직접 선택으로 바꿀 때는 지금 계산된 시각에서 시작한다
                    const base = opensAt ? kstParts(opensAt) : null
                    set({ openRule: o.rule, ...(o.rule === 'custom' && base ? { openDate: base.date, openTime: base.time } : {}) })
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {f.openRule === 'custom' ? (
              <DateTimeFields label="투표 시작" date={f.openDate} time={f.openTime} onChange={(openDate, openTime) => set({ openDate, openTime })} />
            ) : (
              <span className="hint">{resultText(opensAt, '열려요')}</span>
            )}
          </div>
          <div className="field field--compact">
            <span>투표 마감</span>
            <div className="chips">
              {CLOSE_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={f.closeRule === o.rule}
                  onClick={() => {
                    const base = closesAt ? kstParts(closesAt) : null
                    set({ closeRule: o.rule, ...(o.rule === 'custom' && base ? { closeDate: base.date, closeTime: base.time } : {}) })
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {f.closeRule === 'custom' ? (
              <DateTimeFields label="투표 마감" date={f.closeDate} time={f.closeTime} onChange={(closeDate, closeTime) => set({ closeDate, closeTime })} />
            ) : (
              <span className="hint">{resultText(closesAt, '마감돼요')}</span>
            )}
          </div>
          {timeError && <span className="field-error" role="alert">{timeError}</span>}
        </div>

        <div className="card form-card">
          <div className="toggle-row">
            <span>
              <strong>게스트 허용</strong>
              <span>회원 1명당 1명까지</span>
            </span>
            <button type="button" role="switch" className="switch" aria-checked={f.guestOn} aria-label="게스트 허용" onClick={() => set({ guestOn: !f.guestOn })}>
              <span />
            </button>
          </div>
          <div className="toggle-row">
            <span>
              <strong>게스트를 정원에 포함</strong>
              <span>{guestCapLocked || '포함하면 회원이 먼저, 마감 때 남는 자리로 들어가요'}</span>
            </span>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={guestCapOn}
              aria-label="게스트를 정원에 포함"
              disabled={!!guestCapLocked}
              onClick={() => set({ guestCap: !f.guestCap })}
            >
              <span />
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn--primary" disabled={!ready}>
          {editing ? '저장' : '모임 만들기'}
        </button>
      </form>
    </>
  )
}
