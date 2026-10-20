import { Heading } from '../../../components/ui'
import { ActionLink } from '../../../components/primitives/Controls'
import { pagePaths } from '../../../app/navigation'

export function PremiumFeaturesPage() {
  return <><Heading eyebrow="MORE WAYS TO BRING PEOPLE TOGETHER" title="Premium Features">Explore more possibilities for your account.</Heading><section className="panel"><h2>Coming soon</h2><p>Community ownership, pro hosting, and organizer features will be explained here, with options to subscribe and configure each feature.</p><ActionLink appearance="outline" className="button secondary" to={pagePaths['account-settings']}>Back to Settings</ActionLink></section></>
}
