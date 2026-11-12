import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAuthSession } from 'aws-amplify/auth'
import { invokeAgent, newSession, readEventStream } from './agent'
import { config } from '../test/fixtures'
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: vi.fn() }))
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals() })
function stream(parts: string[]) { return new ReadableStream<Uint8Array>({ start(controller) { for (const part of parts) controller.enqueue(new TextEncoder().encode(part)); controller.close() } }) }
describe('FR5 streaming agent client', () => {
  it('decodes split SSE frames and emits each text delta once', async () => {
    const text = vi.fn(); await readEventStream(stream(['data: {"event":{"contentBlock', 'Delta":{"delta":{"text":"Hello"}}}}\n\n', ': ping\n\ndata: {"event":{"messageStop":{}}}\n\n']), text)
    expect(text.mock.calls).toEqual([['Hello']]); expect(newSession().length).toBeGreaterThanOrEqual(33)
  })
  it('uses Cognito JWT, encoded ARN, actor and explicit session', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: { accessToken: { toString: () => 'jwt' } } } as Awaited<ReturnType<typeof fetchAuthSession>>)
    const fetcher = vi.fn().mockResolvedValue(new Response(stream(['data: {"event":{"contentBlockDelta":{"delta":{"text":"Hi"}}}}\n\n']), { headers: { 'Content-Type': 'text/event-stream' } })); vi.stubGlobal('fetch', fetcher)
    const sessionId = newSession(); const onText = vi.fn()
    await invokeAgent(config, { prompt: 'Hi', actorId: 'user-sub', sessionId, signal: new AbortController().signal, onText })
    expect(fetcher.mock.calls[0][0]).toContain(encodeURIComponent(config.agentRuntimeArn)); expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt'); expect(onText).toHaveBeenCalledWith('Hi')
  })
  it('rejects malformed events', async () => { await expect(readEventStream(stream(['data: broken\n\n']), vi.fn())).rejects.toThrow('unreadable') })
  it('handles CRLF split between network chunks', async () => { const text = vi.fn(); await readEventStream(stream(['data: {"event":{"contentBlockDelta":{"delta":{"text":"Hi"}}}}\r', '\n\r', '\n']), text); expect(text).toHaveBeenCalledExactlyOnceWith('Hi') })
  it('rejects agent errors without resending', async () => { await expect(readEventStream(stream(['data: {"error":"failed"}\n\n']), vi.fn())).rejects.toThrow('may have been processed') })
})
