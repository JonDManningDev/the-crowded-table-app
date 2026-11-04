import { members, topics } from '../../mock/data'
import type { Post } from '../../mock/data'
import type { DiscussionContent, DiscussionMember, DiscussionPost, DiscussionTopicOption, LocalSpot, NewDiscussionDraft } from './types'

const topicIcons = ['chat', 'people', 'dice', 'calendar', 'star', 'leaf', 'heart']
const places = [
  {
    name: 'Café Paradiso',
    type: 'Cafés',
    area: 'Col. Palmira',
    text: 'Good coffee. Big tables. A lovely spot for a casual game.',
    art: 'birds' as const,
  },
  {
    name: 'The Dice Corner',
    type: 'Stores',
    area: 'Central Tegucigalpa',
    text: 'A welcoming place to find a new game and fellow players.',
    art: 'rpg' as const,
  },
  {
    name: 'Parque La Leona',
    type: 'Play spaces',
    area: 'La Leona',
    text: 'Fresh air, city views, and room for a sunny afternoon.',
    art: 'forest' as const,
  },
]
const recommendations = [
  {
    game: 'Cascadia',
    art: 'forest' as const,
    name: 'Lucía M.',
    text: 'A peaceful little puzzle. Perfect for a quiet afternoon with someone new.',
    tag: 'Nature & strategy',
  },
  {
    game: 'Azul',
    art: 'azul' as const,
    name: 'Valeria G.',
    text: 'Beautiful to look at, easy to teach, and so satisfying. My first-night favorite.',
    tag: 'Beginner friendly',
  },
  {
    game: 'Wingspan',
    art: 'birds' as const,
    name: 'Carlos R.',
    text: 'Come for the birds. Stay for the clever little engine you build together.',
    tag: 'Thoughtful strategy',
  },
]
const guidelines = [
  'Welcome new people and every experience level.',
  'Be kind, respectful, and curious. No harassment or exclusion.',
  'Respect privacy. Don’t share someone’s address or personal information.',
  'Keep your commitments; release seats when plans change.',
  'Help each other learn. A shared laugh is worth more than a win.',
]

// Sample social content only; no directory authorization or venue service.
export function readDiscussionContent(): DiscussionContent {
  return {
    topics: topics.map((name, index) => ({ name, icon: topicIcons[index] })),
    members: members.map(({ name, color, bio, interests }) => ({ name, color, bio, interests: [...interests],
      location: 'Tegucigalpa', memberSince: 'September 2026' })),
    recommendations: recommendations.map(item => ({ ...item })),
    spots: places.map((item, index) => ({ ...item, mapPosition: {
      left: `${22 + index * 26}%`, top: `${35 + index % 2 * 25}%`,
    } })),
    spotTypes: ['All spots', 'Cafés', 'Stores', 'Play spaces'], mapArea: 'TEGUCIGALPA',
    guidelines: [...guidelines],
    newDiscussionForm: { topics: topics.slice(1), defaultTopic: 'General', titleMaxLength: 100, bodyMaxLength: 2000 },
    replyMaxLength: 1000,
  }
}

export function readDiscussionPosts(posts: readonly Post[]): DiscussionPost[] {
  return posts.map(({ id, author, topic, title, body, replies }) => ({ id, author, topic, title, body,
    replies: replies.map(reply => ({ ...reply })),
  }))
}
export function readDiscussionTopics(posts: readonly DiscussionPost[], options: DiscussionContent['topics']): DiscussionTopicOption[] {
  return options.map(option => ({ ...option, count: option.name === 'All discussions'
    ? posts.length : posts.filter(post => post.topic === option.name).length }))
}
export function selectDiscussionPosts(posts: readonly DiscussionPost[], topic: string, searchQuery: string) {
  const query = searchQuery.toLowerCase()
  return posts.filter(post => (topic === 'All discussions' || post.topic === topic)
    && `${post.title} ${post.body}`.toLowerCase().includes(query))
}
export function selectDiscussionMembers(source: readonly DiscussionMember[], searchQuery: string) {
  const query = searchQuery.toLowerCase()
  return source.filter(member => `${member.name} ${member.interests.join(' ')}`.toLowerCase().includes(query))
}
export function selectLocalSpots(source: readonly LocalSpot[], spotType: string) {
  return source.filter(spot => spotType === 'All spots' || spot.type === spotType)
}

// Preserve the prototype's silent whitespace rejection; native constraints stay
// in the forms. Real validation/moderation/audience rules are separate work.
export function createMockDiscussion(draft: NewDiscussionDraft, author: string):
  | { ok: false }
  | { ok: true; item: Post; notice: string } {
  const title = draft.title.trim()
  const body = draft.body.trim()
  if (!title || !body) return { ok: false }
  return { ok: true, item: { id: crypto.randomUUID(), author, title, body, topic: draft.topic, replies: [] },
    notice: 'Your conversation is on the community board.' }
}
export function replyToMockDiscussion(postId: string, reply: string, author: string) {
  const body = reply.trim()
  if (!body) return null
  return {
    updatePosts: (previous: readonly Post[]): Post[] => previous.map(post => post.id === postId
      ? { ...post, replies: [...post.replies, { author, body }] } : post),
  }
}
export function toggleMockSavedGame(game: string) {
  return (previous: readonly string[]): string[] => previous.includes(game)
    ? previous.filter(value => value !== game) : [...previous, game]
}
