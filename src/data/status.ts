import type { Meeting } from './meetings'

/**
 * 모임에서의 내 상태와 참석 인원.
 * 투표 기능을 만들기 전이라 지금은 모두 투표하지 않은 것으로 본다.
 */

/** 화면에서 색을 나누는 다섯 가지 */
export type StatusKind = 'needs' | 'attend' | 'wait' | 'soft' | 'closed'

export interface MyStatus {
  kind: StatusKind
  text: string
}

export function myStatusOf(meeting: Meeting): MyStatus {
  // 진행 중인데 아직 투표하지 않은 모임은 정원이 찼든 아니든 "투표 필요"
  if (meeting.status === 'open') return { kind: 'needs', text: '투표 필요' }
  return { kind: 'closed', text: '미정' }
}

export interface Counts {
  attend: number
  wait: number
}

export function countsOf(meeting: Meeting): Counts {
  // 투표 기능을 만들면 이 모임의 실제 인원으로 바뀐다
  void meeting
  return { attend: 0, wait: 0 }
}

/** "참석 8/16 대기 2", 정원이 없으면 "참석 21명" */
export function attendLine(meeting: Meeting): string {
  const c = countsOf(meeting)
  const base = meeting.capacity ? `참석 ${c.attend}/${meeting.capacity}` : `참석 ${c.attend}명`
  return c.wait > 0 ? `${base} 대기 ${c.wait}` : base
}

/** 같은 날 여러 모임이 있을 때 날짜 점에 쓸 상태. 앞에 있을수록 먼저 고른다 */
export const DOT_ORDER: StatusKind[] = ['needs', 'attend', 'wait', 'soft', 'closed']
