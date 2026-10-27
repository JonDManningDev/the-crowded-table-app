import { Button } from '../../../components/primitives/Controls'
import { Icon, Modal } from '../../../components/ui'
import styles from './MembershipPreviewModal.module.css'

export function MembershipPreviewModal({ isMemberPreview, benefits, onChangePreview, onClose }: {
  isMemberPreview: boolean; benefits: string[]; onChangePreview: () => void; onClose: () => void
}) {
  return (
    <Modal
      title={isMemberPreview ? 'A little more belonging, every month' : 'Pull up a chair. Stay a while.'}
      onClose={onClose}
    >
      <div className={styles.content}>
        <span className="round-icon gold"><Icon name="leaf" size={32}/></span>
        <h2>The Crowded Table Membership</h2>
        <div className={styles.price}>L300<span>/ month</span></div>
        <ul className={`benefits ${styles.benefits}`}>
          {benefits.map(benefit => (
            <li key={benefit}><Icon name="check" size={18}/>{benefit}</li>
          ))}
        </ul>
        <p className={styles.disclosure}>
          Interactive preview only. No account, payment, or subscription is created. Changes
          last until you refresh.
        </p>
        <Button
          appearance="primary"
          full
          className="button full"
          onClick={onChangePreview}
        >
          {isMemberPreview ? 'Preview without membership' : 'Try the member experience'}
          <Icon name="arrow" size={18}/>
        </Button>
      </div>
    </Modal>
  )
}
