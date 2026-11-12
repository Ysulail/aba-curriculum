import { Amplify } from 'aws-amplify'
import type { PortalConfig } from './config'

export function configureAuth(config: PortalConfig) {
  Amplify.configure({ Auth: { Cognito: {
    userPoolId: config.userPoolId,
    userPoolClientId: config.userPoolClientId,
  } } })
}
