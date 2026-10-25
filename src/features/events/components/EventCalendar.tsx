import { Button } from '../../../components/primitives/Controls'
import { Empty, Icon } from '../../../components/ui'
import { formatTime } from '../../../lib/dateTime'
import type { EventCalendarData } from '../types'
import styles from './EventCalendar.module.css'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function EventCalendar({ calendar, onMonthChange, onOpenEvent }: {
  calendar: EventCalendarData
  onMonthChange: (month: number) => void
  onOpenEvent: (id: string) => void
}) {
  return (
    <section className={styles['calendar-panel']}>
      <div className={styles['calendar-heading']}>
        <Button
          appearance="unstyled"
          className="icon-button"
          aria-label="Previous month"
          onClick={() => calendar.previousMonth !== null && onMonthChange(calendar.previousMonth)}
          disabled={calendar.previousMonth === null}
        >
          <span className={styles['rotate']}><Icon name="chevron"/></span>
        </Button>
        <h3>{calendar.monthLabel}</h3>
        <Button
          appearance="unstyled"
          className="icon-button"
          aria-label="Next month"
          onClick={() => calendar.nextMonth !== null && onMonthChange(calendar.nextMonth)}
          disabled={calendar.nextMonth === null}
        >
          <Icon name="chevron"/>
        </Button>
      </div>
      <div className={styles['calendar-grid']}>
        {weekdays.map(day => <div className={styles['weekday']} key={day}>{day}</div>)}
        {Array.from({ length: calendar.leadingDays }, (_, index) => (
          <div key={`blank${index}`} className={`${styles['calendar-day']} ${styles.blank}`}/>
        ))}
        {calendar.days.map(({ day, events }) => (
          <div className={styles['calendar-day']} key={day}>
            <span>{day}</span>
            {events.map(row => (
              <Button
                appearance="unstyled"
                key={row.id}
                className={`${styles['calendar-event']} ${row.special ? 'lavender' : row.category === 'Learn & Play' ? 'sage' : 'peach'}`}
                onClick={() => onOpenEvent(row.id)}
              >
                <b>{row.title}</b>
                <small>{formatTime(row.time)}</small>
              </Button>
            ))}
          </div>
        ))}
      </div>
      {!calendar.hasEvents && (
        <Empty title="A little space for what’s next">
          Our {calendar.monthName} evenings
          haven’t been announced. Browse October for our current gatherings.
        </Empty>
      )}
    </section>
  )
}
