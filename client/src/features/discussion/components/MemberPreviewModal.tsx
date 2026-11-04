import { Avatar, Icon, Modal, Tag } from '../../../components/ui'
import { GuidanceNote } from '../../../components/shared/GuidanceNote'
import type { DiscussionMember } from '../types'
import styles from './MemberPreviewModal.module.css'

export function MemberPreviewModal({ member, onClose }: { member: DiscussionMember; onClose: () => void }) {
  return (
    <Modal title="Someone around your table" onClose={onClose}>
      <div className="member-preview">
        <Avatar name={member.name} large tone={member.color} />
        <h2>{member.name}</h2>
        <p>{member.location} · Member since {member.memberSince}</p>
        <p className="description">{member.bio}</p>
        <div className="tags">{member.interests.map(interest => <Tag key={interest}>{interest}</Tag>)}</div>
        <div className={styles.guidance}>
          <GuidanceNote icon={<Icon name="people" />}>
            Get to know each other at a shared table. Conversations happen in your confirmed table’s chat.
          </GuidanceNote>
        </div>
      </div>
    </Modal>
  )
}
