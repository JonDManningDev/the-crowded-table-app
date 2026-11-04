import { Avatar, Modal, Tag } from '../../../components/ui'
import { Notice } from '../../../components/primitives/Notice'
import type { CommunityProfileDetails } from '../types'
import styles from './CommunityProfilePreviewModal.module.css'

export function CommunityProfilePreviewModal({ profile, shareHistory, historyDisclosure, onClose }: {
  profile: Pick<CommunityProfileDetails, 'name' | 'location' | 'bio' | 'interests'>; shareHistory: boolean
  historyDisclosure: string; onClose: () => void
}) {
  return (
    <Modal title="Your member-facing profile" onClose={onClose}>
      <div className={`member-preview ${styles.preview}`}>
        <Avatar name={profile.name} large tone="peach" />
        <h2>{profile.name}</h2>
        <p>{profile.location}</p>
        <p className="description">{profile.bio}</p>
        <div className="tags">
          {profile.interests.map(interest => (
            <Tag key={interest}>{interest}</Tag>
          ))}
        </div>
        {shareHistory && <Notice icon={false}>{historyDisclosure}</Notice>}
        <Notice icon="lock">

          Visible to community members. Membership settings and private contact details stay private.
        </Notice>
      </div>
    </Modal>
  )
}
