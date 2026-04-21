import { useState } from 'react'
import type { Opportunity, TeamMember } from '../types'
import { AssignDialog } from './AssignDialog'

interface Props {
  opportunity: Opportunity
  teamMembers: TeamMember[]
  currentUserEmail: string | null
  onUpdate: (updated: Opportunity) => void
}

export function OpportunityCard({ opportunity, teamMembers, currentUserEmail, onUpdate }: Props) {
  const [showDialog, setShowDialog] = useState(false)

  const rawGttl = opportunity.gttl_current || opportunity.gttl_next
  const gttl = (() => {
    const currency = (rawGttl ?? '').match(/^[^0-9]*/)?.[0] ?? ''
    const n = parseFloat((rawGttl ?? '').replace(/[^0-9.]/g, ''))
    if (isNaN(n)) return rawGttl
    const actual = n * 1000
    if (actual >= 1_000_000) return `${currency}${(actual / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    if (actual >= 1_000) return `${currency}${(actual / 1_000).toFixed(0)}K`
    return `${currency}${actual}`
  })()
  const tags = opportunity.ai_tags
    ? opportunity.ai_tags.includes('[')
      ? [...opportunity.ai_tags.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim()).filter(Boolean)
      : opportunity.ai_tags.split(',').map(t => t.trim()).filter(Boolean)
    : []

  return (
    <>
      <div
        className="opp-card"
        onClick={() => setShowDialog(true)}
        title={opportunity.description ?? undefined}
      >
        <div className="opp-name">{opportunity.name}</div>
        <div className="opp-meta">
          <span className="opp-customer">{opportunity.customer}</span>
          {gttl && <span className="opp-gttl">{gttl}</span>}
        </div>
        {opportunity.region && (
          <div className="opp-region">{opportunity.region}</div>
        )}
        {tags.length > 0 && (
          <div className="opp-tags">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
        {opportunity.covered_by && (
          <div className="opp-covered-by">👤 {opportunity.covered_by}</div>
        )}
      </div>

      {showDialog && (
        <AssignDialog
          opportunity={opportunity}
          teamMembers={teamMembers}
          currentUserEmail={currentUserEmail}
          onSave={onUpdate}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  )
}
