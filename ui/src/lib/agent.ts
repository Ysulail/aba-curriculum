import type { PortalConfig } from '../config'
import { getAccessToken, SessionExpiredError } from './api'

export function newSession(): string { return crypto.randomUUID() }

function eventText(data: string): string {
  if (data === '[DONE]') return ''
  let value: unknown
  try { value = JSON.parse(data) } catch { throw new Error('The assistant returned an unreadable stream event.') }
  if (!value || typeof value !== 'object') throw new Error('The assistant returned an invalid stream event.')
  const payload = value as { event?: { contentBlockDelta?: { delta?: { text?: unknown } } }; error?: unknown }
  if (payload.error) throw new Error('The assistant reported an error. Your request may have been processed; check before sending again.')
  const text = payload.event?.contentBlockDelta?.delta?.text
  return typeof text === 'string' ? text : ''
}

export async function readEventStream(body: ReadableStream<Uint8Array>, onText: (text: string) => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const consume = (frame: string) => {
    const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, '')).join('\n')
    if (data) { const text = eventText(data); if (text) onText(text) }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      buffer = buffer.replace(/\r\n/g, '\n')
      let end: number
      while ((end = buffer.indexOf('\n\n')) >= 0) { consume(buffer.slice(0, end)); buffer = buffer.slice(end + 2) }
      if (done) break
    }
    if (buffer.trim()) consume(buffer)
  } finally { reader.releaseLock() }
}

export async function invokeAgent(config: PortalConfig, input: { prompt: string; actorId: string; sessionId: string; signal: AbortSignal; onText: (text: string) => void }) {
  const token = await getAccessToken()
  const url = `https://bedrock-agentcore.${config.region}.amazonaws.com/runtimes/${encodeURIComponent(config.agentRuntimeArn)}/invocations?qualifier=DEFAULT`
  const response = await fetch(url, {
    method: 'POST', signal: input.signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream', 'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': input.sessionId },
    body: JSON.stringify({ prompt: input.prompt, actorId: input.actorId }),
  })
  if (response.status === 401 || response.status === 403) throw new SessionExpiredError('Assistant access denied or session expired. Sign in again.')
  if (!response.ok) throw new Error(`Assistant request failed (${response.status}). It may have been processed; check before sending again.`)
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('The assistant did not return an event stream.')
  await readEventStream(response.body, input.onText)
}
