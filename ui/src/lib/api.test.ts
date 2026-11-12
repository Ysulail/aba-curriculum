import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAuthSession } from 'aws-amplify/auth'
import { createApi } from './api'
import { config, employee } from '../test/fixtures'
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: vi.fn() }))
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals() })
function authenticate() { vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: { idToken: { toString: () => 'id-token' } } } as Awaited<ReturnType<typeof fetchAuthSession>>) }
describe('FR2–FR4 authenticated REST client', () => {
  it('lists filtered employees with the ID token and reads details', async () => {
    authenticate(); const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ employees: [employee] })))
    vi.stubGlobal('fetch', fetcher)
    expect(await createApi(config).list({ from: '2026-01-01', to: '2026-12-31' })).toEqual({ employees: [employee] })
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('hiredFrom=2026-01-01'), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'id-token' }) }))
  })
  it('posts exact employee and request contracts without retries', async () => {
    authenticate(); const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ executionArn: 'arn:execution' }), { status: 202 })); vi.stubGlobal('fetch', fetcher)
    expect(await createApi(config).timeOff({ user_id: 'abc', start_date: '2026-12-01', end_date: '2026-12-02' })).toEqual({ executionArn: 'arn:execution' })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][1].body).toContain('start_date')
  })
  it('reports not found', async () => { authenticate(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 }))); await expect(createApi(config).detail('missing')).rejects.toThrow('not found') })
  it('clears expired sessions and reports network errors', async () => {
    authenticate(); const expired = vi.fn(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))
    await expect(createApi(config, expired).list()).rejects.toThrow('expired'); expect(expired).toHaveBeenCalled()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(createApi(config).general({ user_id: 'a', prompt: 'benefits' })).rejects.toThrow('connection')
  })
})
