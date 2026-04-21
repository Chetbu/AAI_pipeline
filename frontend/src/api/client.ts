import type { Opportunity, OpportunityStatus, TeamMember, IngestLog, Comment } from '../types'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  opportunities: {
    list: (params?: { status?: string; region?: string; covered_by?: string; customer?: string }) => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.region) qs.set('region', params.region)
      if (params?.covered_by) qs.set('covered_by', params.covered_by)
      if (params?.customer) qs.set('customer', params.customer)
      const query = qs.toString()
      return req<Opportunity[]>(`/api/opportunities${query ? `?${query}` : ''}`)
    },
    get: (id: string) => req<Opportunity>(`/api/opportunities/${id}`),
    patch: (id: string, data: { status?: OpportunityStatus; covered_by?: string | null }) =>
      req<Opportunity>(`/api/opportunities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  comments: {
    list: (opportunityId: string) =>
      req<Comment[]>(`/api/opportunities/${opportunityId}/comments`),
    add: (opportunityId: string, data: { author: string; body: string }) =>
      req<Comment>(`/api/opportunities/${opportunityId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  team: {
    list: () => req<TeamMember[]>('/api/team'),
    create: (email: string, name?: string, surname?: string) =>
      req<TeamMember>('/api/team', {
        method: 'POST',
        body: JSON.stringify({ email, name, surname }),
      }),
    delete: (id: number) => req<void>(`/api/team/${id}`, { method: 'DELETE' }),
  },
  me: () => req<{ email: string; team_member: TeamMember }>('/api/me'),
  ingest: {
    history: () => req<IngestLog[]>('/api/ingest/history'),
    upload: async (file: File): Promise<{ inserted: number; updated: number; file: string }> => {
      const form = new FormData()
      form.append('file', file)
      // Do NOT use req() here — browser must set Content-Type with multipart boundary
      const res = await fetch('/api/ingest', { method: 'POST', body: form })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} ${res.statusText}: ${text}`)
      }
      return res.json()
    },
  },
}
