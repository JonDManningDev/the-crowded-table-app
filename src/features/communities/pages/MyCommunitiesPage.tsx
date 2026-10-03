import { Icon } from '../../../components/ui'
import styles from './MyCommunitiesPage.module.css'

export function MyCommunitiesPage({ previewName, previewLocation }: { previewName: string; previewLocation: string }) {
  return <div className={styles.page}><header><span className="eyebrow">MORE PLACES TO BELONG</span><h1>My Communities</h1><p>A home for the communities you belong to and the ones you manage.</p></header>
    <section className={styles.placeholder}><span className={styles.badge}>Coming soon</span><h2>Your people, around more tables.</h2><p>Your full community list is on its way. For now, explore the sample community below. It is a preview, not a community you’ve joined.</p><p>Already created a community? The account bar’s <strong>Your communities</strong> list still shows the communities you own.</p></section>
    <section className={styles.preview} aria-labelledby="sample-community"><div><span className="eyebrow">SAMPLE COMMUNITY</span><h2 id="sample-community">{previewName}</h2><p><Icon name="pin" size={15}/>{previewLocation}</p></div><a className="button" href="#community-home">Explore community <Icon name="arrow" size={18}/></a></section>
  </div>
}
