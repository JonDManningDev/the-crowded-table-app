import type { ReactElement } from 'react'
import styles from './GuidanceNote.module.css'

type GuidanceNoteProps = {
  icon?: ReactElement
  children: string
}

export function GuidanceNote({ icon, children }: GuidanceNoteProps) {
  return (
    <div className={styles.note}>
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <div className={styles.body}>{children}</div>
    </div>
  )
}
