import { Outlet, useLocation, useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { useMockState } from './mock/useMockState'
import { previewCommunity } from './mock/data'
import { Avatar, Icon, Modal } from './components/ui'
import { ActivityDialog } from './components/Activity'
import { Sidebar, MobilePersonalNavigation } from './app/layout/Sidebar'
import { pageAt, pagePaths, navigation } from './app/navigation'
import { AccountActions } from './features/auth/AccountActions'
import './App.css'

export default function App() {
  const model = useMockState()
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageAt(location.pathname)
  const [previousPath, setPreviousPath] = useState(location.pathname)
  const [activity, setActivity] = useState<string | null>(null)
  const [membership, setMembership] = useState(false)
  const [notifications, setNotifications] = useState(false)
  if (previousPath !== location.pathname) { setPreviousPath(location.pathname); setActivity(null); setMembership(false); setNotifications(false) }
  useEffect(() => { window.scrollTo({ top: 0 }); document.getElementById('main-content')?.focus() }, [location.pathname])
  const pageLabel = navigation.find(item => item.id === page)?.label || 'Page not found'
  useEffect(() => { document.title = `${pageLabel} · The Crowded Table` }, [pageLabel])
  const personal = !location.pathname.startsWith('/community/preview')
  const activityAllowed = activity && (model.member || model.items.find(i => i.id === activity)?.kind === 'official')
  function switchMode() { model.setMember(!model.member); setActivity(null); setNotifications(false) }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
    <Sidebar page={page} member={model.member} community={previewCommunity}/>
    <div className="main-wrap">
      <header className="topbar"><span className="breadcrumb">{personal ? 'Your space' : previewCommunity.name}<span>/</span><strong>{pageLabel}</strong></span>
        <div className="topbar-actions">{!personal && <div className="topbar-actions"><div className="preview-mode"><span>Preview as</span><button onClick={switchMode} aria-label={`Switch to ${model.member ? 'guest' : 'member'} preview`}><span className={`dot ${!model.member ? 'rust' : ''}`}/>{model.member ? 'Member' : 'Guest'}<Icon name="chevron" size={13}/></button></div><button className="icon-button notification-button" onClick={() => setNotifications(true)} aria-label="Open community notifications"><Icon name="bell"/>{model.notices.length > 0 && <span/>}</button><button className="top-avatar" aria-label="Open your community profile" onClick={() => navigate(pagePaths.profile)}><Avatar name={model.profile.name}/></button></div>}
        <AccountActions/></div>
      </header>
      <MobilePersonalNavigation page={page}/>
      <main id="main-content" tabIndex={-1}><div className="content">
        <Outlet context={{ model, open: setActivity, membership: () => setMembership(true) }}/>
        <footer><span><Icon name="leaf" size={16}/> Good games bring good people together.</span><span>PLAY WELL. BELONG ALWAYS.</span></footer>
      </div></main>
    </div>
    {activityAllowed && <ActivityDialog key={activity} id={activity} model={model} onClose={() => setActivity(null)}/>}
    {membership && <Modal title={model.member ? 'A little more belonging, every month' : 'Pull up a chair. Stay a while.'} onClose={() => setMembership(false)}><div className="membership-dialog"><span className="round-icon gold"><Icon name="leaf" size={32}/></span><h2>The Crowded Table Membership</h2><div className="paywall-price">L300<span>/ month</span></div><ul className="benefits">{['Find and create member-hosted tables', 'Meet people in our private community', 'Reserve included official game nights', 'Enter the monthly championship'].map(t => <li key={t}><Icon name="check" size={18}/>{t}</li>)}</ul><p className="meta">Interactive preview only. No account, payment, or subscription is created. Changes last until you refresh.</p><button className="button full" onClick={() => { model.setMember(!model.member); setMembership(false); setActivity(null) }}>{model.member ? 'Preview without membership' : 'Try the member experience'}<Icon name="arrow" size={18}/></button></div></Modal>}
    {notifications && <Modal title="A little news from your table" onClose={() => setNotifications(false)}>{!model.member ? <p className="muted">Your official-event and championship updates will appear here. Member-table notifications are private.</p> : model.notices.length ? model.notices.map((n, i) => <div className="notification" key={i}><Icon name="leaf"/><p>{n}</p></div>) : <p className="muted">You’re all caught up. A quiet moment before the next game.</p>}{model.member && model.notices.length > 0 && <button className="text-button" onClick={() => model.setNotices([])}>Mark all as read <Icon name="check" size={16}/></button>}</Modal>}
  </div>
}
