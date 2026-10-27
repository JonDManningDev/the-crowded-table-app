import { cancelMockActivityReservation, reserveMockActivity } from '../features/events/api'
import { decideMockTableSeatRequest, sendMockTableMessage } from '../features/meet-and-play/api'
import type { TableMessage, TableSeatRequestRecord } from '../features/meet-and-play/types'
import { useState } from 'react'
import { activities, initialPosts, initialProfile } from './data'
import type { Activity, Post, Profile, Result, SeatStatus } from './data'

export function useMockState() {
  const [member, setMember] = useState(true)
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [items, setItems] = useState<Activity[]>(activities)
  const [seats, setSeats] = useState<Record<string, SeatStatus>>({})
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [messages, setMessages] = useState<Record<string, TableMessage[]>>({})
  const [requests, setRequests] = useState<TableSeatRequestRecord[]>([
    { id: 'req1', activity: 'my-table', name: 'David P.', status: 'pending' },
  ])
  const [registered, setRegistered] = useState(false)
  const [results, setResults] = useState<Result[]>([{
    id: 'result1',
    author: 'Lucía M.',
    opponent: 'You',
    score: 112,
    opponentScore: 98,
    status: 'pending',
    date: '2026-10-03',
  }])
  const [notices, setNotices] = useState([
    'Welcome to your table. October is looking lovely.',
    'David P. requested a seat at Sunday birds & brunch.',
  ])
  const [matching, setMatching] = useState(false)
  const [matchingPreferences, setMatchingPreferences] = useState({
    availability: 'Saturday evening',
    game: 'Strategy games',
    style: 'Casual — here for good company',
    notes: '',
  })
  const [savedGames, setSavedGames] = useState<string[]>([])
  const [preferences, setPreferences] = useState({
    reminders: true,
    replies: true,
    digest: false,
    history: false,
  })
  const notify = (message: string) => setNotices(previous => [message, ...previous])
  function join(item: Activity) {
    const result = reserveMockActivity(item, seats, member)
    if (!result) return
    setSeats(previous => ({ ...previous, [item.id]: result.status }))
    if (result.filledChange) {
      setItems(previous => previous.map(row => row.id === item.id ? { ...row, filled: row.filled + result.filledChange } : row))
    }
    notify(result.notice)
  }
  function cancel(id: string) {
    const result = cancelMockActivityReservation(id, seats)
    if (result.filledChange) {
      setItems(previous => previous.map(row => row.id === id ? { ...row, filled: Math.max(0, row.filled + result.filledChange) } : row))
    }
    setSeats(previous => { const next = { ...previous }; delete next[id]; return next })
    notify(result.notice)
  }
  function decideRequest(id: string, accept: boolean) {
    const result = decideMockTableSeatRequest(id, accept, requests, items)
    if (!result) return
    setRequests(previous => previous.map(row => row.id === id ? { ...row, status: result.status } : row))
    if (result.filledChange) {
      setItems(previous => previous.map(row => row.id === result.activityId ? { ...row, filled: row.filled + result.filledChange } : row))
    }
    notify(result.notice)
  }
  function sendMessage(id: string, text: string) {
    const entry = sendMockTableMessage(profile.name, text)
    if (!entry) return false
    setMessages(previous => ({ ...previous, [id]: [...(previous[id] || []), entry] }))
    return true
  }
  return {
    member,
    setMember,
    profile,
    setProfile,
    items,
    setItems,
    seats,
    join,
    cancel,
    posts,
    setPosts,
    messages,
    sendMessage,
    requests,
    decideRequest,
    registered,
    setRegistered,
    results,
    setResults,
    notices,
    setNotices,
    notify,
    matching,
    setMatching,
    matchingPreferences,
    setMatchingPreferences,
    savedGames,
    setSavedGames,
    preferences,
    setPreferences,
  }
}
export type MockModel = ReturnType<typeof useMockState>
