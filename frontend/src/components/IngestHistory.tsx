import type { IngestLog } from '../types'

interface Props {
  logs: IngestLog[]
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function IngestHistory({ logs }: Props) {
  return (
    <div className="ingest-history-panel">
      <h3>Ingestion history</h3>
      {logs.length === 0 ? (
        <p className="ingest-history-empty">No ingestions yet.</p>
      ) : (
        <table className="ingest-history-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Data date</th>
              <th>Uploaded at</th>
              <th>New</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="ingest-filename">{log.filename}</td>
                <td>{log.file_date ?? '—'}</td>
                <td>{fmt(log.uploaded_at)}</td>
                <td className="ingest-num">{log.records_inserted > 0 ? `+${log.records_inserted}` : '—'}</td>
                <td className="ingest-num">{log.records_updated > 0 ? log.records_updated : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
