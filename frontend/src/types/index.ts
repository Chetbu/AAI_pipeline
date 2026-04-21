export type OpportunityStatus =
  | 'in_crm'
  | 'to_be_assigned'
  | 'assigned'
  | 'completed'

export interface Opportunity {
  id: string
  name: string
  description: string | null
  customer: string | null
  region: string | null
  account_manager: string | null
  link: string | null
  gttl_current: string | null
  gttl_next: string | null
  ai_summary: string | null
  ai_reason: string | null
  ai_tags: string | null
  status: OpportunityStatus
  covered_by: string | null
  first_seen_date: string | null
  last_seen_date: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Comment {
  id: number
  opportunity_id: string
  author: string
  body: string
  created_at: string
}

export interface IngestLog {
  id: number
  filename: string
  file_date: string | null
  uploaded_at: string
  records_inserted: number
  records_updated: number
}

export interface TeamMember {
  id: number
  email: string
  name: string | null
  surname: string | null
}

/** Returns "First Last" if set, otherwise the email. */
export function memberDisplayName(m: TeamMember): string {
  return [m.name, m.surname].filter(Boolean).join(' ') || m.email
}
