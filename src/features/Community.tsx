import styles from './Community.module.css'
import { GuidanceNote } from '../components/shared/GuidanceNote'
import { Notice } from '../components/primitives/Notice'
import { Button } from '../components/primitives/Controls'
import { useState } from 'react'
import type { MockModel } from '../mock/useMockState'
import { members, topics } from '../mock/data'
import { Avatar, Botanical, Empty, Heading, Icon, Modal, Tabs, Tag } from '../components/ui'
import { GameArt } from '../components/GameArt'

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

export function Community({ model }: { model: MockModel }) {
  const [tab, setTab] = useState('Discussions')
  const [topic, setTopic] = useState('All discussions')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const saved = model.savedGames
  const setSaved = model.setSavedGames
  const [spot, setSpot] = useState('All spots')
  const post = model.posts.find(item => item.id === modal)
  const person = members.find(member => member.name === modal)
  const query = search.toLowerCase()
  const filtered = model.posts.filter(item => (
    (topic === 'All discussions' || item.topic === topic)
    && `${item.title} ${item.body}`.toLowerCase().includes(query)
  ))
  const visibleMembers = members.filter(member => (
    `${member.name} ${member.interests.join(' ')}`.toLowerCase().includes(query)
  ))
  const place = places.find(item => item.name === modal)
  return (
    <>
      <Heading
        eyebrow="PEOPLE MAKE THE BEST GAMES"
        title="A place to belong."
        action={(
          <Button appearance="primary" className="button" onClick={() => setModal('new')}>
            <Icon name="plus" size={18}/> Start a conversation
          </Button>
        )}
      >
        Same table. More friends. Make yourself at home.
      </Heading>
      <div className="community-hero">
        <div>
          <span className="eyebrow">YOUR LITTLE CORNER OF TEGUCIGALPA</span>
          <h2 data-heading="hero">Come for a game.<br/>Stay for the people.</h2>
        </div>
        <p>
          Ask a question. Share a favorite.<br/>
          Say hello to someone new.<br/>
          <strong>There’s a whole community around you.</strong>
        </p>
        <Botanical/>
      </div>
      <Tabs
        items={['Discussions', 'Members', 'Game Recommendations', 'Local Spots']}
        value={tab}
        onChange={value => {
          setTab(value)
          setSearch('')
        }}
      />
      {tab === 'Discussions' && (
        <div className="discussion-layout">
          <aside className="topic-panel">
            <span className="eyebrow">AROUND THE COMMUNITY</span>
            {topics.map((name, index) => (
              <Button
                appearance="unstyled"
                key={name}
                className={topic === name ? 'selected' : ''}
                onClick={() => setTopic(name)}
              >
                <Icon name={topicIcons[index]} size={18}/>
                {name}
                <span>
                  {name === 'All discussions'
                    ? model.posts.length
                    : model.posts.filter(item => item.topic === name).length}
                </span>
              </Button>
            ))}
            <div className="guideline">
              <Icon name="heart"/>
              <h3>A kinder kind of community</h3>
              <p>Welcome every experience level. Listen with curiosity. Keep people at the heart of play.</p>
              <Button appearance="ghost" className="text-button" onClick={() => setModal('guidelines')}>
                Our table manners <Icon name="arrow" size={15}/>
              </Button>
            </div>
          </aside>
          <section>
            <label className="search">
              <Icon name="search"/>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Find a conversation…"
                aria-label="Search discussions"
              />
            </label>
            <div className="post-list">
              {filtered.map(item => (
                <Button
                  appearance="unstyled"
                  className="post-card"
                  key={item.id}
                  onClick={() => {
                    setReply('')
                    setModal(item.id)
                  }}
                >
                  <div className="host">
                    <Avatar name={item.author}/>
                    <div>
                      <strong>{item.author}</strong>
                      <small>Community member</small>
                    </div>
                    <Tag>{item.topic}</Tag>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <div className="post-footer">
                    <span>
                      <Icon name="chat" size={16}/> {item.replies.length}{' '}
                      {item.replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                    <span>Join the conversation <Icon name="arrow" size={16}/></span>
                  </div>
                </Button>
              ))}
            </div>
            {!filtered.length && (
              <Empty title="Be the first to pull up a chair">
                Start a conversation in this topic, or try another search.
              </Empty>
            )}
          </section>
        </div>
      )}
      {tab === 'Members' && (
        <>
          <div className="filter-bar">
            <label className="search">
              <Icon name="search"/>
              <input
                aria-label="Search members"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Find people by name or interest…"
              />
            </label>
            <Tag><Icon name="lock" size={14}/> Visible to members only</Tag>
          </div>
          <div className="card-grid">
            {visibleMembers.map(member => (
              <Button
                appearance="unstyled"
                className="panel member-card"
                key={member.name}
                onClick={() => setModal(member.name)}
              >
                <Avatar name={member.name} large tone={member.color}/>
                <h3>{member.name}</h3>
                <p className="meta"><Icon name="pin" size={14}/> Tegucigalpa</p>
                <p>{member.bio}</p>
                <div className="tags">{member.interests.map(interest => <Tag key={interest}>{interest}</Tag>)}</div>
                <span className="text-button">
                  Get to know {member.name.split(' ')[0]} <Icon name="arrow" size={16}/>
                </span>
              </Button>
            ))}
          </div>
          {!visibleMembers.length && (
            <Empty title="No one found just yet">Try a different name or interest.</Empty>
          )}
        </>
      )}
      {tab === 'Game Recommendations' && (
        <>
          <div className="section-heading">
            <h2>A few community favorites</h2>
            <Button
              appearance="ghost"
              className="text-button"
              onClick={() => {
                setTopic('Game recommendations')
                setTab('Discussions')
              }}
            >
              Talk about your favorites <Icon name="arrow" size={17}/>
            </Button>
          </div>
          <div className="card-grid">
            {recommendations.map(item => (
              <article className="recommendation" key={item.game}>
                <GameArt type={item.art}/>
                <div>
                  <Tag>{item.tag}</Tag>
                  <h3>{item.game}</h3>
                  <p>“{item.text}”</p>
                  <div className="host">
                    <Avatar name={item.name}/>
                    <span>Recommended by {item.name}</span>
                  </div>
                  <Button
                    appearance="outline"
                    full
                    className="button secondary full"
                    onClick={() => setSaved(previous => (
                      previous.includes(item.game)
                        ? previous.filter(value => value !== item.game)
                        : [...previous, item.game]
                    ))}
                  >
                    <Icon name={saved.includes(item.game) ? 'check' : 'plus'} size={16}/>
                    {saved.includes(item.game) ? 'On your play list' : 'Add to my play list'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === 'Local Spots' && (
        <>
          <div className="section-heading">
            <div>
              <h2>A few places to gather</h2>
              <p className="meta">Illustrative community suggestions · confirm venue details before visiting.</p>
            </div>
            <select aria-label="Filter local spots" value={spot} onChange={event => setSpot(event.target.value)}>
              {['All spots', 'Cafés', 'Stores', 'Play spaces'].map(name => <option key={name}>{name}</option>)}
            </select>
          </div>
          <div className="local-map">
            <div className="map-road one"/>
            <div className="map-road two"/>
            <div className="map-road three"/>
            <span className="map-area">TEGUCIGALPA</span>
            {places.map((item, index) => (
              <Button
                appearance="unstyled"
                key={item.name}
                style={{ left: `${22 + index * 26}%`, top: `${35 + index % 2 * 25}%` }}
                onClick={() => setModal(item.name)}
              >
                <Icon name="pin" size={22}/>
                <span>{item.name}</span>
              </Button>
            ))}
          </div>
          <div className="card-grid">
            {places.filter(item => spot === 'All spots' || item.type === spot).map(item => (
              <Button
                appearance="unstyled"
                className="panel place-card"
                key={item.name}
                onClick={() => setModal(item.name)}
              >
                <GameArt type={item.art}/>
                <Tag>{item.type}</Tag>
                <h3>{item.name}</h3>
                <p>{item.text}</p>
                <span className="meta">{item.area} <Icon name="arrow" size={16}/></span>
              </Button>
            ))}
          </div>
        </>
      )}
      {modal === 'new' && (
        <Modal title="Start a good conversation" onClose={() => setModal(null)}>
          <form className="form" onSubmit={event => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const title = String(form.get('title')).trim()
            const body = String(form.get('body')).trim()
            if (!title || !body) return
            const newTopic = String(form.get('topic'))
            model.setPosts(previous => [{
              id: crypto.randomUUID(),
              author: model.profile.name,
              title,
              body,
              topic: newTopic,
              replies: [],
            }, ...previous])
            setModal(null)
            setTab('Discussions')
            setTopic('All discussions')
            setSearch('')
            model.notify('Your conversation is on the community board.')
          }}>
            <label>
              Topic
              <select name="topic" defaultValue={topic === 'All discussions' ? 'General' : topic}>
                {topics.slice(1).map(name => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label>
              A little headline
              <input name="title" required maxLength={100} placeholder="What’s on your mind?"/>
            </label>
            <label>
              Pull up a chair
              <textarea
                name="body"
                required
                maxLength={2000}
                placeholder="A question, a recommendation, a little hello…"
              />
            </label>
            <Button appearance="primary" className="button" type="submit">
              Share with the community <Icon name="arrow" size={17}/>
            </Button>
          </form>
        </Modal>
      )}
      {post && (
        <Modal title="Around the community board" onClose={() => setModal(null)}>
          <Tag>{post.topic}</Tag>
          <h2 className="detail-title">{post.title}</h2>
          <div className="host">
            <Avatar name={post.author}/>
            <strong>{post.author}</strong>
          </div>
          <p className="description">{post.body}</p>
          <h3>{post.replies.length} replies</h3>
          {post.replies.map((item, index) => (
            <div className="chat-message" key={index}>
              <Avatar name={item.author}/>
              <div>
                <strong>{item.author}</strong>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
          <form className="form" onSubmit={event => {
            event.preventDefault()
            if (!reply.trim()) return
            model.setPosts(previous => previous.map(item => (
              item.id === post.id
                ? { ...item, replies: [...item.replies, { author: model.profile.name, body: reply.trim() }] }
                : item
            )))
            setReply('')
          }}>
            <label>
              Join the conversation
              <textarea
                required
                value={reply}
                onChange={event => setReply(event.target.value)}
                placeholder="A kind word goes a long way…"
                maxLength={1000}
              />
            </label>
            <Button appearance="primary" className="button" type="submit">
              Post reply <Icon name="arrow" size={17}/>
            </Button>
          </form>
        </Modal>
      )}
      {person && (
        <Modal title="Someone around your table" onClose={() => setModal(null)}>
          <div className="member-preview">
            <Avatar name={person.name} large tone={person.color}/>
            <h2>{person.name}</h2>
            <p>Tegucigalpa · Member since September 2026</p>
            <p className="description">{person.bio}</p>
            <div className="tags">{person.interests.map(interest => <Tag key={interest}>{interest}</Tag>)}</div>
            <div className={styles.guidance}>
              <GuidanceNote icon={<Icon name="people"/>}>
                Get to know each other at a shared table. Conversations happen in your confirmed table’s chat.
              </GuidanceNote>
            </div>
          </div>
        </Modal>
      )}
      {modal === 'guidelines' && (
        <Modal title="Good people. Good table manners." onClose={() => setModal(null)}>
          <ol className="rules">{guidelines.map(rule => <li key={rule}>{rule}</li>)}</ol>
        </Modal>
      )}
      {place && (
        <Modal title={modal!} onClose={() => setModal(null)}>
          <GameArt type={place.art} className="small-art"/>
          <p>{place.text}</p>
          <p className="muted">{place.area}</p>
          <Notice variant="caution">

            This is a sample place for exploring the design, not a verified venue listing.
          </Notice>
        </Modal>
      )}
    </>
  )
}
