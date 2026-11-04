import { expect, it } from 'vitest'
import { addMockCommunityNotification, markAllMockCommunityNotificationsRead, readCommunityNotifications, readInitialCommunityNotifications } from './api'

it('supplies isolated seed and presentation records without inventing delivery metadata', () => {
  const seed = readInitialCommunityNotifications()
  expect(seed).toEqual(['Welcome to your table. October is looking lovely.', 'David P. requested a seat at Sunday birds & brunch.'])
  const rows = readCommunityNotifications(seed)
  expect(rows).toEqual(seed.map(message => ({ message })))
  rows[0].message = 'Caller edit'; seed.length = 0
  expect(readInitialCommunityNotifications()).toHaveLength(2)
  expect(readCommunityNotifications([])).toEqual([])
})
it('prepends duplicate notices without mutating history and retains the clear-all simulation', () => {
  const source = ['Existing notice']
  const next = addMockCommunityNotification(source, 'New notice')
  expect(addMockCommunityNotification(next, 'New notice')).toEqual(['New notice', 'New notice', 'Existing notice'])
  expect(source).toEqual(['Existing notice'])
  const cleared = markAllMockCommunityNotificationsRead(); cleared.push('Caller edit')
  expect(markAllMockCommunityNotificationsRead()).toEqual([])
  expect(next).toEqual(['New notice', 'Existing notice'])
})
