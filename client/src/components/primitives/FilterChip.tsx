import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button } from './Controls'
import styles from './FilterChip.module.css'

type FilterChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed' | 'type'> & {
  selected: boolean
}

export function FilterChip({ selected, children, className = '', ...props }: FilterChipProps) {
  return (
    <Button {...props} type="button" appearance="unstyled" aria-pressed={selected}
      className={`${styles.chip} ${className}`}>
      <svg className={styles.check} width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m5 12 4 4L19 6"/>
      </svg>
      <span className={styles.label}>{children}</span>
    </Button>
  )
}

export function FilterChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label} className={styles.group}>{children}</div>
}
