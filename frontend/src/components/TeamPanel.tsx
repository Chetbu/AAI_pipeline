import { useState } from 'react'
import type { TeamMember } from '../types'
import { memberDisplayName } from '../types'
import { api } from '../api/client'

interface Props {
  members: TeamMember[]
  onChange: (members: TeamMember[]) => void
}

export function TeamPanel({ members, onChange }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!email.trim()) return
    setError(null)
    try {
      const member = await api.team.create(
        email.trim(),
        name.trim() || undefined,
        surname.trim() || undefined,
      )
      onChange(
        [...members, member].sort((a, b) =>
          memberDisplayName(a).localeCompare(memberDisplayName(b))
        )
      )
      setEmail('')
      setName('')
      setSurname('')
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
            <span>
              {memberDisplayName(m)}
              {(m.name || m.surname) && <span className="team-email"> ({m.email})</span>}
            </span>
            <button className="btn-danger-sm" onClick={() => handleDelete(m.id)}>✕</button>
          </li>
        ))}
      </ul>
      <div className="team-add">
        <input
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <input
          placeholder="First name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <input
          placeholder="Last name (optional)"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn-primary" onClick={handleAdd}>Add</button>
      </div>
      {error && <p className="dialog-error">{error}</p>}
    </div>
  )
}
