import { Button } from '../../../components/primitives/Controls'
import { Icon, Tag } from '../../../components/ui'
import styles from './CommunityMembershipPanel.module.css'

export function CommunityMembershipPanel({ benefits, isMemberPreview, onOpenMembership }: { benefits: string[]; isMemberPreview: boolean; onOpenMembership: () => void }) {
  return (
    <section className={`panel ${styles['membership-settings']}`}>
      <Tag tone="gold">{isMemberPreview ? 'YOUR MEMBERSHIP' : 'MAKE ROOM FOR MORE'}</Tag>
      <h2>Games. People. Belonging.</h2>
      <p>
        <strong>L300 / month</strong>
        {' · '}
        {isMemberPreview ? 'Active in this preview' : 'A whole community, one membership'}
      </p>
      <ul className="benefits">
        {benefits.map(benefit => (
          <li key={benefit}><Icon name="check" size={18} />{benefit}</li>
        ))}
      </ul>
      <Button appearance="primary" className="button" onClick={onOpenMembership}>
        {isMemberPreview ? 'Manage membership' : 'Become a Member'}
      </Button>
    </section>
  )
}
