import uiStyles from '../../../components/ui.module.css'
import { AccountProfileTab } from '../components/AccountProfileTab'
import { AccountSettingsTab } from '../components/AccountSettingsTab'
import { AccountHomeTab } from '../components/AccountHomeTab'
import { MyCommunitiesTab } from '../components/MyCommunitiesTab'
import styles from './UserAccountPage.module.css'
import { Button } from '../../../components/primitives/Controls'
import { NavItem } from '../../../components/primitives/Controls'
import { accountTabs, type AccountTab } from '../../../app/navigation'
import { useEffect, useRef, useState } from 'react'
import { Heading, Icon } from '../../../components/ui'
import { useAccount } from '../../auth/accountContext'
import { previewCommunity } from '../../../mock/data'
import { readAccountProfileInsights, readAccountProfilePlaceholders } from '../api'
import { ProfileEditModal } from '../components/ProfileEditModal'
import type { ProfileFieldErrors } from '../types'

function initialEditor(identity: string) {
  return { identity, isEditing: false, isSaving: false, isSaved: false,
    displayNameDraft: '', bioDraft: '', fieldErrors: {} as ProfileFieldErrors, saveError: '' }
}
function displayNameError(value: string) {
  return !value.trim() ? 'Enter a display name.' : value.trim().length > 80 ? 'Use 80 characters or fewer.' : undefined
}
function bioError(value: string) {
  return value.length > 2000 ? 'Use 2,000 characters or fewer.' : undefined
}

export function UserAccountPage({ page }: { page: AccountTab }) {
  const account = useAccount()
  const identity = account.status === 'signed-in' ? `account:${account.userId || 'current'}` : account.status
  const [editor, setEditor] = useState(() => initialEditor(identity))
  const { isEditing, isSaving, isSaved, displayNameDraft, bioDraft, fieldErrors, saveError } = editor
  const lifecycle = useRef<{ active: boolean; saving: boolean } | null>(null)
  // Reset before another identity renders; provider refreshes keep the same draft.
  if (editor.identity !== identity) setEditor(initialEditor(identity))
  useEffect(() => {
    const request = { active: true, saving: false }
    lifecycle.current = request
    return () => { request.active = false }
  }, [identity])
  const [activeInsightIndex, setActiveInsightIndex] = useState(0)
  const placeholders = readAccountProfilePlaceholders()
  const insights = readAccountProfileInsights().map(({ iconName, ...insight }) => ({
    ...insight, icon: <Icon name={iconName} size={28}/>,
  }))
  const signedOutMessage = {
    'account-profile': 'Sign in to see your account.',
    'my-home': 'Sign in to review your activity feed.',
    'my-communities': 'Sign in to see your communities.',
    'account-settings': 'Sign in to manage your account settings.',
  }[page]
  const editUnavailable = account.status !== 'signed-in'
    ? 'Sign in to edit your account profile.'
    : account.profileLoading
      ? 'Your account profile is still loading.'
      : account.profileError || (!account.saveProfile ? 'Profile editing is unavailable.' : '')
  function openEditor() {
    if (editUnavailable || lifecycle.current?.saving) return
    setEditor({ ...initialEditor(identity), isEditing: true,
      displayNameDraft: account.displayName || '', bioDraft: account.bio || '' })
  }
  function closeEditor() {
    if (!lifecycle.current?.saving) setEditor(previous => ({ ...previous, isEditing: false }))
  }
  function changeDisplayName(value: string) {
    setEditor(previous => ({ ...previous, displayNameDraft: value, isSaved: false,
      fieldErrors: { ...previous.fieldErrors,
        displayName: previous.fieldErrors.displayName ? displayNameError(value) : undefined } }))
  }
  function changeBio(value: string) {
    setEditor(previous => ({ ...previous, bioDraft: value, isSaved: false,
      fieldErrors: { ...previous.fieldErrors, bio: previous.fieldErrors.bio ? bioError(value) : undefined } }))
  }
  function submitProfile(): keyof ProfileFieldErrors | void {
    const request = lifecycle.current
    const saveProfile = account.saveProfile
    if (!isEditing || editor.identity !== identity || !request?.active || request.saving || editUnavailable || !saveProfile) return
    const errors = { displayName: displayNameError(displayNameDraft), bio: bioError(bioDraft) }
    setEditor(previous => ({ ...previous, fieldErrors: errors }))
    if (errors.displayName) return 'displayName'
    if (errors.bio) return 'bio'
    // Synchronous guard covers repeated submissions before disabled state renders.
    request.saving = true
    setEditor(previous => ({ ...previous, isSaving: true, saveError: '', isSaved: false }))
    void (async () => {
      try {
        await saveProfile(displayNameDraft.trim(), bioDraft)
        if (request.active) setEditor(previous => ({ ...previous, isEditing: false, isSaved: true }))
      } catch (failure) {
        if (request.active) setEditor(previous => ({ ...previous,
          saveError: failure instanceof Error ? failure.message : 'Unable to save your profile.' }))
      } finally {
        request.saving = false
        if (request.active) setEditor(previous => ({ ...previous, isSaving: false }))
      }
    })()
  }

  return (
    <div className={styles.page} data-account-page>
      <Heading
        eyebrow="YOUR SPACE AT THE CROWDED TABLE"
        title="My Account"
        action={page === 'account-profile' && account.status === 'signed-in' ? (
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
        {accountTabs.map(({ id, label, path }) => (
          <NavItem key={id} to={path} end variant="tab">
            {label}
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
          {isSaved && <p role="status">Your account profile has been saved.</p>}
          {page === 'account-profile' && (
            <AccountProfileTab
              name={account.displayName || 'Your account'}
              bio={account.bio || 'Add a little about yourself.'}
              placeholders={placeholders}
              onEdit={editUnavailable ? undefined : openEditor}
              insights={insights}
              activeInsightIndex={activeInsightIndex}
              onActiveInsightIndexChange={setActiveInsightIndex}
            />
          )}
          {page === 'my-home' && <AccountHomeTab/>}
          {page === 'my-communities' && (
            <MyCommunitiesTab
              previewName={previewCommunity.name}
              previewLocation={previewCommunity.location}
            />
          )}
          {page === 'account-settings' && <AccountSettingsTab/>}
          {isEditing && (
            <ProfileEditModal displayNameDraft={displayNameDraft} bioDraft={bioDraft}
              fieldErrors={fieldErrors} saveError={saveError} editUnavailable={editUnavailable} isSaving={isSaving}
              onDisplayNameChange={changeDisplayName} onBioChange={changeBio}
              onDisplayNameBlur={() => setEditor(previous => ({ ...previous,
                fieldErrors: { ...previous.fieldErrors, displayName: displayNameError(previous.displayNameDraft) } }))}
              onBioBlur={() => setEditor(previous => ({ ...previous,
                fieldErrors: { ...previous.fieldErrors, bio: bioError(previous.bioDraft) } }))}
              onSubmit={submitProfile} onClose={closeEditor}/>
          )}
        </div>
      )}
    </div>
  )
}
