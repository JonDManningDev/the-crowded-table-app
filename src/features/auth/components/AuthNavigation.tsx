import { Link } from '../../../components/primitives/Controls'
import { authPaths, pagePaths } from '../../../app/navigation'
import styles from './AuthNavigation.module.css'

export function AuthNavigation({ busy }: { busy: boolean }) {
  return <div className={styles.links}>{busy ? <span>Please wait…</span> : <>
    <Link to={authPaths.signin}>Sign in</Link>
    <Link to={authPaths.forgot}>Forgot password?</Link>
    <Link to={authPaths.check}>Resend confirmation</Link>
    <Link to={pagePaths['my-home']}>Back to My Home</Link>
  </>}</div>
}
