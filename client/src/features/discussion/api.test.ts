import { expect, it } from 'vitest'
import type { Post } from '../../mock/data'
import { createMockDiscussion, readDiscussionContent, readDiscussionPosts, readDiscussionTopics, replyToMockDiscussion,
  selectDiscussionMembers, selectDiscussionPosts, selectLocalSpots, toggleMockSavedGame } from './api'

const posts: Post[] = [
  { id: 'one', author: 'OnlyAuthor', topic: 'General', title: 'Hello world', body: 'A café and a game', replies: [{ author: 'Peer', body: 'OnlyReply' }] },
  { id: 'two', author: 'Peer', topic: 'Rules & tips', title: 'A practice round', body: 'Hello new players', replies: [] },
]

it('projects isolated feature records and content without unused member fixture fields', () => {
  const projected = readDiscussionPosts(posts)
  projected[0].replies[0].body = 'Edited'
  expect(posts[0].replies[0].body).toBe('OnlyReply')
  expect(projected[0]).not.toBe(posts[0])
  const content = readDiscussionContent()
  expect(content.members[0]).not.toHaveProperty('emoji')
  expect(content.spots.map(spot => spot.mapPosition)).toEqual([
    { left: '22%', top: '35%' }, { left: '48%', top: '60%' }, { left: '74%', top: '35%' },
  ])
  content.members[0].interests.push('Changed'); content.topics[0].name = 'Changed'
  content.guidelines.push('Changed'); content.spots[0].mapPosition.left = '0%'
  const fresh = readDiscussionContent()
  expect(fresh.members[0].interests).not.toContain('Changed')
  expect(fresh.topics[0].name).toBe('All discussions')
  expect(fresh.guidelines).not.toContain('Changed')
  expect(fresh.spots[0].mapPosition.left).toBe('22%')
  expect(fresh.newDiscussionForm).toMatchObject({ defaultTopic: 'General', titleMaxLength: 100, bodyMaxLength: 2000 })
  expect(fresh.replyMaxLength).toBe(1000)
})

it('combines topic and title/body search in source order without searching authors/replies or trimming queries', () => {
  expect(selectDiscussionPosts(posts, 'All discussions', 'HELLO').map(post => post.id)).toEqual(['one', 'two'])
  expect(selectDiscussionPosts(posts, 'General', 'hello').map(post => post.id)).toEqual(['one'])
  expect(selectDiscussionPosts(posts, 'General', 'CAFÉ').map(post => post.id)).toEqual(['one'])
  for (const query of ['OnlyAuthor', 'OnlyReply', '  hello  ']) expect(selectDiscussionPosts(posts, 'All discussions', query)).toEqual([])
  expect(selectDiscussionPosts(posts, 'Off-topic', '')).toEqual([])
  expect(selectDiscussionPosts([], 'All discussions', '')).toEqual([])
})

it('counts complete current snapshots independently of selected/search results and retains empty topics', () => {
  const options = readDiscussionContent().topics
  const counts = readDiscussionTopics(posts, options)
  expect(counts.map(row => row.count)).toEqual([2, 1, 0, 0, 0, 1, 0])
  expect(readDiscussionTopics([], options).every(row => row.count === 0)).toBe(true)
  const newPost = { ...posts[0], id: 'new' }
  expect(readDiscussionTopics([newPost, ...posts], options)[1].count).toBe(2)
  expect(selectDiscussionPosts(posts, 'General', 'absent')).toEqual([])
  expect(counts[0].count).toBe(2)
})

it('searches only member names/interests and filters spot cards without changing map content', () => {
  const content = readDiscussionContent()
  expect(selectDiscussionMembers(content.members, 'STRATEGY').map(member => member.name)).toEqual(['Lucía M.', 'David P.', 'José T.'])
  expect(selectDiscussionMembers(content.members, 'carlos').map(member => member.name)).toEqual(['Carlos R.'])
  expect(selectDiscussionMembers(content.members, 'Tegucigalpa')).toEqual([])
  expect(selectDiscussionMembers(content.members, 'storyteller')).toEqual([])
  expect(selectDiscussionMembers([], '')).toEqual([])
  for (const type of content.spotTypes.slice(1)) expect(selectLocalSpots(content.spots, type)).toHaveLength(1)
  expect(selectLocalSpots(content.spots, 'Unknown')).toEqual([])
  expect(selectLocalSpots([], 'All spots')).toEqual([])
  expect(content.spots).toHaveLength(3)
})

it('creates normalized unique conversations with current community author and no other mock updates', () => {
  const draft = { topic: 'Off-topic', title: '  Hola 👋  ', body: '  First line\nSecond line  ' }
  const created = createMockDiscussion(draft, 'Renamed preview')
  expect(created.ok).toBe(true)
  if (!created.ok) throw new Error('Expected creation')
  expect(created.item).toMatchObject({ author: 'Renamed preview', title: 'Hola 👋', body: 'First line\nSecond line', topic: 'Off-topic', replies: [] })
  expect(created.notice).toBe('Your conversation is on the community board.')
  const next = createMockDiscussion(draft, 'Another name')
  if (!next.ok) throw new Error('Expected creation')
  expect(next.item.id).not.toBe(created.item.id)
  expect(draft.title).toBe('  Hola 👋  ')
  expect(created).not.toHaveProperty('member')
})

it('silently rejects empty/whitespace creation and replies without constructing updates', () => {
  for (const blank of ['', ' \n ']) {
    expect(createMockDiscussion({ topic: 'General', title: blank, body: 'Body' }, 'Ana')).toEqual({ ok: false })
    expect(createMockDiscussion({ topic: 'General', title: 'Title', body: blank }, 'Ana')).toEqual({ ok: false })
    expect(replyToMockDiscussion('one', blank, 'Ana')).toBeNull()
  }
})

it('appends normalized replies to the latest snapshot immutably, keeping all other/new records', () => {
  const command = replyToMockDiscussion('one', '  A kind reply 👋  ', 'Current preview name')!
  const concurrent = { ...posts[0], replies: [...posts[0].replies, { author: 'Other', body: 'Concurrent reply' }] }
  const next = command.updatePosts([posts[1], concurrent, { ...posts[1], id: 'new' }])
  expect(next.map(post => post.id)).toEqual(['two', 'one', 'new'])
  expect(next[1].replies.map(reply => reply.body)).toEqual(['OnlyReply', 'Concurrent reply', 'A kind reply 👋'])
  expect(next[1].replies.at(-1)?.author).toBe('Current preview name')
  expect(next[0]).toBe(posts[1])
  expect(concurrent.replies).toHaveLength(2)
  expect(replyToMockDiscussion('missing', 'Body', 'Ana')!.updatePosts(posts)).toEqual(posts)
})

it('toggles games against the latest snapshot, preserving order/other saved games without mutation', () => {
  const previous = ['Azul', 'Wingspan']
  expect(toggleMockSavedGame('Cascadia')(previous)).toEqual(['Azul', 'Wingspan', 'Cascadia'])
  expect(toggleMockSavedGame('Azul')(previous)).toEqual(['Wingspan'])
  expect(toggleMockSavedGame('Azul')([])).toEqual(['Azul'])
  expect(previous).toEqual(['Azul', 'Wingspan'])
})
