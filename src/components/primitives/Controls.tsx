import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { Link as RouterLink, NavLink, type LinkProps, type NavLinkProps } from 'react-router'
import styles from './Controls.module.css'

type Appearance = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'unstyled'
type Destination = (LinkProps & { href?: never }) | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: never })
type ActionStyle = { appearance?: Appearance; small?: boolean; full?: boolean }
function actionClass({ appearance = 'primary', small, full }: ActionStyle, className = '') {
  return [appearance === 'unstyled' ? '' : styles.action, styles[appearance], small ? styles.small : '', full ? styles.full : '', className].filter(Boolean).join(' ')
}
export function Link(props: Destination) {
  const { className = '', ...rest } = props
  const classes = `${styles.link} ${className}`
  return 'href' in rest && rest.href !== undefined
    ? <a {...rest as AnchorHTMLAttributes<HTMLAnchorElement>} className={classes}/>
    : <RouterLink {...rest as LinkProps} className={classes}/>
}
export function ActionLink({ appearance, small, full, className, ...props }: Destination & ActionStyle) {
  const classes = actionClass({ appearance, small, full }, `button ${className || ''}`)
  return 'href' in props && props.href !== undefined
    ? <a {...props as AnchorHTMLAttributes<HTMLAnchorElement>} className={classes}/>
    : <RouterLink {...props as LinkProps} className={classes}/>
}
export function Button({ type = 'button', appearance = 'primary', small, full, loading = false, disabled, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & ActionStyle & { loading?: boolean }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={actionClass({ appearance, small, full }, className)}/>
}
export function NavItem({ className = '', variant = 'menu', ...props }: Omit<NavLinkProps, 'className'> & { className?: string; variant?: 'menu' | 'tab' }) {
  return <NavLink {...props} className={({ isActive }) => [styles.navItem, styles[variant], isActive ? styles.active : '', className].filter(Boolean).join(' ')}/>
}
