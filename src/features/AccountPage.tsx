import styles from './AccountPage.module.css'
import { Button } from '../components/primitives/Controls'
import { ActionLink, NavItem } from '../components/primitives/Controls'
import { pagePaths } from '../app/navigation'
import { AccountPreferences } from './user-accounts/AccountPreferences'
import { useState } from 'react'
import { Avatar, Botanical, Heading, Icon, Modal, Tag } from '../components/ui'
import { useAccount } from './auth/accountContext'
import { useMockState } from '../mock/useMockState'
import { previewCommunity } from '../mock/data'
import { ProfileOverview, ProfilePreferences } from './Profile'
import { MyHomePage } from '../app/pages/MyHomePage/MyHomePage'
import { MyCommunitiesPage } from './communities/pages/MyCommunitiesPage'
import type { Page } from '../app/navigation'

const tabs = ['Overview', 'My Home', 'My Communities', 'Settings']
const routes: Page[] = ['account', 'my-home', 'my-communities', 'account-settings']

export function AccountPage({ page }: { page: Page }) {
  const account = useAccount()
  // Placeholder interests, statistics, and preferences stay separate from community state.
  const model = useMockState()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [support, setSupport] = useState(false)
  const profile = { ...model.profile, name: account.displayName || 'Your account', bio: account.bio || 'Add a little about yourself.', location: 'Location coming soon' }
  const tab = tabs[routes.indexOf(page)] || 'Overview'
  const signedOutMessage = { Overview: 'Sign in to see your account.', 'My Home': 'Sign in to review your activity feed.', 'My Communities': 'Sign in to see your communities.', Settings: 'Sign in to manage your account settings.' }[tab]
  const editUnavailable = account.status !== 'signed-in' ? 'Sign in to edit your account profile.' : account.profileLoading ? 'Your account profile is still loading.' : account.profileError || (!account.saveProfile ? 'Profile editing is unavailable.' : '')
  return <div className={styles.page} data-account-page>
    <Heading eyebrow="YOUR SPACE AT THE CROWDED TABLE" title="My Account" action={tab === 'Overview' && account.status === 'signed-in' ? <Button appearance="outline" className="button secondary" disabled={Boolean(editUnavailable)} onClick={() => { setError(''); setEditing(true) }}><Icon name="user" size={17}/> Edit Profile</Button> : undefined}>Your profile, your communities, and a place to bring it all together.</Heading>
    <nav className="tabs" aria-label="Account navigation">{routes.map((route, index) => <NavItem key={route} to={pagePaths[route]} end variant="tab">{tabs[index]}</NavItem>)}</nav>
    {account.status === 'loading' ? <p role="status">Loading your account…</p> : account.status !== 'signed-in' ? <p>{signedOutMessage}</p> : <div className="account-content">
    {account.profileLoading && <p role="status">Loading your account profile…</p>}
    {account.profileError && <p role="alert">{account.profileError}</p>}
    {saved && <p role="status">Your account profile has been saved.</p>}
    {tab === 'Overview' && <><div className="profile-layout"><aside><section className="panel profile-summary"><Botanical/><Avatar name={profile.name.slice(0, 1)} large tone="peach"/><h2>{profile.name}</h2><span className="location"><Icon name="pin" size={15}/>{profile.location}</span><p className="profile-quote">“Good games. Good people.”</p><div className="tags">{profile.interests.map(t => <Tag key={t}>{t}</Tag>)}</div><div className="profile-stats"><div><strong>12</strong><span>events</span></div><div><strong>3</strong><span>tables hosted</span></div><div><strong>18</strong><span>co-players</span></div></div></section><div className="profile-side-note"><Icon name="heart"/><p>Different people.<br/><em>Same table.</em></p></div></aside><div><ProfileOverview profile={profile} onEdit={editUnavailable ? undefined : () => { setError(''); setEditing(true) }}/></div></div></>}
    {tab === 'My Home' && <MyHomePage embedded/>}
    {tab === 'My Communities' && <MyCommunitiesPage embedded previewName={previewCommunity.name} previewLocation={previewCommunity.location}/>}
    {tab === 'Settings' && <div className="account-settings">{account.userId && <AccountPreferences key={account.userId} userId={account.userId}/>}<section className="panel"><h2>My Premium Features</h2><p className="muted">Your subscriptions will appear here, each with a Manage link to its feature settings.</p><div className="notice">Subscription data is not connected yet. Community ownership and future pro hosting and organizer features will be listed here.</div><ul className="premium-feature-list" aria-label="Premium feature placeholders">{[{ id: 'community-ownership', name: 'Community ownership', detail: 'Sample subscription row · Billing is not connected' }].map(feature => <li key={feature.id}><div><strong>{feature.name}</strong><small>{feature.detail}</small></div>{account.status === 'signed-in' ? <ActionLink appearance="outline" to={pagePaths['my-communities']}>Manage</ActionLink> : <span className="muted">Sign in to manage</span>}</li>)}</ul><div className="actions"><ActionLink className="button" to={pagePaths['premium-features']}>Explore Premium Features <Icon name="arrow" size={17}/></ActionLink></div></section><ProfilePreferences model={model} onSupport={() => setSupport(true)}/></div>}
    {editing && <Modal title="Edit your account profile" onClose={() => { if (!busy) setEditing(false) }}><form className="form" onSubmit={async event => { event.preventDefault(); if (busy || editUnavailable) return; const values = new FormData(event.currentTarget); const name = String(values.get('name')).trim(); if (!name) { setError('Enter a display name.'); return } setBusy(true); setError(''); try { if (!account.saveProfile) throw new Error('Sign in to save your account profile.'); await account.saveProfile(name, String(values.get('bio'))); setEditing(false); setSaved(true) } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save your profile.') } finally { setBusy(false) } }}><label>Display name<input name="name" required maxLength={80} defaultValue={account.displayName} disabled={busy}/></label><label>About me<textarea name="bio" maxLength={2000} defaultValue={account.bio} disabled={busy}/></label>{(error || editUnavailable) && <p role="alert">{error || editUnavailable}</p>}<Button appearance="primary" type="submit" loading={busy} className="button" disabled={busy || Boolean(editUnavailable)}>{busy ? 'Saving…' : 'Save my profile'}</Button></form></Modal>}
    {support && <Modal title="Account support" onClose={() => setSupport(false)}><p>Account support is coming soon. This placeholder does not send a message.</p></Modal>}
    </div>}
  </div>
}

export function PremiumFeaturesPage() {
  return <><Heading eyebrow="MORE WAYS TO BRING PEOPLE TOGETHER" title="Premium Features">Explore more possibilities for your account.</Heading><section className="panel"><h2>Coming soon</h2><p>Community ownership, pro hosting, and organizer features will be explained here, with options to subscribe and configure each feature.</p><ActionLink appearance="outline" className="button secondary" to={pagePaths['account-settings']}>Back to Settings</ActionLink></section></>
}
