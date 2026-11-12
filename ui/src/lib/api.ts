import { fetchAuthSession } from 'aws-amplify/auth'
import type { PortalConfig } from '../config'

export interface Employee { employeeId: string; name: string; department: string; startDate: string; role: string }
export type NewEmployee = Omit<Employee, 'employeeId'>
export interface Submission { executionArn: string }
export class SessionExpiredError extends Error {}

export async function getIdToken(): Promise<string> {
  const session = await fetchAuthSession()
  const token = session.tokens?.idToken?.toString()
  if (!token) throw new SessionExpiredError('Your session expired. Sign in again.')
  return token
}

export async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()
  if (!token) throw new SessionExpiredError('Your session expired. Sign in again.')
  return token
}

export function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function createApi(config: PortalConfig, onExpired: () => void = () => {}) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let token: string
    try { token = await getIdToken() } catch (error) { onExpired(); throw error }
    let response: Response
    try {
      response = await fetch(`${config.apiUrl}${path}`, {
        ...options, headers: { Authorization: token, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new Error('Cannot reach the HR service. Check your connection and try again.')
    }
    if (response.status === 401 || response.status === 403) {
      onExpired()
      throw new SessionExpiredError('Access denied or session expired. Sign in again.')
    }
    if (!response.ok) throw new Error(response.status === 404 ? 'Employee not found.' : `HR service rejected the request (${response.status}). Please check your input and try again.`)
    try { return await response.json() as T } catch { throw new Error('The HR service returned an unreadable response.') }
  }
  return {
    list: (range?: { from: string; to: string }, signal?: AbortSignal) => request<{ employees: Employee[] }>(`/employees${range ? `?${new URLSearchParams({ hiredFrom: range.from, hiredTo: range.to })}` : ''}`, { signal }),
    detail: (id: string, signal?: AbortSignal) => request<Employee>(`/employees/${encodeURIComponent(id)}`, { signal }),
    create: (employee: NewEmployee, signal?: AbortSignal) => request<Employee>('/employees', { method: 'POST', body: JSON.stringify(employee), signal }),
    timeOff: (input: { user_id: string; start_date: string; end_date: string }, signal?: AbortSignal) => request<Submission>('/hr-requests/time-off', { method: 'POST', body: JSON.stringify(input), signal }),
    general: (input: { user_id: string; prompt: string }, signal?: AbortSignal) => request<Submission>('/hr-requests', { method: 'POST', body: JSON.stringify(input), signal }),
  }
}
export type PortalApi = ReturnType<typeof createApi>
