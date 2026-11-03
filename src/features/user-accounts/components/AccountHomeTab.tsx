import { pagePaths } from '../../../app/navigation'
import { HomeWelcomePanel } from './HomeWelcomePanel'
import { HomeFeedPlaceholderCard } from './HomeFeedPlaceholderCard'
import styles from './AccountHomeTab.module.css'

// Static interface copy, not simulated feed records or an API response.
const feedPlaceholders = [
  {
    id: 'community-updates',
    iconName: 'chat',
    title: 'From your communities',
    description:
      'The latest announcements and discussion posts from the communities you belong to.',
    placeholderHeading: 'A little news from every table.',
    placeholderDescription: 'Your community updates will come together here.',
  },
  {
    id: 'upcoming-games',
    iconName: 'calendar',
    title: 'Your next games',
    description: 'One place for the events you’ve RSVP’d to, across your communities.',
    placeholderHeading: 'Something to look forward to.',
    placeholderDescription: 'Your upcoming RSVPs will appear here when your event calendar is connected.',
  },
  {
    id: 'suggested-games',
    iconName: 'dice',
    title: 'You might enjoy',
    description: 'Events that fit your interests and the games you’ve enjoyed before.',
    placeholderHeading: 'Make room for a new favorite.',
    placeholderDescription: 'Suggestions based on your interests and play history are coming soon.',
  },
]

export function AccountHomeTab() {
  return (
    <div className={styles.page}>
      <HomeWelcomePanel communitiesTo={pagePaths['my-communities']}/>
      <div className={styles.sections}>
        {feedPlaceholders.map(({ id, ...placeholder }) => (
          <HomeFeedPlaceholderCard key={id} {...placeholder}/>
        ))}
      </div>
    </div>
  )
}
