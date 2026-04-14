import { useState } from 'react'
import type { TeamMember } from '../types'
import { api } from '../api/client'

interface Props {
  members: TeamMember[]
  onChange: (members: TeamMember[]) => void
}

export function TeamPanel({ members, onChange }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!name.trim()) return
    setError(null)
    try {
      const member = await api.team.create(name.trim(), email.trim() || undefined)
      onChange([...members, member].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setEmail('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.team.delete(id)
      onChange(members.filter((m) => m.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="team-panel">
      <h3>Team Members</h3>
      <ul className="team-list">
        {members.map((m) => (
          <li key={m.id}>
            <span>{m.name}{m.email ? ` (${m.email})` : ''}</span>
            <button className="btn-danger-sm" onClick={() => handleDelete(m.id)}>✕</button>
          </li>
        ))}
      </ul>
      <div className="team-add">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <input
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn-primary" onClick={handleAdd}>Add</button>
      </div>
      {error && <p className="dialog-error">{error}</p>}
    </div>
  )
}
