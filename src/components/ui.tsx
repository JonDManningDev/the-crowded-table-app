import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Art } from '../mock/data'

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
    people: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/></>,
    trophy: <><path d="M7 3h10v6a5 5 0 0 1-10 0zM12 14v6m-4 1h8M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4"/></>,
    chat: <path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z"/>,
    user: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h2m4 0h2"/></>,
    pin: <><path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    plus: <path d="M12 4v16M4 12h16"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    bell: <><path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5zm5 3a2 2 0 0 0 4 0"/></>,
    leaf: <><path d="M4 20C4 8 8 3 21 3c0 13-5 17-13 14M4 20 16 8"/></>,
    dice: <><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01" strokeWidth="3"/></>,
    star: <path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>,
    settings: <><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>,
    heart: <path d="M12 21 3 12C-3 4 7-1 12 6 17-1 27 4 21 12Z"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.dice}</svg>
}
export function Avatar({ name, large = false, tone = '' }: { name: string; large?: boolean; tone?: string }) {
  return <span aria-hidden="true" className={`avatar ${large ? 'large' : ''} ${tone || ['sage', 'peach', 'gold', 'lavender'][name.length % 4]}`}>{name === 'You' ? 'AM' : name.split(' ').map(word => word[0]).join('').slice(0, 2)}</span>
}
export function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) { return <span className={`tag ${tone}`}>{children}</span> }
export function Heading({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div>
}
export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="tabs" aria-label="View options">{items.map(item => <button key={item} className={item === value ? 'active' : ''} aria-pressed={item === value} onClick={() => onChange(item)}>{item}</button>)}</div>
}
export function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="empty"><Icon name="leaf" size={32}/><h3>{title}</h3><p>{children}</p></div> }
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.showModal()
    return () => { dialog?.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} className={wide ? 'wide' : ''} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}><div className="modal-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div><div className="modal-content">{children}</div></dialog>
}
export function Botanical() {
  return <svg className="botanical" viewBox="0 0 120 200" fill="none" aria-hidden="true"><path d="M24 190C65 124 65 59 90 8" stroke="currentColor" strokeWidth="2"/>{[0, 1, 2, 3, 4].map(i => <g key={i} transform={`translate(${32 + i * 9} ${153 - i * 31}) rotate(${i % 2 ? -30 : 5})`}><path d="M0 0C-45-5-37-36-37-36-6-34 1-13 0 0Z" fill="currentColor" opacity=".17" stroke="currentColor"/><path d="M3-8C43-19 31-47 31-47 8-35 2-21 3-8Z" fill="currentColor" opacity=".28" stroke="currentColor"/></g>)}</svg>
}
export function GameArt({ type, className = '' }: { type: Art; className?: string }) {
  const palettes: Record<Art, string[]> = { azul: ['#e8bc80', '#19636b', '#ce6c49'], birds: ['#d7dfd0', '#f8f0de', '#b6744e'], rpg: ['#253c35', '#b18050', '#e3c28b'], social: ['#c17956', '#efe0b9', '#374d41'], rail: ['#e2c294', '#3f6058', '#a8513a'], forest: ['#8b9e81', '#355747', '#eadcb9'], mystery: ['#463c48', '#a88466', '#e7c699'] }
  const [bg, one, two] = palettes[type]
  return <div className={`game-art art-${type} ${className}`}><svg viewBox="0 0 480 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="480" height="280" fill={bg}/><circle cx="420" cy="30" r="160" fill={one} opacity=".12"/><circle cx="40" cy="250" r="130" fill={two} opacity=".16"/>
    {type === 'azul' ? <g transform="translate(20,-25) rotate(12 240 140)">{Array.from({ length: 35 }, (_, i) => <g key={i} transform={`translate(${(i % 7) * 76},${Math.floor(i / 7) * 76})`}><rect width="68" height="68" rx="3" fill={i % 3 ? '#f4ead7' : one}/><path d="M34 5 44 24 63 34 44 44 34 63 24 44 5 34 24 24Z" fill={i % 3 ? two : '#e8c482'}/><circle cx="34" cy="34" r="10" fill={i % 3 ? one : two}/></g>)}</g> : type === 'birds' ? <g><path d="M0 236Q100 190 220 215T480 195" stroke={one} strokeWidth="7" fill="none"/>{[0, 1, 2].map(i => <g key={i} transform={`translate(${100 + i * 135} ${135 - i * 20}) rotate(${i * 8 - 12})`}><ellipse rx="47" ry="31" fill={i % 2 ? '#658888' : two}/><circle cx="32" cy="-27" r="23" fill={i % 2 ? '#658888' : two}/><path d="m-34 10-55 38 18-47M53-30l22 9-23 4" fill={one}/><path d="M-25-8Q13-25 20 12Q-9 24-25-8" fill={one}/><circle cx="38" cy="-32" r="3" fill="#253c35"/><path d="m-6 30-4 41m22-41 4 41" stroke="#5e5544" strokeWidth="3"/></g>)}</g> : type === 'rail' ? <g><path d="M-30 230Q90 90 215 145T510 55M-30 243Q90 103 215 158T510 68" fill="none" stroke={one} strokeWidth="4"/>{Array.from({ length: 10 }, (_, i) => <rect key={i} x={15 + i * 50} y={128 + Math.sin(i) * 45} width="34" height="12" rx="3" transform={`rotate(-12 ${15 + i * 50} 150)`} fill={two}/>)}<g transform="translate(190 65)"><rect width="110" height="70" rx="6" fill={one}/><rect x="15" y="-35" width="45" height="40" rx="3" fill={one}/><rect x="75" y="-24" width="15" height="30" fill={two}/><circle cx="20" cy="72" r="16" fill={two}/><circle cx="84" cy="72" r="16" fill={two}/><rect x="23" y="-25" width="26" height="20" fill={bg}/></g></g> : type === 'forest' ? <g>{[30, 105, 210, 325, 430].map((x, i) => <g key={x} transform={`translate(${x} ${30 + i % 2 * 30})`}><path d="M0 0-65 125h35l-50 55H80l-50-55h35Z" fill={i % 2 ? one : '#577660'}/><path d="M0 135v90" stroke={two} strokeWidth="7"/></g>)}<circle cx="340" cy="48" r="22" fill={two}/></g> : <g transform="translate(235 140) rotate(-15)"><rect x="-160" y="-78" width="110" height="154" rx="10" fill={one} transform="rotate(-10)"/><rect x="60" y="-72" width="105" height="146" rx="10" fill={two} transform="rotate(18)"/><path d="m0-87 82 52v85L0 95-78 47v-82Z" fill={bg} stroke={two} strokeWidth="4"/><path d="M0-87-40 20l122-55L0 95-40 20l-38 27L0-87 40 22-78-35M40 22 0 95" stroke={two} fill="none" strokeWidth="2"/><text x="0" y="16" fill={one} fontSize="40" textAnchor="middle" fontFamily="Georgia">{type === 'social' ? '?' : type === 'mystery' ? '♠' : '20'}</text></g>}
  </svg></div>
}
