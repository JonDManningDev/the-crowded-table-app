import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InsightsCarousel, type InsightsCarouselItem } from './InsightsCarousel'

afterEach(cleanup)

const insights: InsightsCarouselItem[] = [
  { id: 'first', icon: <span/>, eyebrow: 'First category', heading: 'First insight', description: 'First detail' },
  { id: 'second', icon: <span/>, eyebrow: 'Second category', heading: 'Second insight', description: 'Second detail' },
]

it('renders no carousel or placeholder action for an empty collection', () => {
  render(<InsightsCarousel insights={[]} activeIndex={0} onActiveIndexChange={vi.fn()}/>)
  expect(screen.queryByRole('region', { name: 'Insights' })).toBeNull()
  expect(screen.queryByText('See all insights')).toBeNull()
})

it('renders the single insight without navigation and keeps the all-insights action disabled', () => {
  render(<InsightsCarousel insights={[insights[0]]} activeIndex={0} onActiveIndexChange={vi.fn()}/>)
  expect(screen.getByRole('heading', { name: 'First insight' })).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Insight navigation' })).toBeNull()
  expect((screen.getByRole('button', { name: 'See all insights' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('group', { name: '1 of 1' })).toBeTruthy()
})

it('requests a selection change and waits for its parent before displaying the next card', () => {
  const onActiveIndexChange = vi.fn()
  const view = render(<InsightsCarousel insights={insights} activeIndex={0} onActiveIndexChange={onActiveIndexChange}/>)
  expect((screen.getByRole('button', { name: 'Previous insight' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Next insight' }))
  expect(onActiveIndexChange).toHaveBeenCalledExactlyOnceWith(1)
  expect(screen.queryByRole('heading', { name: 'Second insight' })).toBeNull()
  view.rerender(<InsightsCarousel insights={insights} activeIndex={1} onActiveIndexChange={onActiveIndexChange}/>)
  expect(screen.getByRole('heading', { name: 'Second insight' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'First insight' })).toBeNull()
  expect((screen.getByRole('button', { name: 'Next insight' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Previous insight' }))
  expect(onActiveIndexChange).toHaveBeenLastCalledWith(0)
})

it('supports keyboard navigation and announces the current position without auto-rotation', async () => {
  const user = userEvent.setup()
  function Example() {
    const [activeIndex, setActiveIndex] = useState(0)
    return <InsightsCarousel insights={insights} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex}/>
  }
  render(<Example/>)
  await user.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next insight' }))
  await user.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'Second insight' })).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe('Insight 2 of 2')
  expect(screen.queryByRole('heading', { name: 'First insight' })).toBeNull()
})

it('falls back to the first card when a parent selection no longer exists in the collection', () => {
  const view = render(<InsightsCarousel insights={insights} activeIndex={1} onActiveIndexChange={vi.fn()}/>)
  view.rerender(<InsightsCarousel insights={[insights[0]]} activeIndex={1} onActiveIndexChange={vi.fn()}/>)
  expect(screen.getByRole('heading', { name: 'First insight' })).toBeTruthy()
  expect(screen.getByRole('group', { name: '1 of 1' })).toBeTruthy()
})
