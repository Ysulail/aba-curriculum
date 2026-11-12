import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { PortalApi } from '../lib/api'
import { messageFor } from '../lib/api'

export default function HrRequests({ api }: { api: PortalApi }) {
  const [kind, setKind] = useState<'time-off' | 'general'>('time-off')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const controller = useRef<AbortController | null>(null)
  const locked = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return
    const fields = new FormData(event.currentTarget)
    const user_id = String(fields.get('user_id')).trim()
    const start_date = String(fields.get('start_date') || ''); const end_date = String(fields.get('end_date') || '')
    const prompt = String(fields.get('prompt') || '').trim()
    if (!user_id || (kind === 'time-off' ? !start_date || !end_date || end_date < start_date : !prompt)) { setError('Complete the required fields; end date must be on or after start date.'); return }
    locked.current = true; setPending(true); setError(''); setReference('')
    const request = new AbortController(); controller.current = request
    try {
      const result = kind === 'time-off' ? await api.timeOff({ user_id, start_date, end_date }, request.signal) : await api.general({ user_id, prompt }, request.signal)
      if (!request.signal.aborted) setReference(result.executionArn)
    } catch (failure) { if (!request.signal.aborted) setError(messageFor(failure)) } finally { locked.current = false; if (!request.signal.aborted) setPending(false) }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p><h1>A simpler way to reach HR.</h1><p>Submit time off or send a question to the HR team.</p></div></div>
    <div className="request-layout"><section className="panel"><div className="tabs" aria-label="Request type">{(['time-off', 'general'] as const).map((type) => <button key={type} type="button" data-testid={`request-${type}`} aria-pressed={kind === type} disabled={pending} onClick={() => { setKind(type); setError(''); setReference('') }}>{type === 'time-off' ? 'Time off' : 'General HR request'}</button>)}</div>
      <h2>{kind === 'time-off' ? 'Plan a little time away.' : 'How can HR help?'}</h2>
      <form key={kind} data-testid="hr-request-form" className="form-grid" onSubmit={submit}>
        <label className="full">Employee / user ID<input data-testid="request-user-id" name="user_id" required maxLength={200} /><small>Enter the person this request concerns.</small></label>
        {kind === 'time-off' ? <><label>Start date<input data-testid="request-start-date" type="date" name="start_date" required /></label><label>End date<input data-testid="request-end-date" type="date" name="end_date" required /></label></> : <label className="full">Your question<textarea data-testid="request-prompt" name="prompt" required rows={6} maxLength={5000} placeholder="Tell the HR team what you need help with…" /></label>}
        <div className="form-actions"><button data-testid="request-submit" className="primary" disabled={pending}>{pending ? 'Submitting…' : 'Submit request ↗'}</button></div>
      </form>
      {error && <p role="alert" className="alert error">{error}</p>}
      {reference && <div role="status" className="alert success"><strong>Request submitted</strong><p>Accepted for processing. This is not leave approval or confirmation of email delivery.</p><span className="reference">Reference: {reference}</span></div>}
    </section><aside className="request-note"><span className="note-symbol" aria-hidden="true">↗</span><p className="eyebrow">A NOTE BEFORE YOU SEND</p><h2>Submitted. Then in good hands.</h2><p>Your request starts the HR notification workflow. Keep the reference for follow-up with your HR team.</p><p>This portal does not track approval or processing status.</p></aside></div>
  </>
}
