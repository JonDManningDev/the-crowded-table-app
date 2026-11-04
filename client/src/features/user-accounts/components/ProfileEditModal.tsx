import { useId, useRef } from 'react'
import { Modal } from '../../../components/ui'
import { Button } from '../../../components/primitives/Controls'
import type { ProfileFieldErrors } from '../types'
import styles from './ProfileEditModal.module.css'

type ProfileEditModalProps = {
  displayNameDraft: string
  bioDraft: string
  fieldErrors: ProfileFieldErrors
  saveError: string
  editUnavailable: string
  isSaving: boolean
  onDisplayNameChange: (value: string) => void
  onBioChange: (value: string) => void
  onDisplayNameBlur: () => void
  onBioBlur: () => void
  onSubmit: () => keyof ProfileFieldErrors | void
  onClose: () => void
}

export function ProfileEditModal({ displayNameDraft, bioDraft, fieldErrors, saveError, editUnavailable,
  isSaving, onDisplayNameChange, onBioChange, onDisplayNameBlur, onBioBlur, onSubmit, onClose }: ProfileEditModalProps) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <Modal title="Edit your account profile" onClose={onClose}>
      <form ref={formRef} className={styles.form} noValidate onSubmit={event => {
        event.preventDefault()
        const field = onSubmit()
        if (field) (formRef.current?.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement | null)?.focus()
      }}>
        <label>
          <span id={`${id}-name-label`}>Display name</span>
          <input name="displayName" required maxLength={80} value={displayNameDraft} disabled={isSaving}
            aria-labelledby={`${id}-name-label`}
            aria-invalid={Boolean(fieldErrors.displayName)}
            aria-describedby={fieldErrors.displayName ? `${id}-name-error` : undefined}
            onChange={event => onDisplayNameChange(event.target.value)} onBlur={onDisplayNameBlur}/>
          {fieldErrors.displayName && <span id={`${id}-name-error`} className={styles.error}>{fieldErrors.displayName}</span>}
        </label>
        <label>
          <span id={`${id}-bio-label`}>About me</span>
          <textarea name="bio" maxLength={2000} value={bioDraft} disabled={isSaving}
            aria-labelledby={`${id}-bio-label`}
            aria-invalid={Boolean(fieldErrors.bio)} aria-describedby={fieldErrors.bio ? `${id}-bio-error` : undefined}
            onChange={event => onBioChange(event.target.value)} onBlur={onBioBlur}/>
          {fieldErrors.bio && <span id={`${id}-bio-error`} className={styles.error}>{fieldErrors.bio}</span>}
        </label>
        {(saveError || editUnavailable) && <p role="alert" className={styles.error}>{saveError || editUnavailable}</p>}
        <Button appearance="primary" type="submit" loading={isSaving} disabled={isSaving || Boolean(editUnavailable)}>
          {isSaving ? 'Saving…' : 'Save my profile'}
        </Button>
      </form>
    </Modal>
  )
}
