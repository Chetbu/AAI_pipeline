import type { Opportunity, OpportunityStatus, TeamMember } from '../types'
import { OpportunityCard } from './OpportunityCard'

const COLUMNS: { id: OpportunityStatus; label: string; color: string }[] = [
  { id: 'in_crm', label: 'In CRM', color: '#6b7280' },
  { id: 'to_be_assigned', label: 'To be assigned', color: '#2563eb' },
  { id: 'assigned', label: 'Assigned', color: '#16a34a' },
  { id: 'completed', label: 'Completed', color: '#9333ea' },
]

interface Props {
  opportunities: Opportunity[]
  teamMembers: TeamMember[]
  currentUserEmail: string | null
  onUpdate: (updated: Opportunity) => void
}

export function KanbanBoard({ opportunities, teamMembers, currentUserEmail, onUpdate }: Props) {
  const byStatus = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as Opportunity[]]))
  for (const opp of opportunities) {
    const bucket = byStatus[opp.status]
    if (bucket) bucket.push(opp)
    else byStatus['in_crm'].push(opp)
  }

  return (
    <div className="kanban">
      {COLUMNS.map((col) => (
        <div key={col.id} className="kanban-col">
          <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
            <span style={{ color: col.color }}>{col.label}</span>
            <span className="kanban-count">{byStatus[col.id].length}</span>
          </div>
          <div className="kanban-cards">
            {byStatus[col.id].map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                teamMembers={teamMembers}
                currentUserEmail={currentUserEmail}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
