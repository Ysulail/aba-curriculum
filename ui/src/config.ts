export interface PortalConfig {
  region: string
  userPoolId: string
  userPoolClientId: string
  apiUrl: string
  agentRuntimeArn: string
}

export function validateConfig(value: unknown): PortalConfig {
  if (!value || typeof value !== 'object') throw new Error('Missing portal configuration.')
  const data = value as Record<string, unknown>
  const fields = ['region', 'userPoolId', 'userPoolClientId', 'apiUrl', 'agentRuntimeArn'] as const
  const missing = fields.filter((key) => typeof data[key] !== 'string' || !String(data[key]).trim())
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}.`)
  const config = data as unknown as PortalConfig
  if (!/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(config.region)) throw new Error('Invalid AWS region.')
  if (new URL(config.apiUrl).protocol !== 'https:') throw new Error('apiUrl must use HTTPS.')
  if (!config.userPoolId.startsWith(`${config.region}_`)) throw new Error('Cognito pool must match the configured region.')
  if (!config.agentRuntimeArn.startsWith(`arn:aws:bedrock-agentcore:${config.region}:`)) throw new Error('AgentCore runtime must match the configured region.')
  return { ...config, apiUrl: config.apiUrl.replace(/\/+$/, '') }
}

export async function loadConfig(): Promise<PortalConfig> {
  return validateConfig({
    region: import.meta.env.VITE_AWS_REGION,
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
    apiUrl: import.meta.env.VITE_API_BASE_URL,
    agentRuntimeArn: import.meta.env.VITE_AGENT_RUNTIME_ARN,
  })
}
