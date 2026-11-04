import { Icon } from '../../components/ui'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span><Icon name="leaf" size={16}/> Good games bring good people together.</span>
      <span>PLAY WELL. BELONG ALWAYS.</span>
    </footer>
  )
}
