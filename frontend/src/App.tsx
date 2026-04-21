import { useEffect, useRef, useState } from 'react'
import type { Opportunity, TeamMember, IngestLog } from './types'
import { api } from './api/client'
import { KanbanBoard } from './components/KanbanBoard'
import { TeamPanel } from './components/TeamPanel'
import { IngestHistory } from './components/IngestHistory'
import './App.css'

export default function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [ingestLogs, setIngestLogs] = useState<IngestLog[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTeam, setShowTeam] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [ingestStatus, setIngestStatus] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [opps, team, logs, meRes] = await Promise.all([
        api.opportunities.list(),
        api.team.list(),
        api.ingest.history(),
        api.me(),
      ])
      setOpportunities(opps)
      setIngestLogs(logs)
      setCurrentUserEmail(meRes.email)
      // Merge auto-created member in case it was just added by /api/me
      const memberInList = team.some((m) => m.id === meRes.team_member.id)
      setTeamMembers(memberInList ? team : [...team, meRes.team_member])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleUpdate(updated: Opportunity) {
    setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setIngestStatus(`Uploading ${file.name}…`)
    try {
      const result = await api.ingest.upload(file)
      setIngestStatus(`Done: +${result.inserted} new, ${result.updated} updated`)
      await load()
    } catch (e) {
      setIngestStatus(`Error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const filtered = filter
    ? opportunities.filter(
        (o) =>
          o.name.toLowerCase().includes(filter.toLowerCase()) ||
          (o.customer ?? '').toLowerCase().includes(filter.toLowerCase()) ||
          (o.region ?? '').toLowerCase().includes(filter.toLowerCase()),
      )
    : opportunities

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>AAI Pipeline</h1>
          <span className="header-count">{opportunities.length} opportunities</span>
        </div>
        <div className="header-actions">
          <input
            className="search-input"
            placeholder="Filter by name, customer, region…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button onClick={() => { setShowTeam(!showTeam); setShowHistory(false) }}>
            {showTeam ? 'Hide Team' : 'Team'}
          </button>
          <button onClick={() => { setShowHistory(!showHistory); setShowTeam(false) }}>
            {showHistory ? 'Hide History' : `History${ingestLogs.length ? ` (${ingestLogs.length})` : ''}`}
          </button>
          <button onClick={() => fileInputRef.current?.click()}>Upload JSON</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          {ingestStatus && <span className="ingest-status">{ingestStatus}</span>}
        </div>
      </header>

      {showTeam && (
        <TeamPanel members={teamMembers} onChange={setTeamMembers} />
      )}

      {showHistory && (
        <IngestHistory logs={ingestLogs} />
      )}

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <KanbanBoard
          opportunities={filtered}
          teamMembers={teamMembers}
          currentUserEmail={currentUserEmail}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
