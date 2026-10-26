import { createMockDiscussion, readDiscussionContent, readDiscussionPosts, replyToMockDiscussion, toggleMockSavedGame } from '../features/discussion/api'
import { confirmMockMatchResult, disputeMockMatchResult, readChampionshipContent, readChampionshipMatches, readChampionshipStandings, registerMockChampionship, submitMockMatchResult } from '../features/championships/api'
import { Button } from '../components/primitives/Controls'
import { ActionLink } from '../components/primitives/Controls'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import App from '../App'
import { AuthShell } from '../features/Auth'
import { lazy } from 'react'
import { Botanical, Icon } from '../components/ui'
import { accountRootPath, accountTabs, pagePaths, type Page } from './navigation'
import { useAppRouteContext } from './routeContext'
import { readCommunityHomeContent } from '../features/communities/api'
import { readCommunityHomeEvents } from '../features/events/api'
import { createMockTable, readMeetPlayContent, readMeetPlayTables, saveMockMatchingPreferences } from '../features/meet-and-play/api'

const UserAccountPage = lazy(() => import('../features/user-accounts/pages/UserAccountPage').then(module => ({
  default: module.UserAccountPage,
})))
const PremiumFeaturesPage = lazy(() => import('../features/user-accounts/pages/PremiumFeaturesPage').then(module => ({
  default: module.PremiumFeaturesPage,
})))
const CommunityHomePage = lazy(() => import('./pages/CommunityHomePage').then(module => ({ default: module.CommunityHomePage })))
const MeetPlayPage = lazy(() => import('../features/meet-and-play/pages/MeetPlayPage').then(module => ({ default: module.MeetPlayPage })))
const ChampionshipPage = lazy(() => import('../features/championships/pages/ChampionshipPage').then(module => ({ default: module.ChampionshipPage })))
const DiscussionPage = lazy(() => import('../features/discussion/pages/DiscussionPage').then(module => ({ default: module.DiscussionPage })))
const ProfilePage = lazy(() => import('../features/Profile').then(module => ({ default: module.ProfilePage })))

function CommunityPage({ page }: { page: Page }) {
  const { model, open, membership } = useAppRouteContext()
  if (!model.member && (page === 'meet-play' || page === 'discussion')) {
    return (
      <section className="paywall">
        <span className="round-icon"><Icon name="lock" size={27}/></span>
        <span className="eyebrow">A LITTLE MORE BELONGING</span>
        <h1>{page === 'meet-play' ? 'Your people are here.' : 'Come into the conversation.'}</h1>
        <p>
          {page === 'meet-play'
            ? 'Find local players. Create your own table. Meet people outside your usual gaming circle.'
            : 'Share a favorite game, ask a question, and get to know your private community.'}
        </p>
        <div className="paywall-price">L300<span>/ month</span></div>
        <Button appearance="primary" className="button" onClick={membership}>
          Become a Member <Icon name="arrow" size={18}/>
        </Button>
        <small>Meet & Play · Discussion · Game nights · Championship</small>
        <Botanical/>
      </section>
    )
  }
  switch (page) {
    case 'community-home': return (
      <CommunityHomePage
        content={readCommunityHomeContent()}
        events={readCommunityHomeEvents(model.items, model.seats)}
        isMemberPreview={model.member} onOpenEvent={open} onOpenMembership={membership}
      />
    )
    case 'meet-play': return (
      <MeetPlayPage
        content={readMeetPlayContent()} tables={readMeetPlayTables(model.items, model.seats)}
        matching={model.matching} matchingPreferences={model.matchingPreferences} onOpenTable={open}
        onCreateTable={draft => {
          const result = createMockTable(draft)
          if (!result.ok) return result.error
          model.setItems(previous => [result.item, ...previous])
          model.notify(result.notice)
          return null
        }}
        onSaveMatchingPreferences={draft => {
          const result = saveMockMatchingPreferences(draft)
          model.setMatchingPreferences(result.preferences)
          model.setMatching(result.matching)
          model.notify(result.notice)
        }}
      />
    )
    case 'championship': return (
      <ChampionshipPage content={readChampionshipContent()}
        standings={readChampionshipStandings(model.results, model.profile.name)}
        matches={readChampionshipMatches(model.results, model.profile.name)}
        isRegistered={model.registered} isMemberPreview={model.member}
        onRegister={() => {
          const result = registerMockChampionship()
          model.setRegistered(result.registered); model.notify(result.notice)
        }}
        onSubmitResult={draft => {
          const result = submitMockMatchResult(draft)
          model.setResults(previous => [...previous, result.item])
          return result.feedback
        }}
        onConfirmResult={id => {
          const result = confirmMockMatchResult(id)
          model.setResults(result.updateResults)
          return result.feedback
        }}
        onDisputeResult={id => {
          const result = disputeMockMatchResult(id)
          model.setResults(result.updateResults)
          return result.feedback
        }}/>
    )
    case 'discussion': return (
      <DiscussionPage content={readDiscussionContent()} posts={readDiscussionPosts(model.posts)} savedGames={model.savedGames}
        onCreateDiscussion={draft => {
          const result = createMockDiscussion(draft, model.profile.name)
          if (!result.ok) return false
          model.setPosts(previous => [result.item, ...previous]); model.notify(result.notice)
          return true
        }}
        onReplyToDiscussion={(id, body) => {
          const result = replyToMockDiscussion(id, body, model.profile.name)
          if (!result) return false
          model.setPosts(result.updatePosts)
          return true
        }}
        onToggleSavedGame={game => model.setSavedGames(toggleMockSavedGame(game))}/>
    )
    default: return <ProfilePage model={model} open={open} membership={membership}/>
  }
}

const communityPages = ['community-home', 'meet-play', 'championship', 'discussion', 'profile'] as const

export function ApplicationRoutes() {
  return (
    <Routes>
      <Route element={<App/>}>
        <Route index element={<Navigate to={pagePaths['my-home']} replace/>}/>
        <Route caseSensitive path={accountRootPath} element={<Navigate to={pagePaths['my-home']} replace/>}/>
        {accountTabs.map(({ id, path }) => (
          <Route
            key={id}
            caseSensitive
            path={path}
            element={<UserAccountPage page={id}/>}
          />
        ))}
        <Route caseSensitive path={pagePaths['premium-features']} element={<PremiumFeaturesPage/>}/>
        {communityPages.map(page => (
          <Route
            key={page}
            caseSensitive
            path={pagePaths[page]}
            element={<CommunityPage page={page}/>}
          />
        ))}
        <Route path="*" element={(
          <section className="panel">
            <h1>Page not found</h1>
            <p>This page does not exist.</p>
            <ActionLink className="button" to={pagePaths['my-home']}>Back to My Home</ActionLink>
          </section>
        )}/>
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthShell>
        <ApplicationRoutes/>
      </AuthShell>
    </BrowserRouter>
  )
}
