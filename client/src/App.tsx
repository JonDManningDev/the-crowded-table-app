import { Outlet, useLocation } from 'react-router'
import { lazy, useEffect, useLayoutEffect, useState } from 'react'
import { useMockState } from './mock/useMockState'
import { readCommunityPreviewIdentity, readMembershipPreviewContent } from './features/communities/api'
import { readCommunityNotifications } from './features/notifications/api'
import { MembershipPreviewModal } from './features/communities/components/MembershipPreviewModal'
import { CommunityNotificationsModal } from './features/notifications/components/CommunityNotificationsModal'
import { LazyContent } from './app/LazyContent'
import { Sidebar, MobilePersonalNavigation } from './app/layout/Sidebar'
import { pageAt, navigation } from './app/navigation'
import { Topbar } from './app/layout/Topbar'
import { Footer } from './app/layout/Footer'
import styles from './App.module.css'
import './App.css'

const ActivityDialogController = lazy(() => import('./app/ActivityDialogController').then(module => ({
  default: module.ActivityDialogController,
})))

export default function App() {
  const model = useMockState()
  const community = readCommunityPreviewIdentity()
  const membershipContent = readMembershipPreviewContent()
  const location = useLocation()
  const page = pageAt(location.pathname)
  const [previousPath, setPreviousPath] = useState(location.pathname)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [isMembershipPreviewOpen, setIsMembershipPreviewOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  if (previousPath !== location.pathname) {
    setPreviousPath(location.pathname)
    setSelectedActivityId(null)
    setIsMembershipPreviewOpen(false)
    setIsNotificationsOpen(false)
  }
  useLayoutEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])
  const pageLabel = navigation.find(item => item.id === page)?.label || 'Page not found'
  useEffect(() => { document.title = `${pageLabel} · The Crowded Table` }, [pageLabel])
  const personal = !location.pathname.startsWith('/community/preview')
  const activityAllowed = selectedActivityId && (
    model.member || model.items.find(item => item.id === selectedActivityId)?.kind === 'official'
  )
  function switchMode() {
    model.switchCommunityPreview()
    setSelectedActivityId(null)
    setIsNotificationsOpen(false)
  }

  return (
    <div className={styles['app-shell']}>
      <a
        className={styles['skip-link']}
        href="#main-content"
        onClick={event => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to content
      </a>
      <Sidebar member={model.member} community={community}/>
      <div className={styles['main-wrap']}>
        <Topbar
          personal={personal}
          pageLabel={pageLabel}
          communityName={community.name}
          member={model.member}
          profileName={model.profile.name}
          hasNotices={model.notices.length > 0}
          onSwitchMode={switchMode}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />
        <MobilePersonalNavigation/>
        <main id="main-content" tabIndex={-1}>
          <div className={styles['content']}>
            <LazyContent resetKey={location.pathname}>
              <Outlet context={{ model, open: setSelectedActivityId, membership: () => setIsMembershipPreviewOpen(true) }}/>
            </LazyContent>
            <Footer/>
          </div>
        </main>
      </div>
      {activityAllowed && (
        <LazyContent key={selectedActivityId}>
          <ActivityDialogController id={selectedActivityId} model={model} onClose={() => setSelectedActivityId(null)}/>
        </LazyContent>
      )}
      {isMembershipPreviewOpen && <MembershipPreviewModal isMemberPreview={model.member} benefits={membershipContent.benefits}
        onClose={() => setIsMembershipPreviewOpen(false)} onChangePreview={() => {
          model.switchCommunityPreview()
          setIsMembershipPreviewOpen(false)
          setSelectedActivityId(null)
        }}/>}
      {isNotificationsOpen && <CommunityNotificationsModal isMemberPreview={model.member}
        notices={readCommunityNotifications(model.notices)} onMarkAllRead={model.markAllNotificationsRead}
        onClose={() => setIsNotificationsOpen(false)}/>}
    </div>
  )
}
