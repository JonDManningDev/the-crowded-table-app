import { Avatar, Botanical, Icon, Tag } from '../../../components/ui'
import type { MockModel } from '../../../mock/useMockState'
import { ProfileOverview } from './ProfileOverview'

export function AccountOverviewTab({ profile, onEdit }: { profile: MockModel['profile']; onEdit?: () => void }) {
  return <><div className="profile-layout"><aside><section className="panel profile-summary"><Botanical/><Avatar name={profile.name.slice(0, 1)} large tone="peach"/><h2>{profile.name}</h2><span className="location"><Icon name="pin" size={15}/>{profile.location}</span><p className="profile-quote">“Good games. Good people.”</p><div className="tags">{profile.interests.map(t => <Tag key={t}>{t}</Tag>)}</div><div className="profile-stats"><div><strong>12</strong><span>events</span></div><div><strong>3</strong><span>tables hosted</span></div><div><strong>18</strong><span>co-players</span></div></div></section><div className="profile-side-note"><Icon name="heart"/><p>Different people.<br/><em>Same table.</em></p></div></aside><div><ProfileOverview profile={profile} onEdit={onEdit}/></div></div></>
}
