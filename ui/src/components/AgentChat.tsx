import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { PortalConfig } from '../config'
import { invokeAgent, newSession } from '../lib/agent'
import { messageFor, SessionExpiredError } from '../lib/api'

interface Message { role: 'user' | 'assistant'; text: string }
export default function AgentChat({ config, actorId, onExpired }: { config: PortalConfig; actorId: string; onExpired: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const session = useRef(newSession())
  const controller = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const locked = useRef(false)
  useEffect(() => () => { generation.current++; controller.current?.abort() }, [])
  function reset() { generation.current++; controller.current?.abort(); session.current = newSession(); locked.current = false; setMessages([]); setPending(false); setError(''); setPrompt('') }
  function stop() { controller.current?.abort(); setError('Response interrupted. Any partial answer is incomplete; actions may already have occurred. Check before sending again.') }
  async function submit(event: FormEvent) {
    event.preventDefault(); const text = prompt.trim(); if (!text || locked.current) return
    locked.current = true; setPending(true); setPrompt(''); setError('')
    setMessages((current) => [...current, { role: 'user', text }, { role: 'assistant', text: '' }])
    const request = new AbortController(); controller.current = request; const currentGeneration = generation.current
    let received = false
    try {
      await invokeAgent(config, { prompt: text, actorId, sessionId: session.current, signal: request.signal, onText: (delta) => {
        if (request.signal.aborted || currentGeneration !== generation.current) return
        received = true; setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, text: message.text + delta } : message))
      } })
      if (!received && !request.signal.aborted && currentGeneration === generation.current) setError('The assistant completed without text. Actions may have occurred; check records before sending again.')
    } catch (failure) {
      if (currentGeneration !== generation.current) return
      if (failure instanceof SessionExpiredError) { onExpired(); return }
      if (!request.signal.aborted) setError(`${messageFor(failure)} Any partial answer is incomplete. Check before sending again.`)
    } finally { if (currentGeneration === generation.current) { locked.current = false; setPending(false) } }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">A LITTLE HELP GOES A LONG WAY</p><h1>Meet your HR assistant.</h1><p>Ask, explore, and take care of everyday HR work.</p></div><button data-testid="chat-new" onClick={reset}>＋ New conversation</button></div>
    <p className="agent-notice"><strong>AI with the ability to act.</strong> The assistant can change employee and leave records and send HR email. Review its responses and verify important outcomes.</p>
    <section className="panel chat-panel" aria-label="HR assistant conversation">
      <div className="chat-heading"><span className="assistant-avatar" aria-hidden="true">✳</span><div><strong>hrAgent</strong><small><span className="status-dot" />Your HR workspace assistant</small></div></div>
      <div className="messages" role="log" aria-label="Conversation messages" aria-live="polite">
        {messages.length === 0 && <div className="chat-welcome"><span aria-hidden="true">✳</span><h2>What can I help you with today?</h2><p>Find an employee, explore leave records, or draft an email to HR.</p><div className="suggestions">{['List employees', 'Help me draft a leave email'].map((idea) => <button data-testid="chat-suggestion" key={idea} onClick={() => setPrompt(idea)}>{idea} ↗</button>)}</div></div>}
        {messages.map((message, index) => <div className={`message ${message.role}`} key={index}><strong>{message.role === 'user' ? 'You' : 'hrAgent'}</strong><p>{message.text || (pending ? 'Thinking…' : 'No text response.')}</p></div>)}
      </div>
      {error && <p className="alert error" role="alert">{error}</p>}
      <form className="composer" data-testid="chat-form" onSubmit={submit}><label className="sr-only" htmlFor="chat-prompt">Message to HR assistant</label><textarea id="chat-prompt" data-testid="chat-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={10000} rows={2} placeholder="Ask your HR assistant…" required disabled={pending} /><div><span>Keep sensitive details relevant to the task.</span>{pending ? <button type="button" data-testid="chat-stop" onClick={stop}>Stop response</button> : <button className="primary" data-testid="chat-send" disabled={!prompt.trim()}>Send ↗</button>}</div></form>
    </section>
  </>
}
