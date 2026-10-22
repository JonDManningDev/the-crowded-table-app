import uiStyles from '../../../components/ui.module.css'
import { AccountOverviewTab } from '../components/AccountOverviewTab'
import { AccountSettingsTab } from '../components/AccountSettingsTab'
import { MyHomeTab } from '../components/MyHomeTab'
import { MyCommunitiesTab } from '../components/MyCommunitiesTab'
import styles from './UserAccountPage.module.css'
import { Button } from '../../../components/primitives/Controls'
import { NavItem } from '../../../components/primitives/Controls'
import { pagePaths } from '../../../app/navigation'
import { useState } from 'react'
import { Heading, Icon, Modal } from '../../../components/ui'
import { useAccount } from '../../auth/accountContext'
import { useMockState } from '../../../mock/useMockState'
import { previewCommunity } from '../../../mock/data'
import type { Page } from '../../../app/navigation'

const tabs = ['Overview', 'My Home', 'My Communities', 'Settings']
const routes: Page[] = ['account', 'my-home', 'my-communities', 'account-settings']

export function UserAccountPage({ page }: { page: Page }) {
  const account = useAccount()
  // Placeholder interests, statistics, and preferences stay separate from community state.
  const model = useMockState()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const profile = {
    ...model.profile,
    name: account.displayName || 'Your account',
    bio: account.bio || 'Add a little about yourself.',
    location: 'Location coming soon',
  }
  const tab = tabs[routes.indexOf(page)] || 'Overview'
  const signedOutMessage = {
    Overview: 'Sign in to see your account.',
    'My Home': 'Sign in to review your activity feed.',
    'My Communities': 'Sign in to see your communities.',
    Settings: 'Sign in to manage your account settings.',
  }[tab]
  const editUnavailable = account.status !== 'signed-in'
    ? 'Sign in to edit your account profile.'
    : account.profileLoading
      ? 'Your account profile is still loading.'
      : account.profileError || (!account.saveProfile ? 'Profile editing is unavailable.' : '')
  const openEditor = () => {
    setError('')
    setEditing(true)
  }

  return (
    <div className={styles.page} data-account-page>
      <Heading
        eyebrow="YOUR SPACE AT THE CROWDED TABLE"
        title="My Account"
        action={tab === 'Overview' && account.status === 'signed-in' ? (
          <Button
            appearance="outline"
            className="button secondary"
            disabled={Boolean(editUnavailable)}
            onClick={openEditor}
          >
            <Icon name="user" size={17}/> Edit Profile
          </Button>
        ) : undefined}
      >
        Your profile, your communities, and a place to bring it all together.
      </Heading>
      <nav className={`tabs ${uiStyles.tabs}`} aria-label="Account navigation">
        {routes.map((route, index) => (
          <NavItem key={route} to={pagePaths[route]} end variant="tab">
            {tabs[index]}
          </NavItem>
        ))}
      </nav>
      {account.status === 'loading' ? (
        <p role="status">Loading your account…</p>
      ) : account.status !== 'signed-in' ? (
        <p>{signedOutMessage}</p>
      ) : (
        <div className="account-content">
          {account.profileLoading && <p role="status">Loading your account profile…</p>}
          {account.profileError && <p role="alert">{account.profileError}</p>}
          {saved && <p role="status">Your account profile has been saved.</p>}
          {tab === 'Overview' && (
            <AccountOverviewTab
              profile={profile}
              onEdit={editUnavailable ? undefined : openEditor}
            />
          )}
          {tab === 'My Home' && <MyHomeTab/>}
          {tab === 'My Communities' && (
            <MyCommunitiesTab
              previewName={previewCommunity.name}
              previewLocation={previewCommunity.location}
            />
          )}
          {tab === 'Settings' && <AccountSettingsTab/>}
          {editing && (
            <Modal
              title="Edit your account profile"
              onClose={() => {
                if (!busy) setEditing(false)
              }}
            >
              <form className="form" onSubmit={async event => {
                event.preventDefault()
                if (busy || editUnavailable) return
                const values = new FormData(event.currentTarget)
                const name = String(values.get('name')).trim()
                if (!name) {
                  setError('Enter a display name.')
                  return
                }
                setBusy(true)
                setError('')
                try {
                  if (!account.saveProfile) throw new Error('Sign in to save your account profile.')
                  await account.saveProfile(name, String(values.get('bio')))
                  setEditing(false)
                  setSaved(true)
                } catch (failure) {
                  setError(
                    failure instanceof Error ? failure.message : 'Unable to save your profile.',
                  )
                } finally {
                  setBusy(false)
                }
              }}>
                <label>
                  Display name
                  <input
                    name="name"
                    required
                    maxLength={80}
                    defaultValue={account.displayName}
                    disabled={busy}
                  />
                </label>
                <label>
                  About me
                  <textarea name="bio" maxLength={2000} defaultValue={account.bio} disabled={busy}/>
                </label>
                {(error || editUnavailable) && <p role="alert">{error || editUnavailable}</p>}
                <Button
                  appearance="primary"
                  type="submit"
                  loading={busy}
                  className="button"
                  disabled={busy || Boolean(editUnavailable)}
                >
                  {busy ? 'Saving…' : 'Save my profile'}
                </Button>
              </form>
            </Modal>
          )}
        </div>
      )}
    </div>
  )
}
