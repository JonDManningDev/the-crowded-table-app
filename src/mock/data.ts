export const previewCommunity = {
  name: 'The Crowded Table',
  subtitle: 'GAMES · PEOPLE · BELONGING',
  location: 'Tegucigalpa, Honduras',
  motto: 'Different games.\nSame table.',
}
export type Art = 'azul' | 'birds' | 'rpg' | 'social' | 'rail' | 'forest' | 'mystery'
export type SeatStatus = 'confirmed' | 'requested' | 'waitlisted'
export type Activity = {
  id: string; title: string; kind: 'official' | 'table'; art: Art; category: string;
  date: string; time: string; end: string; capacity: number; filled: number; host: string;
  location: string; private: boolean; description: string; tags: string[];
  joinMode: 'instant' | 'request'; price?: number; special?: boolean; address?: string;
}
export type Profile = { name: string; location: string; bio: string; interests: string[]; style: string; teach: boolean }
export type Post = { id: string; author: string; topic: string; title: string; body: string; replies: { author: string; body: string }[] }
export type Result = { id: string; author: string; opponent: string; score: number; opponentScore: number; status: 'pending' | 'confirmed' | 'disputed'; date: string }
export const initialProfile: Profile = { name: 'Ana M.', location: 'Tegucigalpa', bio: 'Teacher, curious learner, and collector of games I promise I’ll play soon. Here for a good co-op, a cup of coffee, and new friends.', interests: ['Board Games', 'Cooperative', 'Strategy', 'Coffee', 'New Friends'], style: 'Casual', teach: true }
export const activities: Activity[] = [
  { id: 'azul', title: 'Learn & Play: Azul', kind: 'official', art: 'azul', category: 'Learn & Play', date: '2026-10-06', time: '19:30', end: '22:30', capacity: 10, filled: 7, host: 'The Crowded Table', location: 'The Crowded Table · Tegucigalpa', private: true, description: 'A little color. A little strategy. A lovely evening together. Discover the beautiful tile-laying world of Azul — we’ll teach you everything you need to know. Come on your own or bring a friend.', tags: ['Beginner friendly', 'Strategy', 'We’ll teach you'], joinMode: 'instant' },
  { id: 'rpg', title: 'An evening of adventure', kind: 'official', art: 'rpg', category: 'Special Game Night', date: '2026-10-08', time: '19:30', end: '22:30', capacity: 6, filled: 4, host: 'The Crowded Table', location: 'The Crowded Table · Tegucigalpa', private: true, description: 'One evening. One shared adventure. Step into a welcoming RPG one-shot with ready-made characters and a patient game master. No experience or equipment needed.', tags: ['RPG one-shot', 'All levels', 'New players welcome'], joinMode: 'instant' },
  { id: 'wingspan', title: 'Learn & Play: Wingspan', kind: 'official', art: 'birds', category: 'Learn & Play', date: '2026-10-13', time: '19:30', end: '22:30', capacity: 10, filled: 10, host: 'The Crowded Table', location: 'The Crowded Table · Tegucigalpa', private: true, description: 'Build a beautiful habitat, discover extraordinary birds, and learn this much-loved strategy game in good company.', tags: ['Nature', 'Strategy', 'Beginner friendly'], joinMode: 'instant' },
  { id: 'social', title: 'A little friendly competition', kind: 'official', art: 'social', category: 'Special Game Night', date: '2026-10-15', time: '19:30', end: '22:30', capacity: 10, filled: 5, host: 'The Crowded Table', location: 'The Crowded Table · Tegucigalpa', private: true, description: 'An easygoing mix of party games and classics. Expect a few surprises, a lot of laughter, and a seat beside someone new.', tags: ['Social', 'Party games'], joinMode: 'instant' },
  { id: 'halloween', title: 'A most curious murder', kind: 'official', art: 'mystery', category: 'Seasonal gathering', date: '2026-10-31', time: '18:00', end: '22:00', capacity: 24, filled: 16, host: 'The Crowded Table', location: 'Private event space · Tegucigalpa', private: true, description: 'Dress for an evening of secrets, suspicious alibis, and a deliciously puzzling mystery. A special gathering at a larger event space. Separate ticket required.', tags: ['Murder mystery', 'Costumes encouraged'], joinMode: 'instant', price: 250, special: true },
  { id: 'codenames', title: 'Codenames & coffee', kind: 'table', art: 'social', category: 'Social / Party', date: '2026-10-09', time: '18:00', end: '21:00', capacity: 6, filled: 4, host: 'Lucía M.', location: 'Café Paradiso · Col. Palmira', private: false, description: 'A few rounds of Codenames, good coffee, and no pressure to know all the rules. I’ll bring the game. You bring your most creative clues!', tags: ['Beginner friendly', 'Social', 'Public location'], joinMode: 'instant' },
  { id: 'forest', title: 'A cozy Cascadia afternoon', kind: 'table', art: 'forest', category: 'Board Game', date: '2026-10-10', time: '16:00', end: '19:00', capacity: 4, filled: 2, host: 'Valeria G.', location: 'Private location · Tegucigalpa', private: true, description: 'Let’s make a little wilderness together. A relaxed afternoon of Cascadia, tea, and conversation. Happy to teach!', tags: ['Strategy', 'Beginner friendly', 'Cozy'], joinMode: 'request' },
  { id: 'commander', title: 'Commander, casually', kind: 'table', art: 'rpg', category: 'TCG', date: '2026-10-10', time: '17:00', end: '21:00', capacity: 4, filled: 4, host: 'Carlos R.', location: 'Private location · Tegucigalpa', private: true, description: 'Bring a friendly Commander deck for a relaxed pod. This is about the conversation as much as the cards.', tags: ['TCG', 'Intermediate'], joinMode: 'instant' },
  { id: 'my-table', title: 'Sunday birds & brunch', kind: 'table', art: 'birds', category: 'Board Game', date: '2026-10-11', time: '10:00', end: '13:00', capacity: 5, filled: 2, host: 'You', location: 'Private location · Tegucigalpa', private: true, description: 'A slow Sunday with Wingspan. I’ll make coffee and show you how to play. Beginners very welcome.', tags: ['Beginner friendly', 'Nature'], joinMode: 'request' },
]
export const members = [
  { name: 'Lucía M.', color: 'peach', interests: ['Social', 'Strategy'], bio: 'Always up for one more round. Happy to teach Codenames.', emoji: 'LM' },
  { name: 'Carlos R.', color: 'sage', interests: ['RPGs', 'TCG'], bio: 'Storyteller, dungeon master, and enthusiastic dice collector.', emoji: 'CR' },
  { name: 'Valeria G.', color: 'lavender', interests: ['Cooperative', 'Family Games'], bio: 'Here for cozy games and meeting lovely people.', emoji: 'VG' },
  { name: 'David P.', color: 'gold', interests: ['Board Games', 'Strategy'], bio: 'New to the community. Teach me your favorite game!', emoji: 'DP' },
  { name: 'Mariana S.', color: 'peach', interests: ['Social', 'Cooperative'], bio: 'Party games, baking, and finding a reason to gather.', emoji: 'MS' },
  { name: 'José T.', color: 'sage', interests: ['RPGs', 'Strategy'], bio: 'A good story is even better around a crowded table.', emoji: 'JT' },
]
export const initialPosts: Post[] = [
  { id: 'p1', author: 'Lucía M.', topic: 'General', title: 'A little hello to our newest faces 👋', body: 'If you’ve just joined, tell us your name and the game you can always be persuaded to play. Mine is Codenames. Every single time.', replies: [{ author: 'Valeria G.', body: 'Cascadia, with a cup of tea! So happy to be here.' }, { author: 'David P.', body: 'Ticket to Ride! Looking forward to meeting everyone.' }] },
  { id: 'p2', author: 'Carlos R.', topic: 'Meetups & players', title: 'Anyone curious about their first RPG?', body: 'Thinking of hosting a beginner one-shot later this month. No homework, no expensive books — just bring your imagination. What kind of story would you like to try?', replies: [{ author: 'Mariana S.', body: 'A cozy mystery would be wonderful.' }] },
  { id: 'p3', author: 'Valeria G.', topic: 'Game recommendations', title: 'Three lovely games to play with non-gamers', body: 'Azul for the colors, Cascadia for the calm, and Just One for the laughs. What would you add to a welcoming first game night?', replies: [] },
  { id: 'p4', author: 'José T.', topic: 'Rules & tips', title: 'The best way to teach a new game?', body: 'I like to explain the goal first, play a practice round, and let the questions come naturally. What works at your table?', replies: [] },
]
export const topics = ['All discussions', 'General', 'Game recommendations', 'Meetups & players', 'Event discussions', 'Rules & tips', 'Off-topic']
export const interests = ['Board Games', 'Cooperative', 'Strategy', 'RPGs', 'TCG', 'Family Games', 'Social', 'Coffee', 'New Friends', 'Nature']
