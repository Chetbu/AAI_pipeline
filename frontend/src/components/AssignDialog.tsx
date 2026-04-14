import { useState } from 'react'
import type { Opportunity, OpportunityStatus, TeamMember } from '../types'
import { api } from '../api/client'

const STATUSES: { id: OpportunityStatus; label: string }[] = [
  { id: 'in_crm', label: 'In CRM' },
  { id: 'to_be_assigned', label: 'To be assigned' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'completed', label: 'Completed' },
]

interface Props {
  opportunity: Opportunity
  teamMembers: TeamMember[]
  onSave: (updated: Opportunity) => void
  onClose: () => void
}

export function AssignDialog({ opportunity, teamMembers, onSave, onClose }: Props) {
  const [status, setStatus] = useState<OpportunityStatus>(opportunity.status)
  const [coveredBy, setCoveredBy] = useState(opportunity.covered_by ?? '')
  const [notes, setNotes] = useState(opportunity.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.opportunities.patch(opportunity.id, {
        status,
        covered_by: coveredBy || null,
        notes: notes || null,
      })
      onSave(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{opportunity.name}</h2>

        {opportunity.customer && (
          <p className="dialog-customer">{opportunity.customer} · {opportunity.region}</p>
        )}

        {opportunity.ai_summary && (
          <div className="dialog-summary">
            <strong>AI Summary:</strong> {opportunity.ai_summary}
          </div>
        )}

        {opportunity.description && (
          <details className="dialog-desc">
            <summary>Description</summary>
            <p>{opportunity.description}</p>
          </details>
        )}

        {opportunity.link && (
          <a href={opportunity.link} target="_blank" rel="noreferrer" className="dialog-link">
            Open in CRM ↗
          </a>
        )}

        <hr />

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as OpportunityStatus)}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>

        <label>
          Covered by
          <select value={coveredBy} onChange={(e) => setCoveredBy(e.target.value)}>
            <option value="">— unassigned —</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </label>

        <label>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes…"
          />
        </label>

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
