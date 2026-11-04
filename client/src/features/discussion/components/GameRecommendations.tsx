import { Button } from '../../../components/primitives/Controls'
import { Avatar, Icon, Tag } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import type { GameRecommendation } from '../types'
import styles from './GameRecommendations.module.css'

export function GameRecommendations({ recommendations, savedGames, onToggleSavedGame, onDiscussGames }: {
  recommendations: GameRecommendation[]; savedGames: string[]; onToggleSavedGame: (game: string) => void; onDiscussGames: () => void
}) {
  return (
    <>
      <div className="section-heading">
        <h2>A few community favorites</h2>
        <Button
          appearance="ghost"
          className="text-button"
          onClick={onDiscussGames}
        >
          Talk about your favorites <Icon name="arrow" size={17} />
        </Button>
      </div>
      <div className="card-grid">
        {recommendations.map(item => (
          <article className={styles['recommendation']} key={item.game}>
            <GameArt type={item.art} />
            <div>
              <Tag>{item.tag}</Tag>
              <h3>{item.game}</h3>
              <p>“{item.text}”</p>
              <div className="host">
                <Avatar name={item.name} />
                <span>Recommended by {item.name}</span>
              </div>
              <Button
                appearance="outline"
                full
                className="button secondary full"
                onClick={() => onToggleSavedGame(item.game)}
              >
                <Icon name={savedGames.includes(item.game) ? 'check' : 'plus'} size={16} />
                {savedGames.includes(item.game) ? 'On your play list' : 'Add to my play list'}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
