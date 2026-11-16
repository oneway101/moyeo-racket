/** 명단의 이름. 별명이 있으면 "실명(별명)"으로, 별명은 조금 작고 옅게 보인다 */
export function MemberName({ name, nick }: { name: string; nick: string }) {
  return (
    <>
      {name}
      {nick && <span className="nick">({nick})</span>}
    </>
  )
}

/** 동그란 이름표에 넣는 한 글자. 세 글자 이름이면 가운데 글자 */
// eslint-disable-next-line react-refresh/only-export-components
export function initialOf(name: string): string {
  return name.slice(-2, -1) || name[0] || ''
}
