const API_BASE = 'http://localhost:8000'

export type Role = 'student' | 'faculty' | 'admin'

export interface Session {
  token: string
  role: Role
  role_label: string
  name: string
}

export interface SignupPayload {
  name: string
  email: string
  mobile: string
  password: string
  role: Role
}

async function request<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running on port 8000.')
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.detail) detail = data.detail
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: (username: string, password: string) =>
    request<Session>('/api/login', { username, password }),

  signup: (payload: SignupPayload) => request<Session>('/api/signup', payload),
}