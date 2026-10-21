import { Button } from './primitives/Controls'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
    people: (
      <>
        <circle cx="9" cy="7" r="3"/>
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>
      </>
    ),
    trophy: (
      <>
        <path d="M7 3h10v6a5 5 0 0 1-10 0zM12 14v6m-4 1h8M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4"/>
      </>
    ),
    chat: <path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z"/>,
    user: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M7 2v6m10-6v6M3 11h18m-13 4h2m4 0h2"/>
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/>
        <circle cx="12" cy="10" r="2"/>
      </>
    ),
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    plus: <path d="M12 4v16M4 12h16"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2"/>
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>
      </>
    ),
    check: <path d="m5 12 4 4L19 6"/>,
    bell: <><path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5zm5 3a2 2 0 0 0 4 0"/></>,
    leaf: <><path d="M4 20C4 8 8 3 21 3c0 13-5 17-13 14M4 20 16 8"/></>,
    dice: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="4"/>
        <path d="M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01" strokeWidth="3"/>
      </>
    ),
    star: <path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>,
    settings: (
      <>
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>
      </>
    ),
    heart: <path d="M12 21 3 12C-3 4 7-1 12 6 17-1 27 4 21 12Z"/>,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.dice}
    </svg>
  )
}

export function Avatar({ name, large = false, tone = '' }: { name: string; large?: boolean; tone?: string }) {
  const initials = name === 'You' ? 'AM' : name.split(' ').map(word => word[0]).join('').slice(0, 2)
  const color = tone || ['sage', 'peach', 'gold', 'lavender'][name.length % 4]
  return <span aria-hidden="true" className={`avatar ${large ? 'large' : ''} ${color}`}>{initials}</span>
}

export function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>
}

export function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  )
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="tabs" aria-label="View options">
      {items.map(item => (
        <Button
          appearance="unstyled"
          key={item}
          className={item === value ? 'active' : ''}
          aria-pressed={item === value}
          onClick={() => onChange(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name="leaf" size={32}/>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.showModal()
    return () => {
      dialog?.close()
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? 'wide' : ''}
      onCancel={onClose}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <Button appearance="unstyled" className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <Icon name="close"/>
        </Button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  )
}

export function Botanical() {
  return (
    <svg className="botanical" viewBox="0 0 120 200" fill="none" aria-hidden="true">
      <path d="M24 190C65 124 65 59 90 8" stroke="currentColor" strokeWidth="2"/>
      {[0, 1, 2, 3, 4].map(index => (
        <g
          key={index}
          transform={`translate(${32 + index * 9} ${153 - index * 31}) rotate(${index % 2 ? -30 : 5})`}
        >
          <path
            d="M0 0C-45-5-37-36-37-36-6-34 1-13 0 0Z"
            fill="currentColor"
            opacity=".17"
            stroke="currentColor"
          />
          <path
            d="M3-8C43-19 31-47 31-47 8-35 2-21 3-8Z"
            fill="currentColor"
            opacity=".28"
            stroke="currentColor"
          />
        </g>
      ))}
    </svg>
  )
}
