import { useState, useEffect } from 'react'
import type { Opportunity, OpportunityStatus, TeamMember, Comment } from '../types'
import { api } from '../api/client'

const STATUSES: { id: OpportunityStatus; label: string }[] = [
  { id: 'in_crm', label: 'In CRM' },
  { id: 'to_be_assigned', label: 'To be assigned' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'completed', label: 'Completed' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface Props {
  opportunity: Opportunity
  teamMembers: TeamMember[]
  onSave: (updated: Opportunity) => void
  onClose: () => void
}

export function AssignDialog({ opportunity, teamMembers, onSave, onClose }: Props) {
  const [status, setStatus] = useState<OpportunityStatus>(opportunity.status)
  const [coveredBy, setCoveredBy] = useState(opportunity.covered_by ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentAuthor, setCommentAuthor] = useState(teamMembers[0]?.name ?? '')
  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  useEffect(() => {
    api.comments.list(opportunity.id).then(setComments).catch(() => {})
  }, [opportunity.id])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.opportunities.patch(opportunity.id, {
        status,
        covered_by: coveredBy || null,
      })
      onSave(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handlePostComment() {
    if (!commentAuthor || !commentBody.trim()) return
    setPosting(true)
    setCommentError(null)
    try {
      const newComment = await api.comments.add(opportunity.id, {
        author: commentAuthor,
        body: commentBody.trim(),
      })
      setComments((prev) => [...prev, newComment])
      setCommentBody('')
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : String(e))
    } finally {
      setPosting(false)
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

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <hr />

        <div className="comments-section">
          <h3 className="comments-title">Discussion</h3>

          {comments.length === 0 ? (
            <p className="comments-empty">No comments yet.</p>
          ) : (
            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment">
                  <div className="comment-meta">
                    <span className="comment-author">{c.author}</span>
                    <span className="comment-date">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="comment-body">{c.body}</p>
                </div>
              ))}
            </div>
          )}

          <div className="comment-form">
            <select
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              disabled={posting}
            >
              <option value="">— select author —</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              disabled={posting}
            />
            {commentError && <p className="dialog-error">{commentError}</p>}
            <button
              className="btn-primary"
              onClick={handlePostComment}
              disabled={posting || !commentAuthor || !commentBody.trim()}
            >
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
