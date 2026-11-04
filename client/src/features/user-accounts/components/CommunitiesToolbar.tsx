import { ActionLink } from '../../../components/primitives/Controls'
import { FilterChip, FilterChipGroup } from '../../../components/primitives/FilterChip'
import { Icon } from '../../../components/ui'
import type { CommunityFilter } from '../types'
import styles from './CommunitiesToolbar.module.css'

const filters = { all: 'All', managed: 'Managed', owned: 'Owned' } as const

type CommunitiesToolbarProps = {
  filter: CommunityFilter
  onFilterChange: (filter: CommunityFilter) => void
  createCommunityTo: string
}

export function CommunitiesToolbar({ filter, onFilterChange, createCommunityTo }: CommunitiesToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <FilterChipGroup label="Filter communities">
        {(Object.keys(filters) as CommunityFilter[]).map(value => (
          <FilterChip key={value} selected={filter === value} onClick={() => onFilterChange(value)}>{filters[value]}</FilterChip>
        ))}
      </FilterChipGroup>
      <ActionLink to={createCommunityTo}>Start New Community <Icon name="plus" size={18}/></ActionLink>
    </div>
  )
}
