import { describe, expect, it, vi, afterEach } from 'vitest'
import { loadConfig, validateConfig } from './config'
import { config } from './test/fixtures'
afterEach(() => vi.unstubAllGlobals())
describe('FR6 public runtime configuration', () => {
  it('accepts environment settings and normalizes the API URL', () => expect(validateConfig({ ...config, apiUrl: `${config.apiUrl}/` })).toEqual(config))
  it('names missing fields', () => expect(() => validateConfig({})).toThrow('userPoolId'))
  it('rejects insecure APIs and mismatched regions', () => {
    expect(() => validateConfig({ ...config, apiUrl: 'http://example.com' })).toThrow('HTTPS')
    expect(() => validateConfig({ ...config, region: 'eu-west-1' })).toThrow('match')
  })
  it('reports missing environment configuration', async () => {
    vi.stubEnv('VITE_AWS_REGION', '')
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', '')
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '')
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_AGENT_RUNTIME_ARN', '')

    await expect(loadConfig()).rejects.toThrow('Missing configuration')
    vi.unstubAllEnvs()
  })
})
