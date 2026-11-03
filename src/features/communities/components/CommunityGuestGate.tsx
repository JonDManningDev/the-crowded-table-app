import { Button } from '../../../components/primitives/Controls'
import { Botanical, Icon } from '../../../components/ui'
import styles from './CommunityGuestGate.module.css'

export function CommunityGuestGate({ variant, onOpenMembership }: {
  variant: 'meet-play' | 'discussion'; onOpenMembership: () => void
}) {
  return (
    <section className={styles.gate}>
      <span className="round-icon"><Icon name="lock" size={27}/></span>
      <span className="eyebrow">A LITTLE MORE BELONGING</span>
      <h1>{variant === 'meet-play' ? 'Your people are here.' : 'Come into the conversation.'}</h1>
      <p>
        {variant === 'meet-play'
          ? 'Find local players. Create your own table. Meet people outside your usual gaming circle.'
          : 'Share a favorite game, ask a question, and get to know your private community.'}
      </p>
      <div className={styles.price}>L300<span>/ month</span></div>
      <Button appearance="primary" className="button" onClick={onOpenMembership}>
        Become a Member <Icon name="arrow" size={18}/>
      </Button>
      <small>Meet & Play · Discussion · Game nights · Championship</small>
      <Botanical/>
    </section>
  )
}
