import { Button } from '../../../components/primitives/Controls'
import { Notice } from '../../../components/primitives/Notice'
import { Empty, Icon, Tag } from '../../../components/ui'
import type { ChampionshipMatchSummary } from '../types'
import styles from './ChampionshipMatches.module.css'

export function ChampionshipMatches({ isRegistered, matches, feedback, onOpenResult, onConfirmResult, onDisputeResult }: {
  isRegistered: boolean
  matches: ChampionshipMatchSummary[]
  feedback: string
  onOpenResult: () => void
  onConfirmResult: (id: string) => void
  onDisputeResult: (id: string) => void
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Your games, together</h2>
        <Button appearance="primary" className="button" onClick={onOpenResult}>
          {isRegistered ? 'Submit Result' : 'Register to play'}
          <Icon name="plus" size={17}/>
        </Button>
      </div>
      {!isRegistered ? (
        <Empty title="Your first match is waiting">
          Join this month’s championship to submit results and confirm games.
        </Empty>
      ) : matches.map(result => (
        <div className={styles.result} key={result.id}>
          <div>
            <Tag tone={result.status === 'confirmed' ? '' : 'peach'}>
              {result.status === 'pending' ? 'Awaiting confirmation' : result.status}
            </Tag>
            <h3>
              {result.authorLabel}
              {' & '}
              {result.opponentLabel}
            </h3>
            <p>{result.date} · Score {result.score} — {result.opponentScore}</p>
          </div>
          <div className="actions">
            {result.canReview ? (
              <>
                <Button appearance="primary" small className="button small" onClick={() => onConfirmResult(result.id)}>Confirm</Button>
                <Button appearance="outline" small className="button secondary small" onClick={() => onDisputeResult(result.id)}>Dispute</Button>
              </>
            ) : result.waitingFor !== null ? (
              <span className="meta">
                Waiting for {result.waitingFor}<br/>
                You cannot confirm your own result.
              </span>
            ) : null}
          </div>
        </div>
      ))}
      {feedback && <Notice role="status" variant="positive">{feedback}</Notice>}
    </section>
  )
}
