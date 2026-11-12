import { useCallback, useMemo, useState } from 'react'
import { Authenticator } from '@aws-amplify/ui-react'
import { signOut as amplifySignOut } from 'aws-amplify/auth'
import type { PortalConfig } from './config'
import { createApi } from './lib/api'
import Employees from './components/Employees'
import HrRequests from './components/HrRequests'
import AgentChat from './components/AgentChat'
import './App.css'

type Section = 'employees' | 'requests' | 'assistant'
const sections: { id: Section; title: string; mark: string }[] = [
  { id: 'employees', title: 'People', mark: '01' },
  { id: 'requests', title: 'HR requests', mark: '02' },
  { id: 'assistant', title: 'AI assistant', mark: '03' },
]
function Portal({ config, actorId, email, onSignOut }: { config: PortalConfig; actorId: string; email: string; onSignOut: () => void }) {
  const [section, setSection] = useState<Section>('employees')
  const [expired, setExpired] = useState(false)
  const expire = useCallback(() => { setExpired(true); void amplifySignOut().catch(() => {}) }, [])
  const api = useMemo(() => createApi(config, expire), [config, expire])
  if (expired) return <main className="setup-error"><h1>Session ended</h1><p role="alert">Sign in again to continue. Your displayed HR data has been cleared.</p><button data-testid="session-reload" onClick={() => window.location.reload()}>Sign in again</button></main>
  return <div className="portal">
    <a className="skip-link" href="#main-content" data-testid="skip-content">Skip to content</a>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">h.</span><div>People &amp; Culture<small>HR WORKSPACE</small></div></div>
      <div className="nav-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{sections.map((item) => <button key={item.id} data-testid={`nav-${item.id}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => setSection(item.id)}><span>{item.mark}</span>{item.title}{section === item.id && <b aria-hidden="true">↗</b>}</button>)}</nav>
      <div className="sidebar-note"><span className="status-dot" />Connected workspace<p>People, requests, and a little help from AI. All in one place.</p></div>
      <div className="profile"><div className="avatar">{email.slice(0, 1).toUpperCase()}</div><div><strong>HR team</strong><small>{email}</small></div><button aria-label="Sign out" title="Sign out" data-testid="sign-out" onClick={onSignOut}>↪</button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span>WORKSPACE <span className="crumb">/ {sections.find((item) => item.id === section)?.title}</span></span><span className="staff-badge"><span className="status-dot" />HR staff access</span></header>
      <main id="main-content" tabIndex={-1}>
        {section === 'employees' && <Employees api={api} />}
        {section === 'requests' && <HrRequests api={api} />}
        {section === 'assistant' && <AgentChat config={config} actorId={actorId} onExpired={expire} />}
      </main>
      <footer>HR Leave Portal <span>Built around your people.</span></footer>
    </div>
  </div>
}
export default function App({ config }: { config: PortalConfig }) {
  return <div className="auth-root"><Authenticator hideSignUp loginMechanisms={['email']}>
    {({ signOut, user }) => user ? <Portal key={user.userId} config={config} actorId={user.userId} email={user.signInDetails?.loginId || user.username} onSignOut={() => signOut?.()} /> : <p role="status">Loading your workspace…</p>}
  </Authenticator></div>
}
