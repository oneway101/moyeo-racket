import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Confirm } from '../components/Confirm'
import { FixGuide } from '../components/FixGuide'
import { initialOf } from '../components/MemberName'
import { useToast } from '../components/useToast'
import { useAuth } from '../data/auth'
import { NICK_MAX, displayName, useClubs } from '../data/clubs'
import { NOTIFY_TYPES, clearDeviceNotify, useNotify, type DeviceState } from '../data/notify'

const DEVICE_TEXT: Record<DeviceState, { label: string; desc: string }> = {
  on: { label: '켜짐', desc: '이 휴대폰으로 알림이 와요.' },
  off: { label: '꺼짐', desc: '켜면 이 휴대폰으로 알림이 와요.' },
  blocked: { label: '켤 수 없음', desc: '휴대폰 설정에서 알림이 차단돼 있어요.' },
  ios: { label: '켤 수 없음', desc: '아이폰은 홈 화면에 추가해야 알림을 받을 수 있어요.' },
  kakao: { label: '켤 수 없음', desc: '카카오톡 안에서 연 화면에서는 알림을 켤 수 없어요.' },
  unsupported: { label: '켤 수 없음', desc: '이 브라우저는 알림을 지원하지 않아요.' },
}
const chevron = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
)

/** 내 정보. 이름과 역할, 알림 설정, 이 클럽의 별명, 내 클럽, 로그아웃 */
export function MyInfoPage() {
  const { account, logout } = useAuth()
  const { current, updateNick, soleAdmin, leaveClub } = useClubs()
  const { device, turnOn, turnOff, recheck, types, setType } = useNotify()
  const navigate = useNavigate()
  const [toast, say] = useToast()
  const [nick, setNick] = useState(current?.nick ?? '')
  const [guideOpen, setGuideOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  if (!current || !account?.name) return null
  const name = account.name
  const locked = device !== 'on' && device !== 'off'
  const text = DEVICE_TEXT[device]
  const nickChanged = nick.trim() !== current.nick

  return (
    <>
      <header className="hero me-hero">
        <div className="hero-ring" />
        <div className="hero-ball" />
        <h1>내 정보</h1>
        <div className="me-person">
          <span className="me-avatar" aria-hidden="true">{initialOf(name)}</span>
          <div>
            <strong>{name}{current.nick && <span className="me-nick">({current.nick})</span>}</strong>
            <span className="badge badge--admin">{current.role === 'admin' ? '운영진' : '회원'}</span>
          </div>
        </div>
      </header>

      {toast && <div role="status" className="alert alert--ok toast">{toast}</div>}

      <div className="section">
        <div className={`card notify-card${locked ? ' notify-card--locked' : ''}`}>
          <div className="toggle-row">
            <span>
              <strong>이 기기에서 알림 받기</strong>
              <span className={device === 'on' ? 'state-on' : undefined}>{text.label}</span>
            </span>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={device === 'on'}
              aria-label="이 기기에서 알림 받기"
              disabled={locked}
              onClick={async () => {
                if (device === 'on') {
                  turnOff()
                  say('이 기기의 알림을 껐어요')
                } else {
                  await turnOn()
                }
              }}
            >
              <span />
            </button>
          </div>
          <span className="hint">{text.desc}</span>
          {locked && (
            <button className="link-btn" onClick={() => setGuideOpen(true)}>해결 방법 보기 {chevron}</button>
          )}
        </div>

        <div className="card notify-card">
          <div className="roster-head">
            <h2>받을 알림</h2>
            <span>내 모든 기기에 적용</span>
          </div>
          <ul className="type-list">
            {NOTIFY_TYPES.map((t) => (
              <li key={t.type} className="toggle-row">
                <span>
                  <strong>{t.label}</strong>
                  <span>{t.desc}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  className="switch"
                  aria-checked={types[t.type]}
                  aria-label={t.label}
                  onClick={() => setType(t.type, !types[t.type])}
                >
                  <span />
                </button>
              </li>
            ))}
          </ul>
          {device !== 'on' && <p className="hint">이 휴대폰은 알림이 꺼져 있어 받지 않아요. 다른 기기에는 적용돼요.</p>}
        </div>

        <form
          className="card form-card"
          onSubmit={(e) => {
            e.preventDefault()
            if (!nickChanged) return
            updateNick(nick)
            setNick(nick.trim())
            say('별명을 바꿨어요')
          }}
        >
          <label className="field field--compact">
            <span>이 클럽에서 쓰는 별명</span>
            <input value={nick} onChange={(e) => setNick(e.target.value.slice(0, NICK_MAX))} maxLength={NICK_MAX} placeholder="비우면 실명만 보여요" />
          </label>
          <span className="hint">
            {current.name} 명단에 "{displayName(name, nick.trim())}"로 보여요. 별명은 클럽마다 따로 정하고, 실명은 바꿀 수 없어요.
          </span>
          <button type="submit" className="btn btn--primary btn--small" disabled={!nickChanged}>별명 저장</button>
        </form>

        <div className="card link-card">
          <Link to="/clubs" className="link-row">
            <span>
              <strong>내 클럽</strong>
              <span>가입한 클럽 보기, 다른 클럽 가입하거나 만들기</span>
            </span>
            {chevron}
          </Link>
          <button className="link-row link-row--danger" onClick={() => setLeaving(true)}>
            <span><strong>이 클럽 나가기</strong></span>
            {chevron}
          </button>
        </div>

        <button
          className="btn btn--ghost"
          onClick={() => {
            clearDeviceNotify()
            logout()
            navigate('/', { replace: true })
          }}
        >
          로그아웃
        </button>
        <p className="hint center">로그아웃하면 이 기기의 알림도 꺼져요</p>
      </div>

      {guideOpen && (
        <FixGuide
          state={device}
          onClose={() => setGuideOpen(false)}
          onRecheck={() => {
            recheck()
            setGuideOpen(false)
          }}
        />
      )}

      {leaving && soleAdmin && (
        <Confirm
          title="지금은 나갈 수 없어요"
          points={[
            '이 클럽의 운영진이 나 혼자예요.',
            '회원 관리에서 다른 회원을 운영진으로 지정한 뒤에 나갈 수 있어요.',
            '클럽을 없애려면 관리의 클럽 설정에서 클럽을 삭제해 주세요.',
          ]}
          onCancel={() => setLeaving(false)}
        />
      )}
      {leaving && !soleAdmin && (
        <Confirm
          title={`${current.name}에서 나갈까요?`}
          points={[
            '이 클럽의 모임과 명단을 볼 수 없게 돼요.',
            '이미 한 투표와 게스트는 그대로 남아요. 빼려면 나가기 전에 취소해 주세요.',
            '다시 들어오려면 초대 링크로 가입 신청을 하고 승인을 받아야 해요.',
          ]}
          action="나가기"
          onCancel={() => setLeaving(false)}
          onConfirm={() => {
            leaveClub()
            setLeaving(false)
            navigate('/', { replace: true })
          }}
        />
      )}
    </>
  )
}
