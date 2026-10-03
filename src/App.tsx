import { useEffect, useState } from 'react'
import { useMockState } from './mock/useMockState'
import { previewCommunity } from './mock/data'
import { Avatar, Botanical, Icon, Modal } from './components/ui'
import { ActivityDialog } from './components/Activity'
import { Home as CommunityHome } from './features/Home'
import { MeetPlay } from './features/MeetPlay'
import { Championship } from './features/Championship'
import { Community as Discussion } from './features/Community'
import { ProfilePage } from './features/Profile'
import { MyHomePage } from './app/pages/MyHomePage/MyHomePage'
import { MyCommunitiesPage } from './features/communities/pages/MyCommunitiesPage'
import { Sidebar, MobilePersonalNavigation } from './app/layout/Sidebar'
import { currentPage, navigation } from './app/navigation'
import type { Page } from './app/navigation'
import './App.css'

export default function App() {
  const model = useMockState()
  const [page, setPage] = useState<Page>(currentPage)
  const [activity, setActivity] = useState<string | null>(null)
  const [membership, setMembership] = useState(false)
  const [notifications, setNotifications] = useState(false)
  useEffect(() => { const change = () => { setPage(currentPage()); setActivity(null); setMembership(false); setNotifications(false); window.scrollTo({ top: 0 }) }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change) }, [])
  const pageLabel = navigation.find(item => item.id === page)?.label
  useEffect(() => { document.title = `${pageLabel} · The Crowded Table` }, [pageLabel])
  const personal = page === 'my-home' || page === 'my-communities'
  const locked = !model.member && (page === 'meet-play' || page === 'discussion')
  const activityAllowed = activity && (model.member || model.items.find(i => i.id === activity)?.kind === 'official')
  function switchMode() { model.setMember(!model.member); setActivity(null); setNotifications(false) }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
    <Sidebar page={page} member={model.member} community={previewCommunity}/>
    <div className="main-wrap">
      <header className="topbar"><span className="breadcrumb">{personal ? 'Your space' : previewCommunity.name}<span>/</span><strong>{pageLabel}</strong></span>
        {!personal && <div className="topbar-actions"><div className="preview-mode"><span>Preview as</span><button onClick={switchMode} aria-label={`Switch to ${model.member ? 'guest' : 'member'} preview`}><span className={`dot ${!model.member ? 'rust' : ''}`}/>{model.member ? 'Member' : 'Guest'}<Icon name="chevron" size={13}/></button></div><button className="icon-button notification-button" onClick={() => setNotifications(true)} aria-label="Open community notifications"><Icon name="bell"/>{model.notices.length > 0 && <span/>}</button><button className="top-avatar" aria-label="Open your community profile" onClick={() => { window.location.hash = 'profile' }}><Avatar name={model.profile.name}/></button></div>}
      </header>
      <MobilePersonalNavigation page={page}/>
      <main id="main-content" tabIndex={-1}><div className="content">
        {page === 'my-home' ? <MyHomePage/> : page === 'my-communities' ? <MyCommunitiesPage previewName={previewCommunity.name} previewLocation={previewCommunity.location}/> : locked ? <section className="paywall"><span className="round-icon"><Icon name="lock" size={27}/></span><span className="eyebrow">A LITTLE MORE BELONGING</span><h1>{page === 'meet-play' ? 'Your people are here.' : 'Come into the conversation.'}</h1><p>{page === 'meet-play' ? 'Find local players. Create your own table. Meet people outside your usual gaming circle.' : 'Share a favorite game, ask a question, and get to know your private community.'}</p><div className="paywall-price">L300<span>/ month</span></div><button className="button" onClick={() => setMembership(true)}>Become a Member <Icon name="arrow" size={18}/></button><small>Meet & Play · Discussion · Game nights · Championship</small><Botanical/></section> : page === 'community-home' ? <CommunityHome model={model} open={setActivity} membership={() => setMembership(true)}/> : page === 'meet-play' ? <MeetPlay model={model} open={setActivity}/> : page === 'championship' ? <Championship model={model}/> : page === 'discussion' ? <Discussion model={model}/> : <ProfilePage model={model} open={setActivity} membership={() => setMembership(true)}/>}
        <footer><span><Icon name="leaf" size={16}/> Good games bring good people together.</span><span>PLAY WELL. BELONG ALWAYS.</span></footer>
      </div></main>
    </div>
    {activityAllowed && <ActivityDialog key={activity} id={activity} model={model} onClose={() => setActivity(null)}/>}
    {membership && <Modal title={model.member ? 'A little more belonging, every month' : 'Pull up a chair. Stay a while.'} onClose={() => setMembership(false)}><div className="membership-dialog"><span className="round-icon gold"><Icon name="leaf" size={32}/></span><h2>The Crowded Table Membership</h2><div className="paywall-price">L300<span>/ month</span></div><ul className="benefits">{['Find and create member-hosted tables', 'Meet people in our private community', 'Reserve included official game nights', 'Enter the monthly championship'].map(t => <li key={t}><Icon name="check" size={18}/>{t}</li>)}</ul><p className="meta">Interactive preview only. No account, payment, or subscription is created. Changes last until you refresh.</p><button className="button full" onClick={() => { model.setMember(!model.member); setMembership(false); setActivity(null) }}>{model.member ? 'Preview without membership' : 'Try the member experience'}<Icon name="arrow" size={18}/></button></div></Modal>}
    {notifications && <Modal title="A little news from your table" onClose={() => setNotifications(false)}>{!model.member ? <p className="muted">Your official-event and championship updates will appear here. Member-table notifications are private.</p> : model.notices.length ? model.notices.map((n, i) => <div className="notification" key={i}><Icon name="leaf"/><p>{n}</p></div>) : <p className="muted">You’re all caught up. A quiet moment before the next game.</p>}{model.member && model.notices.length > 0 && <button className="text-button" onClick={() => model.setNotices([])}>Mark all as read <Icon name="check" size={16}/></button>}</Modal>}
  </div>
}
