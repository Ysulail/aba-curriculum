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
  it('loads configuration from environment variables', async () => {
    await expect(loadConfig()).resolves.toEqual(
      validateConfig({
        region: import.meta.env.VITE_AWS_REGION,
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
        apiUrl: import.meta.env.VITE_API_BASE_URL,
        agentRuntimeArn: import.meta.env.VITE_AGENT_RUNTIME_ARN,
      })
    )
  })
})
