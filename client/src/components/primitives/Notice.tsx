import type { HTMLAttributes, ReactNode } from 'react'
import { Icon } from '../ui'
import styles from './Notice.module.css'

type NoticeProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode
} & (
  | { variant?: 'informational'; icon?: string | false }
  | { variant: 'positive' | 'pending' | 'caution'; icon?: never }
)

export function Notice({ variant = 'informational', icon, children, className = '', ...props }: NoticeProps) {
  const name = variant === 'informational' ? (icon === false ? null : icon || 'info')
    : { positive: 'check-circle', pending: 'clock', caution: 'warning' }[variant]
  return (
    <div {...props} className={`${styles.notice} ${styles[variant]} ${className}`}>
      {name && <span className={styles.icon}><Icon name={name} size={20}/></span>}
      <div className={styles.body}>{children}</div>
    </div>
  )
}
