import type { Meeting } from './meetings'
import type { Roster } from './votes'

/** 화면에서 색을 나누는 다섯 가지 */
export type StatusKind = 'needs' | 'attend' | 'wait' | 'soft' | 'closed'

export interface MyStatus {
  kind: StatusKind
  text: string
}

/** 모임에서의 내 상태. 홈 카드와 날짜 점에 쓴다 */
export function myStatusOf(meeting: Meeting, roster: Roster): MyStatus {
  const { place, mine } = roster
  const text =
    place.state === 'attend' ? (mine?.choice === 'late' ? '늦참' : '참석')
    : place.state === 'wait' ? `대기 ${place.no}번`
    : place.state === 'no' ? '불참'
    : '미정'

  if (meeting.status !== 'open') return { kind: 'closed', text: roster.canceled ? '취소됨' : text }
  // 진행 중인데 아직 투표하지 않은 모임은 정원이 찼든 아니든 "투표 필요"
  if (place.state === 'none') return { kind: 'needs', text: '투표 필요' }
  return { kind: place.state === 'attend' ? 'attend' : place.state === 'wait' ? 'wait' : 'soft', text }
}

/** "참석 8/16 대기 2", 정원이 없으면 "참석 21명" */
export function attendLine(meeting: Meeting, roster: Roster): string {
  const base = meeting.capacity ? `참석 ${roster.attendCount}/${meeting.capacity}` : `참석 ${roster.attendCount}명`
  return roster.wait.length > 0 ? `${base} 대기 ${roster.wait.length}` : base
}

/** 같은 날 여러 모임이 있을 때 날짜 점에 쓸 상태. 앞에 있을수록 먼저 고른다 */
export const DOT_ORDER: StatusKind[] = ['needs', 'attend', 'wait', 'soft', 'closed']
