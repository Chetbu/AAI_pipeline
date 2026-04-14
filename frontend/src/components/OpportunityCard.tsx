import { useState } from 'react'
import type { Opportunity, TeamMember } from '../types'
import { AssignDialog } from './AssignDialog'

interface Props {
  opportunity: Opportunity
  teamMembers: TeamMember[]
  onUpdate: (updated: Opportunity) => void
}

export function OpportunityCard({ opportunity, teamMembers, onUpdate }: Props) {
  const [showDialog, setShowDialog] = useState(false)

  const gttl = opportunity.gttl_current || opportunity.gttl_next
  const tags = opportunity.ai_tags
    ? opportunity.ai_tags.replace(/[\[\]]/g, '').split(/\s+/).filter(Boolean)
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
          onSave={onUpdate}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  )
}
