import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import AgentChat from './AgentChat'
import { invokeAgent } from '../lib/agent'
import { config } from '../test/fixtures'
vi.mock('../lib/agent', () => ({ newSession: () => crypto.randomUUID(), invokeAgent: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
function send(text = 'List employees') { fireEvent.change(screen.getByTestId('chat-prompt'), { target: { value: text } }); fireEvent.submit(screen.getByTestId('chat-form')) }
describe('FR5 safe streaming chat and NFR1/NFR3', () => {
  it('renders streamed text as inert content and scopes actor/session', async () => {
    vi.mocked(invokeAgent).mockImplementation(async (_, input) => { input.onText('<img src=x onerror=alert(1)>'); input.onText(' done') })
    const { container } = render(<AgentChat config={config} actorId="cognito-sub" onExpired={vi.fn()} />); send()
    await screen.findByText('<img src=x onerror=alert(1)> done'); expect(container.querySelector('img')).toBeNull(); expect(screen.getByText(/can change employee/)).toBeInTheDocument()
    expect(vi.mocked(invokeAgent).mock.calls[0][1].actorId).toBe('cognito-sub')
  })
  it('shows partial failures and releases controls without retrying', async () => { vi.mocked(invokeAgent).mockImplementation(async (_, input) => { input.onText('Partial'); throw new Error('Stream interrupted') }); render(<AgentChat config={config} actorId="sub" onExpired={vi.fn()} />); send(); expect(await screen.findByRole('alert')).toHaveTextContent('incomplete'); expect(screen.getByText('Partial')).toBeInTheDocument(); expect(invokeAgent).toHaveBeenCalledTimes(1); expect(screen.getByTestId('chat-prompt')).not.toBeDisabled() })
  it('aborts and ignores stale chunks after new conversation and unmount', async () => {
    let input!: Parameters<typeof invokeAgent>[1]; vi.mocked(invokeAgent).mockImplementation(async (_, next) => { input = next; await new Promise<void>((resolve) => next.signal.addEventListener('abort', () => resolve())) })
    const view = render(<AgentChat config={config} actorId="sub" onExpired={vi.fn()} />); send(); await waitFor(() => expect(invokeAgent).toHaveBeenCalled()); const oldSession = input.sessionId
    fireEvent.click(screen.getByTestId('chat-new')); expect(input.signal.aborted).toBe(true); act(() => input.onText('Stale secret')); expect(screen.queryByText('Stale secret')).not.toBeInTheDocument()
    send('New question'); await waitFor(() => expect(invokeAgent).toHaveBeenCalledTimes(2)); expect(input.sessionId).not.toBe(oldSession); view.unmount(); expect(input.signal.aborted).toBe(true)
  })
})
