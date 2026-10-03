import { Icon } from '../../../components/ui'
import styles from './MyHomePage.module.css'

const sections = [
  { icon: 'chat', title: 'From your communities', description: 'The latest announcements and discussion posts from the communities you belong to.', empty: 'A little news from every table.', detail: 'Your community updates will come together here.' },
  { icon: 'calendar', title: 'Your next games', description: 'One place for the events you’ve RSVP’d to, across your communities.', empty: 'Something to look forward to.', detail: 'Your upcoming RSVPs will appear here when your event calendar is connected.' },
  { icon: 'dice', title: 'You might enjoy', description: 'Events that fit your interests and the games you’ve enjoyed before.', empty: 'Make room for a new favorite.', detail: 'Suggestions based on your interests and play history are coming soon.' },
]

export function MyHomePage() {
  return <div className={styles.page}>
    <header className={styles.heading}><span className="eyebrow">YOUR SPACE AT THE CROWDED TABLE</span><h1>My Home</h1><p>Different communities. More people to play with.<br/>A place to bring it all together.</p></header>
    <section className={styles.welcome} aria-labelledby="welcome-title"><div><span className={styles.label}>WELCOME HOME</span><h2 id="welcome-title">All your tables,<br/><em>in one place.</em></h2><p>Your personal feed is taking shape. Soon, you’ll find updates from your communities, your next games, and a little inspiration for what to play next.</p><a className="button" href="#my-communities">My Communities <Icon name="arrow" size={18}/></a></div><div className={styles.illustration} aria-hidden="true"><Icon name="people" size={76}/><span>Games · People · Belonging</span></div></section>
    <div className={styles.sections}>{sections.map(section => <section className={styles.section} key={section.title}><div className={styles.sectionTitle}><span className={styles.icon}><Icon name={section.icon} size={22}/></span><span className={styles.soon}>Coming soon</span></div><h2>{section.title}</h2><p>{section.description}</p><div className={styles.placeholder}><h3>{section.empty}</h3><p>{section.detail}</p></div></section>)}</div>
    <p className={styles.note}>These sections are coming soon. No community updates, RSVPs, or suggestions are loaded yet.</p>
  </div>
}
