import styles from './AuthFeedback.module.css'

export function AuthFeedback({ error, notice, placement = 'page' }: { error: string; notice: string; placement?: 'page' | 'shell' }) {
  if (placement === 'shell') return error || notice ? <p className={styles.feedback} role={error ? 'alert' : 'status'}>{error || notice}</p> : null
  // Retain the shared error hook until CreateCommunity/account exclusions are migrated.
  return <>{error && <p className={`auth-error ${styles.error}`} role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</>
}
