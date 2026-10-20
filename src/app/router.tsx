import { Button } from '../components/primitives/Controls'
import { ActionLink } from '../components/primitives/Controls'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import App from '../App'
import { AuthShell } from '../features/Auth'
import { lazy } from 'react'
import { Botanical, Icon } from '../components/ui'
import { pagePaths, type Page } from './navigation'
import { useAppRouteContext } from './routeContext'

const AccountPage = lazy(() => import('../features/AccountPage').then(module => ({ default: module.AccountPage })))
const PremiumFeaturesPage = lazy(() => import('../features/AccountPage').then(module => ({ default: module.PremiumFeaturesPage })))
const Home = lazy(() => import('../features/Home').then(module => ({ default: module.Home })))
const MeetPlay = lazy(() => import('../features/MeetPlay').then(module => ({ default: module.MeetPlay })))
const Championship = lazy(() => import('../features/Championship').then(module => ({ default: module.Championship })))
const Community = lazy(() => import('../features/Community').then(module => ({ default: module.Community })))
const ProfilePage = lazy(() => import('../features/Profile').then(module => ({ default: module.ProfilePage })))

function CommunityPage({ page }: { page: Page }) {
  const { model, open, membership } = useAppRouteContext()
  if (!model.member && (page === 'meet-play' || page === 'discussion')) return <section className="paywall"><span className="round-icon"><Icon name="lock" size={27}/></span><span className="eyebrow">A LITTLE MORE BELONGING</span><h1>{page === 'meet-play' ? 'Your people are here.' : 'Come into the conversation.'}</h1><p>{page === 'meet-play' ? 'Find local players. Create your own table. Meet people outside your usual gaming circle.' : 'Share a favorite game, ask a question, and get to know your private community.'}</p><div className="paywall-price">L300<span>/ month</span></div><Button appearance="primary" className="button" onClick={membership}>Become a Member <Icon name="arrow" size={18}/></Button><small>Meet & Play · Discussion · Game nights · Championship</small><Botanical/></section>
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
    <Route path="*" element={<section className="panel"><h1>Page not found</h1><p>This page does not exist.</p><ActionLink className="button" to={pagePaths['my-home']}>Back to My Home</ActionLink></section>}/>
  </Route></Routes>
}

export function AppRouter() {
  return <BrowserRouter><AuthShell><ApplicationRoutes/></AuthShell></BrowserRouter>
}
