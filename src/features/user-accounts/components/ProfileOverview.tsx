import { Button } from '../../../components/primitives/Controls'
import { Icon, Tag } from '../../../components/ui'
import type { MockModel } from '../../../mock/useMockState'
import { GameArt } from '../../../components/GameArt'

const favorites = [
  { name: 'Wingspan', art: 'birds' as const },
  { name: 'Codenames', art: 'social' as const },
  { name: 'Azul', art: 'azul' as const },
]

export function ProfileOverview({
  profile,
  onEdit,
}: {
  profile: MockModel['profile']
  onEdit?: () => void
}) {
  return (
    <>
      <section className="panel">
        <span className="eyebrow">A LITTLE INTRODUCTION</span>
        <h2>About me</h2>
        <p className="description">{profile.bio}</p>
        <div className="section-heading">
          <h3>At the table, I’m…</h3>
          {onEdit && (
            <Button appearance="ghost" className="text-button" onClick={onEdit}>
              Edit <Icon name="arrow" size={16}/>
            </Button>
          )}
        </div>
        <div className="tags">
          <Tag>{profile.style}</Tag>
          {profile.teach && (
            <Tag>
              <Icon name="leaf" size={14}/> Happy to teach
            </Tag>
          )}
          <Tag>Always up for a new game</Tag>
        </div>
      </section>
      <section className="panel connection-panel">
        <span className="round-icon">
          <Icon name="people" size={28}/>
        </span>
        <div>
          <span className="eyebrow">YOUR CIRCLE IS GROWING</span>
          <h2>
            18 different people.<br/>So many shared stories.
          </h2>
          <p>
            That’s how many community members you’ve played with.<br/>
            Here’s to the people you haven’t met yet.
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>A few favorite games</h2>
          <Icon name="dice"/>
        </div>
        <div className="favorites">
          {favorites.map(game => (
            <div key={game.name}>
              <GameArt type={game.art}/>
              <h3>{game.name}</h3>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
