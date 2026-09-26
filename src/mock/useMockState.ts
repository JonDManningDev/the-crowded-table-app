import { useState } from 'react'
import { activities, initialPosts, initialProfile } from './data'
import type { Activity, Post, Profile, Result, SeatStatus } from './data'

export function useMockState() {
  const [member, setMember] = useState(true)
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [items, setItems] = useState<Activity[]>(activities)
  const [seats, setSeats] = useState<Record<string, SeatStatus>>({})
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [messages, setMessages] = useState<Record<string, { author: string; text: string }[]>>({})
  const [requests, setRequests] = useState([{ id: 'req1', activity: 'my-table', name: 'David P.', status: 'pending' }])
  const [registered, setRegistered] = useState(false)
  const [results, setResults] = useState<Result[]>([{ id: 'result1', author: 'Lucía M.', opponent: 'You', score: 112, opponentScore: 98, status: 'pending', date: '2026-10-03' }])
  const [notices, setNotices] = useState(['Welcome to your table. October is looking lovely.', 'David P. requested a seat at Sunday birds & brunch.'])
  const [matching, setMatching] = useState(false)
  const [matchingPreferences, setMatchingPreferences] = useState({ availability: 'Saturday evening', game: 'Strategy games', style: 'Casual — here for good company', notes: '' })
  const [savedGames, setSavedGames] = useState<string[]>([])
  const [preferences, setPreferences] = useState({ reminders: true, replies: true, digest: false, history: false })
  const notify = (message: string) => setNotices(previous => [message, ...previous])
  function join(item: Activity) {
    if (seats[item.id]) return
    if (item.kind === 'table' && !member) return
    const status: SeatStatus = item.filled >= item.capacity ? 'waitlisted' : item.joinMode === 'request' ? 'requested' : 'confirmed'
    setSeats(previous => ({ ...previous, [item.id]: status }))
    if (status === 'confirmed') setItems(previous => previous.map(row => row.id === item.id ? { ...row, filled: row.filled + 1 } : row))
    notify(status === 'confirmed' ? `Your seat at ${item.title} is confirmed.` : status === 'requested' ? `Your request for ${item.title} was sent to the host.` : `You’re on the waitlist for ${item.title}.`)
  }
  function cancel(id: string) {
    if (seats[id] === 'confirmed') setItems(previous => previous.map(row => row.id === id ? { ...row, filled: Math.max(0, row.filled - 1) } : row))
    setSeats(previous => { const next = { ...previous }; delete next[id]; return next })
    notify('Your participation has been cancelled.')
  }
  function decideRequest(id: string, accept: boolean) {
    const request = requests.find(row => row.id === id)
    const item = items.find(row => row.id === request?.activity)
    if (!request || request.status !== 'pending' || !item || (accept && item.filled >= item.capacity)) return
    setRequests(previous => previous.map(row => row.id === id ? { ...row, status: accept ? 'accepted' : 'declined' } : row))
    if (accept) setItems(previous => previous.map(row => row.id === item.id ? { ...row, filled: row.filled + 1 } : row))
    notify(`${request.name}’s request was ${accept ? 'accepted' : 'declined'}.`)
  }
  return { member, setMember, profile, setProfile, items, setItems, seats, join, cancel, posts, setPosts, messages, setMessages, requests, decideRequest, registered, setRegistered, results, setResults, notices, setNotices, notify, matching, setMatching, matchingPreferences, setMatchingPreferences, savedGames, setSavedGames, preferences, setPreferences }
}
export type MockModel = ReturnType<typeof useMockState>
