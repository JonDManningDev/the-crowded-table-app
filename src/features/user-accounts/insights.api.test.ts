import { expect, it, vi } from 'vitest'
import { readAccountProfileInsights } from './api'

vi.mock('../../lib/supabase', () => ({ supabase: null }))

it('supplies the existing sample insight independently of backend configuration and returns fresh data', () => {
  const first = readAccountProfileInsights()
  expect(first).toEqual([{
    id: 'co-player-circle',
    iconName: 'people',
    eyebrow: 'YOUR CIRCLE IS GROWING',
    heading: '18 different people. So many shared stories.',
    description: 'That’s how many community members you’ve played with. Here’s to the people you haven’t met yet.',
  }])
  first[0].heading = 'Changed only in this copy'
  first.push({ ...first[0], id: 'extra' })
  expect(readAccountProfileInsights()).toHaveLength(1)
  expect(readAccountProfileInsights()[0].heading).toBe('18 different people. So many shared stories.')
})
