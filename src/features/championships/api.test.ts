import { expect, it } from 'vitest'
import type { Result } from '../../mock/data'
import { confirmMockMatchResult, disputeMockMatchResult, readChampionshipContent, readChampionshipMatches, readChampionshipStandings, registerMockChampionship, submitMockMatchResult } from './api'

const pending: Result = { id: 'incoming', author: 'Lucía M.', opponent: 'You', score: 112, opponentScore: 98, status: 'pending', date: '2026-10-03' }

it('counts confirmed matches only, preserving seeded baselines and win/loss contributions', () => {
  const base = readChampionshipStandings([], 'Ana M.')
  expect(readChampionshipStandings([pending, { ...pending, id: 'disputed', status: 'disputed' }], 'Ana M.')).toEqual(base)
  const standings = readChampionshipStandings([{ ...pending, status: 'confirmed' }], 'Ana M.')
  expect(standings.find(row => row.name === 'Lucía M.')).toMatchObject({ points: 43, games: 9 })
  expect(standings.find(row => row.name === 'Ana M.')).toMatchObject({ points: 27, games: 7, isCurrentPlayer: true })
  expect(pending.status).toBe('pending')
})

it('uses either participant perspective and retains stable ordering for equal points', () => {
  const standings = readChampionshipStandings([{ ...pending, author: 'You', opponent: 'Carlos R.', score: 200, opponentScore: 100, status: 'confirmed' }], 'Renamed')
  expect(standings.find(row => row.name === 'Renamed')).toMatchObject({ points: 29, games: 7 })
  expect(standings.find(row => row.name === 'Carlos R.')).toMatchObject({ points: 35, games: 8 })
  expect(standings.filter(row => row.points === 29).map(row => row.name)).toEqual(['Valeria G.', 'Renamed'])
})

it('preserves display-name substitution and the current legacy name-based highlight behavior', () => {
  const matches = readChampionshipMatches([pending, { ...pending, id: 'self', author: 'You', opponent: 'Carlos R.' }], 'Renamed')
  expect(matches[0].opponentLabel).toBe('Renamed')
  expect(matches[1].authorLabel).toBe('Renamed')
  expect(readChampionshipStandings([], 'Renamed').find(row => row.isCurrentPlayer)?.name).toBe('Renamed')
  // Preserve the existing collision behavior; stable competition identity is deferred.
  expect(readChampionshipStandings([], 'Lucía M.').filter(row => row.isCurrentPlayer)).toHaveLength(2)
})

it('projects review eligibility and self-waiting labels without exposing fixture records', () => {
  const self = { ...pending, id: 'self', author: 'You', opponent: 'Carlos R.' }
  const matches = readChampionshipMatches([pending, self, { ...pending, id: 'done', status: 'confirmed' }, { ...self, id: 'tie', status: 'disputed' }], 'Ana')
  expect(matches.map(row => row.canReview)).toEqual([true, false, false, false])
  expect(matches.map(row => row.waitingFor)).toEqual([null, 'Carlos R.', null, null])
  expect(matches[0]).not.toHaveProperty('author')
  expect(matches[0]).not.toHaveProperty('opponent')
  expect(readChampionshipMatches([], 'Ana')).toEqual([])
})

it('returns isolated configuration including frozen native form bounds and illustrative content', () => {
  const content = readChampionshipContent()
  expect(content.resultForm).toMatchObject({ minDate: '2026-10-01', maxDate: '2026-10-24', initialDraft: { opponent: 'Lucía M.', date: '2026-10-04', score: '', opponentScore: '' } })
  expect(content.stats.map(row => row.value)).toEqual(['32', '48', '6', 'Oct 25'])
  content.steps[0][0] = 'Changed'; content.champions[0].name = 'Changed'; content.rules.push('Changed'); content.resultForm.initialDraft.score = '999'
  const next = readChampionshipContent()
  expect(next.steps[0][0]).toBe('Join the championship')
  expect(next.champions[0].name).toBe('Ana R.')
  expect(next.rules).not.toContain('Changed')
  expect(next.resultForm.initialDraft.score).toBe('')
})

it('registers only the mock competition flag/notice without a membership update', () => {
  expect(registerMockChampionship()).toEqual({ registered: true, notice: 'You’re in! Welcome to the October Championship.' })
  expect(registerMockChampionship()).not.toHaveProperty('member')
})

it('constructs unique self-submitted pending results and sends tied results to disputed review', () => {
  const draft = { ...readChampionshipContent().resultForm.initialDraft, score: '200', opponentScore: '123' }
  const submitted = submitMockMatchResult(draft)
  expect(submitted.item).toMatchObject({ author: 'You', opponent: 'Lucía M.', score: 200, opponentScore: 123, date: '2026-10-04', status: 'pending' })
  expect(submitMockMatchResult(draft).item.id).not.toBe(submitted.item.id)
  const tie = submitMockMatchResult({ ...draft, score: '0', opponentScore: '0' })
  expect(tie.item.status).toBe('disputed')
  expect(tie.feedback).toBe('Tied result sent for review. It is not included in standings.')
  expect(readChampionshipStandings([submitted.item, tie.item], 'Ana')).toEqual(readChampionshipStandings([], 'Ana'))
})

it('applies review to the latest supplied snapshot immutably without dropping appended results', () => {
  const command = confirmMockMatchResult(pending.id)
  const other = { ...pending, id: 'other' }
  const next = command.updateResults([pending, other])
  expect(next.map(row => row.status)).toEqual(['confirmed', 'pending'])
  expect(next[1]).toBe(other)
  expect(pending.status).toBe('pending')
  expect(command.feedback).toBe('Result confirmed. The leaderboard has been updated.')
  const disputed = disputeMockMatchResult(pending.id).updateResults([pending])
  expect(disputed[0].status).toBe('disputed')
  expect(readChampionshipStandings(disputed, 'Ana')).toEqual(readChampionshipStandings([], 'Ana'))
})

it('does not review self-submitted, already resolved or missing records', () => {
  const self = { ...pending, author: 'You' }
  const confirmed = { ...pending, status: 'confirmed' as const }
  for (const command of [confirmMockMatchResult(pending.id), disputeMockMatchResult(pending.id)]) {
    expect(command.updateResults([self])[0]).toBe(self)
    expect(command.updateResults([confirmed])[0]).toBe(confirmed)
  }
  expect(confirmMockMatchResult('absent').updateResults([pending])[0]).toBe(pending)
})
