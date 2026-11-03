import { Botanical } from '../../../components/ui'
import styles from './DiscussionHero.module.css'

export function DiscussionHero({ className }: { className: string }) {
  return (
    <div className={`${styles['community-hero']} ${className}`}>
      <div>
        <span className="eyebrow">YOUR LITTLE CORNER OF TEGUCIGALPA</span>
        <h2 data-heading="hero">Come for a game.<br />Stay for the people.</h2>
      </div>
      <p>
        Ask a question. Share a favorite.<br />
        Say hello to someone new.<br />
        <strong>There’s a whole community around you.</strong>
      </p>
      <Botanical />
    </div>
  )
}
