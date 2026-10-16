import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router'
import App from '../App'
import { AuthShell } from '../features/Auth'
import { AccountPage, PremiumFeaturesPage } from '../features/AccountPage'
import { Home } from '../features/Home'
import { MeetPlay } from '../features/MeetPlay'
import { Championship } from '../features/Championship'
import { Community } from '../features/Community'
import { ProfilePage } from '../features/Profile'
import { Botanical, Icon } from '../components/ui'
import { pagePaths, type Page } from './navigation'
import { useAppRouteContext } from './routeContext'

function CommunityPage({ page }: { page: Page }) {
  const { model, open, membership } = useAppRouteContext()
  if (!model.member && (page === 'meet-play' || page === 'discussion')) return <section className="paywall"><span className="round-icon"><Icon name="lock" size={27}/></span><span className="eyebrow">A LITTLE MORE BELONGING</span><h1>{page === 'meet-play' ? 'Your people are here.' : 'Come into the conversation.'}</h1><p>{page === 'meet-play' ? 'Find local players. Create your own table. Meet people outside your usual gaming circle.' : 'Share a favorite game, ask a question, and get to know your private community.'}</p><div className="paywall-price">L300<span>/ month</span></div><button className="button" onClick={membership}>Become a Member <Icon name="arrow" size={18}/></button><small>Meet & Play · Discussion · Game nights · Championship</small><Botanical/></section>
  switch (page) {
    case 'community-home': return <Home model={model} open={open} membership={membership}/>
    case 'meet-play': return <MeetPlay model={model} open={open}/>
    case 'championship': return <Championship model={model}/>
    case 'discussion': return <Community model={model}/>
    default: return <ProfilePage model={model} open={open} membership={membership}/>
  }
}

export function ApplicationRoutes() {
  return <Routes><Route element={<App/>}>
    <Route index element={<Navigate to={pagePaths['my-home']} replace/>}/>
    {(['account', 'my-home', 'my-communities', 'account-settings'] as const).map(page => <Route key={page} caseSensitive path={pagePaths[page]} element={<AccountPage page={page}/>}/>)}
    <Route caseSensitive path={pagePaths['premium-features']} element={<PremiumFeaturesPage/>}/>
    {(['community-home', 'meet-play', 'championship', 'discussion', 'profile'] as const).map(page => <Route key={page} caseSensitive path={pagePaths[page]} element={<CommunityPage page={page}/>}/>)}
    <Route path="*" element={<section className="panel"><h1>Page not found</h1><p>This page does not exist.</p><Link className="button" to={pagePaths['my-home']}>Back to My Home</Link></section>}/>
  </Route></Routes>
}

export function AppRouter() {
  return <BrowserRouter><AuthShell><ApplicationRoutes/></AuthShell></BrowserRouter>
}
