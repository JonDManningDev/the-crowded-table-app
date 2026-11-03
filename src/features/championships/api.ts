import type { Result } from '../../mock/data'
import type { ChampionshipContent, ChampionshipMatchSummary, ChampionshipStanding, MatchResultDraft } from './types'

const players = [
  { name: 'Lucía M.', points: 38, games: 8 },
  { name: 'Carlos R.', points: 32, games: 7 },
  { name: 'Valeria G.', points: 29, games: 7 },
  { name: 'You', points: 24, games: 6 },
  { name: 'David P.', points: 22, games: 6 },
  { name: 'Mariana S.', points: 20, games: 5 },
]
const steps = [
  ['Join the championship', 'Your membership includes entry. Nonmembers are welcome with a competition ticket.'],
  ['Play wherever you gather', 'Arrange qualifying games with other registered players — at a café, a home, or a community table.'],
  ['Record, confirm, cheer each other on', 'Submit your result and have another player confirm it. Only confirmed games count.'],
  ['A seat at The Final Table', 'Our top six players gather on October 25 for a friendly in-person final.'],
]
const champions = [
  { month: 'September', game: 'Catan', name: 'Ana R.', art: 'forest' as const },
  { month: 'August', game: 'Carcassonne', name: 'Daniel M.', art: 'rail' as const },
]
const rules = [
  'Register before playing a qualifying game.',
  'Play the standard Ticket to Ride base game with another registered player.',
  'For this preview, a two-player win earns 5 points; second place earns 3. Tied scores go to review.',
  'Another participant must confirm the submitted result. Pending and disputed results do not count.',
  'Qualifying closes October 24. The top six meet on October 25.',
  'Be kind, explain the rules, and put people before points.',
]

// Sample content only; the real competition domain/rules are separately deferred.
export function readChampionshipContent(): ChampionshipContent {
  return {
    hero: { badge: 'OCTOBER 2026 CHAMPIONSHIP', game: 'Ticket to Ride', art: 'rail', qualifyingLabel: 'October 1 – 24' },
    stats: [
      { value: '32', label: 'players, and counting' }, { value: '48', label: 'games played together' },
      { value: '6', label: 'seats at The Final Table' }, { value: 'Oct 25', label: 'one memorable finale' },
    ],
    steps: steps.map(([title, body]) => [title, body]),
    champions: champions.map(row => ({ ...row, year: 2026 })), rules: [...rules],
    entry: { art: 'rail', title: 'October Championship · Ticket to Ride', schedule: 'Qualify October 1–24 · Final October 25' },
    final: { title: 'The October Final Table', dateTime: 'Sunday, October 25 · 6:00–10:00 PM',
      location: 'The Crowded Table · Tegucigalpa', game: 'Ticket to Ride', qualifierLabel: 'Top 6 players' },
    resultForm: { opponents: ['Lucía M.', 'Carlos R.', 'Valeria G.'], minDate: '2026-10-01', maxDate: '2026-10-24',
      initialDraft: { opponent: 'Lucía M.', date: '2026-10-04', score: '', opponentScore: '' } },
  }
}

// Retain the illustrative seeded baselines, 5/3 calculation, stable point-tie
// ordering and legacy display-name highlight behavior. No production identity or
// competition rule is established by this projection.
export function readChampionshipStandings(results: readonly Result[], profileName: string): ChampionshipStanding[] {
  const counted = results.filter(result => result.status === 'confirmed')
  return players.map(player => {
    const matches = counted.filter(result => (
      result.author === player.name || result.opponent === player.name
    ))
    const points = matches.reduce((sum, result) => {
      const won = result.author === player.name
        ? result.score > result.opponentScore
        : result.opponentScore > result.score
      return sum + (won ? 5 : 3)
    }, 0)
    return {
      name: player.name === 'You' ? profileName : player.name,
      isCurrentPlayer: (player.name === 'You' ? profileName : player.name) === profileName,
      points: player.points + points,
      games: player.games + matches.length,
    }
  }).sort((a, b) => b.points - a.points)
}

export function readChampionshipMatches(results: readonly Result[], profileName: string): ChampionshipMatchSummary[] {
  return results.map(result => ({
    id: result.id, authorLabel: result.author === 'You' ? profileName : result.author,
    opponentLabel: result.opponent === 'You' ? profileName : result.opponent,
    score: result.score, opponentScore: result.opponentScore, date: result.date, status: result.status,
    canReview: result.status === 'pending' && result.author !== 'You',
    waitingFor: result.status === 'pending' && result.author === 'You' ? result.opponent : null,
  }))
}

export function registerMockChampionship() {
  return { registered: true, notice: 'You’re in! Welcome to the October Championship.' }
}

export function submitMockMatchResult(draft: MatchResultDraft): { item: Result; feedback: string } {
  const score = Number(draft.score)
  const opponentScore = Number(draft.opponentScore)
  return {
    item: { id: crypto.randomUUID(), author: 'You', opponent: draft.opponent, score, opponentScore,
      date: draft.date, status: score === opponentScore ? 'disputed' : 'pending' },
    feedback: score === opponentScore
      ? 'Tied result sent for review. It is not included in standings.'
      : 'Your result was sent to your opponent for confirmation.',
  }
}

function reviewMockMatchResult(id: string, status: 'confirmed' | 'disputed', feedback: string) {
  return {
    // Functional update keeps concurrent/batched App changes; the same existing
    // pending/non-self eligibility is checked at the mock command boundary.
    updateResults: (previous: readonly Result[]): Result[] => previous.map(row => (
      row.id === id && row.status === 'pending' && row.author !== 'You' ? { ...row, status } : row
    )),
    feedback,
  }
}
export function confirmMockMatchResult(id: string) {
  return reviewMockMatchResult(id, 'confirmed', 'Result confirmed. The leaderboard has been updated.')
}
export function disputeMockMatchResult(id: string) {
  return reviewMockMatchResult(id, 'disputed', 'Result flagged for review. It will not count toward the leaderboard.')
}
