import { Button } from './components/primitives/Controls'
import { Outlet, useLocation } from 'react-router'
import { lazy, useEffect, useLayoutEffect, useState } from 'react'
import { useMockState } from './mock/useMockState'
import { previewCommunity } from './mock/data'
import { Icon, Modal } from './components/ui'
import { LazyContent } from './app/LazyContent'
import { Sidebar, MobilePersonalNavigation } from './app/layout/Sidebar'
import { pageAt, navigation } from './app/navigation'
import { Topbar } from './app/layout/Topbar'
import './App.css'

const ActivityDialog = lazy(() => import('./components/Activity').then(module => ({
  default: module.ActivityDialog,
})))

const membershipBenefits = [
  'Find and create member-hosted tables',
  'Meet people in our private community',
  'Reserve included official game nights',
  'Enter the monthly championship',
]

export default function App() {
  const model = useMockState()
  const location = useLocation()
  const page = pageAt(location.pathname)
  const [previousPath, setPreviousPath] = useState(location.pathname)
  const [activity, setActivity] = useState<string | null>(null)
  const [membership, setMembership] = useState(false)
  const [notifications, setNotifications] = useState(false)
  if (previousPath !== location.pathname) {
    setPreviousPath(location.pathname)
    setActivity(null)
    setMembership(false)
    setNotifications(false)
  }
  useLayoutEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])
  const pageLabel = navigation.find(item => item.id === page)?.label || 'Page not found'
  useEffect(() => { document.title = `${pageLabel} · The Crowded Table` }, [pageLabel])
  const personal = !location.pathname.startsWith('/community/preview')
  const activityAllowed = activity && (
    model.member || model.items.find(item => item.id === activity)?.kind === 'official'
  )
  function switchMode() {
    model.setMember(!model.member)
    setActivity(null)
    setNotifications(false)
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={event => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to content
      </a>
      <Sidebar member={model.member} community={previewCommunity}/>
      <div className="main-wrap">
        <Topbar
          personal={personal}
          pageLabel={pageLabel}
          communityName={previewCommunity.name}
          member={model.member}
          profileName={model.profile.name}
          hasNotices={model.notices.length > 0}
          onSwitchMode={switchMode}
          onOpenNotifications={() => setNotifications(true)}
        />
        <MobilePersonalNavigation/>
        <main id="main-content" tabIndex={-1}>
          <div className="content">
            <LazyContent resetKey={location.pathname}>
              <Outlet context={{ model, open: setActivity, membership: () => setMembership(true) }}/>
            </LazyContent>
            <footer>
              <span><Icon name="leaf" size={16}/> Good games bring good people together.</span>
              <span>PLAY WELL. BELONG ALWAYS.</span>
            </footer>
          </div>
        </main>
      </div>
      {activityAllowed && (
        <LazyContent key={activity}>
          <ActivityDialog id={activity} model={model} onClose={() => setActivity(null)}/>
        </LazyContent>
      )}
      {membership && (
        <Modal
          title={model.member ? 'A little more belonging, every month' : 'Pull up a chair. Stay a while.'}
          onClose={() => setMembership(false)}
        >
          <div className="membership-dialog">
            <span className="round-icon gold"><Icon name="leaf" size={32}/></span>
            <h2>The Crowded Table Membership</h2>
            <div className="paywall-price">L300<span>/ month</span></div>
            <ul className="benefits">
              {membershipBenefits.map(benefit => (
                <li key={benefit}><Icon name="check" size={18}/>{benefit}</li>
              ))}
            </ul>
            <p className="meta">
              Interactive preview only. No account, payment, or subscription is created. Changes
              last until you refresh.
            </p>
            <Button
              appearance="primary"
              full
              className="button full"
              onClick={() => {
                model.setMember(!model.member)
                setMembership(false)
                setActivity(null)
              }}
            >
              {model.member ? 'Preview without membership' : 'Try the member experience'}
              <Icon name="arrow" size={18}/>
            </Button>
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal title="A little news from your table" onClose={() => setNotifications(false)}>
          {!model.member ? (
            <p className="muted">
              Your official-event and championship updates will appear here. Member-table
              notifications are private.
            </p>
          ) : model.notices.length ? (
            model.notices.map((notice, index) => (
              <div className="notification" key={index}>
                <Icon name="leaf"/>
                <p>{notice}</p>
              </div>
            ))
          ) : (
            <p className="muted">You’re all caught up. A quiet moment before the next game.</p>
          )}
          {model.member && model.notices.length > 0 && (
            <Button appearance="ghost" className="text-button" onClick={() => model.setNotices([])}>
              Mark all as read <Icon name="check" size={16}/>
            </Button>
          )}
        </Modal>
      )}
    </div>
  )
}
