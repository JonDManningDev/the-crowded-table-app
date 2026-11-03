import { Icon } from '../../../components/ui'
import type { TableFilterValues } from '../types'
import styles from './TableFilters.module.css'

export function TableFilters({ filters, gameTypes, locations, onFiltersChange }: {
  filters: TableFilterValues
  gameTypes: string[]
  locations: string[]
  onFiltersChange: (filters: TableFilterValues) => void
}) {
  return (
    <div className={styles.filters}>
      <label className={`search ${styles.search}`}>
        <Icon name="search"/>
        <input
          placeholder="Find a game, host, or place…"
          aria-label="Search tables"
          value={filters.searchQuery}
          onChange={event => onFiltersChange({ ...filters, searchQuery: event.target.value })}
        />
      </label>
      <select aria-label="Game type" value={filters.gameType} onChange={event => onFiltersChange({ ...filters, gameType: event.target.value })}>
        {gameTypes.map(name => <option key={name}>{name}</option>)}
      </select>
      <select aria-label="Location type" value={filters.locationType} onChange={event => onFiltersChange({ ...filters, locationType: event.target.value })}>
        {locations.map(name => <option key={name}>{name}</option>)}
      </select>
      <label className={`check-label ${styles.beginner}`}>
        <input type="checkbox" checked={filters.beginnerFriendlyOnly} onChange={event => onFiltersChange({ ...filters, beginnerFriendlyOnly: event.target.checked })}/>
        Beginner friendly
      </label>
    </div>
  )
}
