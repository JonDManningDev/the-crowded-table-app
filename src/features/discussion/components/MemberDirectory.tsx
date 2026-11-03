import { Button } from '../../../components/primitives/Controls'
import { Avatar, Empty, Icon, Tag } from '../../../components/ui'
import type { DiscussionMember } from '../types'
import styles from './MemberDirectory.module.css'

export function MemberDirectory({ members, searchQuery, onSearchChange, onOpenMember }: {
  members: DiscussionMember[]; searchQuery: string; onSearchChange: (value: string) => void; onOpenMember: (name: string) => void
}) {
  return (
    <>
      <div className="filter-bar">
        <label className="search">
          <Icon name="search" />
          <input
            aria-label="Search members"
            value={searchQuery}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Find people by name or interest…"
          />
        </label>
        <Tag><Icon name="lock" size={14} /> Visible to members only</Tag>
      </div>
      <div className="card-grid">
        {members.map(member => (
          <Button
            appearance="unstyled"
            className={`panel ${styles['member-card']}`}
            key={member.name}
            onClick={() => onOpenMember(member.name)}
          >
            <Avatar name={member.name} large tone={member.color} />
            <h3>{member.name}</h3>
            <p className="meta"><Icon name="pin" size={14} /> {member.location}</p>
            <p>{member.bio}</p>
            <div className="tags">{member.interests.map(interest => <Tag key={interest}>{interest}</Tag>)}</div>
            <span className="text-button">
              Get to know {member.name.split(' ')[0]} <Icon name="arrow" size={16} />
            </span>
          </Button>
        ))}
      </div>
      {!members.length && (
        <Empty title="No one found just yet">Try a different name or interest.</Empty>
      )}
    </>
  )
}
