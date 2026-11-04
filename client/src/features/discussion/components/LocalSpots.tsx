import { Button } from '../../../components/primitives/Controls'
import { Icon, Tag } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import type { LocalSpot } from '../types'
import styles from './LocalSpots.module.css'

export function LocalSpots({ spots, mapSpots, spotTypes, mapArea, selectedSpotType, onSpotTypeChange, onOpenSpot }: {
  spots: LocalSpot[]; mapSpots: LocalSpot[]; spotTypes: string[]; mapArea: string; selectedSpotType: string
  onSpotTypeChange: (type: string) => void; onOpenSpot: (name: string) => void
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>A few places to gather</h2>
          <p className="meta">Illustrative community suggestions · confirm venue details before visiting.</p>
        </div>
        <select aria-label="Filter local spots" value={selectedSpotType} onChange={event => onSpotTypeChange(event.target.value)}>
          {spotTypes.map(name => <option key={name}>{name}</option>)}
        </select>
      </div>
      <div className={styles['local-map']}>
        <div className={styles['map-road']} />
        <div className={`${styles['map-road']} ${styles.two}`} />
        <div className={`${styles['map-road']} ${styles.three}`} />
        <span className={styles['map-area']}>{mapArea}</span>
        {mapSpots.map(item => (
          <Button
            appearance="unstyled"
            key={item.name}
            aria-label={item.name}
            style={item.mapPosition}
            onClick={() => onOpenSpot(item.name)}
          >
            <Icon name="pin" size={22} />
            <span>{item.name}</span>
          </Button>
        ))}
      </div>
      <div className="card-grid">
        {spots.map(item => (
          <Button
            appearance="unstyled"
            className={`panel ${styles['place-card']}`}
            key={item.name}
            onClick={() => onOpenSpot(item.name)}
          >
            <GameArt type={item.art} />
            <Tag>{item.type}</Tag>
            <h3>{item.name}</h3>
            <p>{item.text}</p>
            <span className="meta">{item.area} <Icon name="arrow" size={16} /></span>
          </Button>
        ))}
      </div>
    </>
  )
}
