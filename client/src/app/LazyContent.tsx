import { Component, Suspense, type ReactNode } from 'react'
import { Button } from '../components/primitives/Controls'

class ContentErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean; resetKey?: string }> {
  state = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromProps(props: { resetKey?: string }, state: { resetKey?: string }) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return <section role="alert">
      <h2>This content couldn’t be loaded.</h2>
      <p>Please reload to try again. Unsaved changes will be lost.</p>
      <Button appearance="outline" onClick={() => window.location.reload()}>Reload page</Button>
    </section>
    return this.props.children
  }
}

export function LazyContent({ children, resetKey }: { children: ReactNode; resetKey?: string }) {
  return <ContentErrorBoundary resetKey={resetKey}><Suspense fallback={<p role="status">Loading content…</p>}>
    {children}
  </Suspense></ContentErrorBoundary>
}
