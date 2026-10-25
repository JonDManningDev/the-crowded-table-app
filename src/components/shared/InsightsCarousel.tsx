import type { ComponentProps } from 'react'
import { Button } from '../primitives/Controls'
import { InsightCard } from './InsightCard'
import styles from './InsightsCarousel.module.css'

export type InsightsCarouselItem = ComponentProps<typeof InsightCard> & { id: string }

type InsightsCarouselProps = {
  insights: readonly InsightsCarouselItem[]
  activeIndex: number
  onActiveIndexChange: (index: number) => void
}

export function InsightsCarousel({ insights, activeIndex, onActiveIndexChange }: InsightsCarouselProps) {
  if (!insights.length) return null
  const currentIndex = insights[activeIndex] ? activeIndex : 0
  const { id, ...card } = insights[currentIndex]

  return (
    <section className={styles.carousel} aria-label="Insights" aria-roledescription="carousel">
      <div className={styles.layout}>
        <div className={styles.slides}>
          <div key={id} role="group" aria-roledescription="slide" aria-label={`${currentIndex + 1} of ${insights.length}`}>
            <InsightCard {...card}/>
          </div>
          {insights.length > 1 && (
            <div className={styles.navigation} role="group" aria-label="Insight navigation">
              <Button appearance="outline" disabled={currentIndex === 0}
                onClick={() => onActiveIndexChange(currentIndex - 1)}>Previous insight</Button>
              <span className={styles.position} role="status" aria-live="polite" aria-atomic="true">
                Insight {currentIndex + 1} of {insights.length}
              </span>
              <Button appearance="outline" disabled={currentIndex === insights.length - 1}
                onClick={() => onActiveIndexChange(currentIndex + 1)}>Next insight</Button>
            </div>
          )}
        </div>
        <div className={styles.seeAll}>
          <Button appearance="outline" disabled>See all insights</Button>
        </div>
      </div>
    </section>
  )
}
