import { Button } from '../../../components/primitives/Controls'
import { Empty, Icon, Tabs, Tag } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import type { CommunityProfileActivity, CommunityProfileContent } from '../types'
import styles from './CommunityActivityPanel.module.css'

export function CommunityActivityPanel({ upcoming, content, selectedActivityView, onActivityViewChange, onOpenActivity }: {
  upcoming: CommunityProfileActivity[]; content: Pick<CommunityProfileContent, 'history' | 'achievements'>; selectedActivityView: string
  onActivityViewChange: (view: string) => void; onOpenActivity: (id: string) => void
}) {
  return (
    <section className="panel">
      <h2>Every table tells a story</h2>
      <Tabs
        items={['Upcoming', 'History', 'Achievements']}
        value={selectedActivityView}
        onChange={onActivityViewChange}
      />
      {selectedActivityView === 'Upcoming' && (
        <>
          {upcoming.map(item => (
            <Button
              appearance="unstyled"
              className={styles['activity-row']}
              key={item.id}
              onClick={() => onOpenActivity(item.id)}
            >
              <GameArt type={item.art} />
              <div>
                <strong>{item.title}</strong>
                <small>{item.dateLabel}</small>
              </div>
              <Tag>{item.statusLabel}</Tag>
              <Icon name="chevron" size={18} />
            </Button>
          ))}
          {!upcoming.length && (
            <Empty title="Your next table is out there">
              Find a game night to add something lovely to your calendar.
            </Empty>
          )}
        </>
      )}
      {selectedActivityView === 'History' && content.history.map(game => (
        <div className={styles['activity-row']} key={game.title}>
          <GameArt type={game.art} />
          <div>
            <strong>{game.title}</strong>
            <small>{game.date}</small>
          </div>
          <Tag><Icon name="check" size={13} /> Attended</Tag>
        </div>
      ))}
      {selectedActivityView === 'Achievements' && (
        <div className={styles['achievement-grid']}>
          {content.achievements.map(({ icon, title, text }) => (
            <div className={styles['achievement']} key={title}>
              <span className="round-icon gold"><Icon name={icon} size={28} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
