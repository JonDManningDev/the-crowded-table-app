import styles from './AccountPreferenceSwitch.module.css'

type AccountPreferenceSwitchProps = {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}

export function AccountPreferenceSwitch({ label, description, checked, disabled, onChange }: AccountPreferenceSwitchProps) {
  return (
    <label className={`setting-row ${styles.row}`}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input className={styles.control} type="checkbox" role="switch" disabled={disabled}
        checked={checked} onChange={event => onChange(event.target.checked)}/>
    </label>
  )
}
