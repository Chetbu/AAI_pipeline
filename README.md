# AAI Pipeline

A full-stack pipeline for tracking AI sales opportunities. Ingests a daily JSON export from the CRM into a SQLite database, lets the team manage coverage and progress through a Kanban board, and exposes the data to LLMs via an MCP server for QBR and pipeline management.

## Features

- **JSON ingestion** — daily CRM export → SQLite, upserts by opportunity ID, preserves team enrichment on re-ingest
- **Kanban board** — React/TypeScript UI with 4 columns (In CRM, To be assigned, Assigned, Completed)
- **Team management** — assign team members to opportunities, track coverage
- **MCP interface** — connect any LLM client (Claude, etc.) directly to the pipeline data via streamable HTTP

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.0, SQLite |
| MCP | FastMCP (streamable HTTP, mounted at `/mcp`) |
| Frontend | React 18, TypeScript, Vite 8 |
| Runtime | Docker / docker compose (deployed behind Traefik reverse proxy) |

---

## Getting started

### With Docker (production — behind Traefik)

The container joins the `aai-public` Docker network. Traefik routes traffic to it by hostname over that network — TLS and auth are handled entirely at the Traefik layer.

```bash
# The aai-public network must already exist on the host (Traefik owns it)
docker network create aai-public   # skip if it already exists

# Build and start
docker compose up -d

# Stop
docker compose down
```

> The SQLite database is stored in `./data/pipeline.db` and persisted via a bind mount — data survives container restarts.

### Local development (without Docker)

**Requirements:** Python 3.13, Node 22 (via nvm), uv

```bash
# Python setup
uv venv && uv pip install -e .

# Start the API server
python main.py serve
# → http://localhost:8742

# Frontend dev server (hot reload, in a separate terminal)
cd frontend
nvm use 22
npm run dev
# → http://localhost:5173 (proxies /api to :8742)
```

---

## JSON ingestion

Files must follow the naming convention `results-YYYY-MM-DD.json`.

**From the UI:** Click **Upload JSON** in the header, pick your file — it is uploaded, ingested, and the board refreshes automatically.

**From the API:**
```bash
curl -X POST http://localhost:8742/api/ingest \
  -F "file=@results-2026-04-08.json"
```

**Upsert behavior:** JSON fields (name, customer, region, GTTL, AI summary, etc.) are always overwritten. Team fields (`status`, `covered_by`, `notes`) are preserved on re-ingest.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/opportunities` | List opportunities (filters: `status`, `region`, `covered_by`, `customer`) |
| `GET` | `/api/opportunities/{id}` | Get one opportunity |
| `PATCH` | `/api/opportunities/{id}` | Update `status`, `covered_by`, `notes` |
| `GET` | `/api/team` | List team members |
| `POST` | `/api/team` | Add a team member `{"name": "...", "email": "..."}` |
| `DELETE` | `/api/team/{id}` | Remove a team member |
| `POST` | `/api/ingest` | Upload a `results-YYYY-MM-DD.json` file and ingest it |
| `GET` | `/health` | Health check — returns `{"status": "ok"}` |

Interactive docs: **http://localhost:8742/docs** (local dev) or via your Traefik hostname.

### Opportunity statuses

`in_crm` · `to_be_assigned` · `assigned` · `completed`

---

## MCP (AI interface)

The MCP server uses the **streamable HTTP** transport, mounted at `/mcp` on the same port as the API.

**Connect from Claude Code** — add a `.mcp.json` file at the project root (already included):

```json
{
  "mcpServers": {
    "aai-pipeline": {
      "type": "http",
      "url": "http://localhost:8742/mcp/"
    }
  }
}
```

**Connect from Claude Desktop** — add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aai-pipeline": {
      "type": "http",
      "url": "http://localhost:8742/mcp/"
    }
  }
}
```

### Available tools

| Tool | Description |
|---|---|
| `list_opportunities` | Filter by status, region, covered_by, customer |
| `get_opportunity` | Full detail for one opportunity by ID |
| `get_pipeline_summary` | Counts by status, region, and coverage stats |
| `update_opportunity` | Set status, covered_by, notes |
| `list_team` | List team members |

---

## Project structure

```
AAI_pipeline/
├── src/aai_pipeline/
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # Opportunity, TeamMember ORM models
│   ├── ingest.py            # JSON → DB upsert
│   └── api/
│       ├── app.py           # FastAPI app (routes, MCP mount, static files, /health)
│       ├── mcp.py           # FastMCP tools
│       └── routes/          # opportunities, team, ingest
├── frontend/                # React + TypeScript (Vite)
├── input/                   # Daily JSON files (gitignored)
├── data/                    # SQLite database (gitignored)
├── Dockerfile               # Multi-stage: Node 22 build → Python 3.13 runtime
├── docker-compose.yml       # App service + aai-public network (Traefik integration)
├── .mcp.json                # Claude Code MCP server declaration
└── main.py                  # CLI: serve
```

---

## Configuration

Environment variables (set in `docker-compose.yml`, can be overridden):

| Variable | Default (Docker) | Description |
|---|---|---|
| `DB_PATH` | `/app/data/pipeline.db` | Path to SQLite database |
| `FRONTEND_DIST` | `/app/frontend/dist` | Path to built React assets |
| `INPUT_DIR` | `/app/input` | Path to JSON input directory |
