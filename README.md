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
| Runtime | Docker / docker compose |

---

## Running locally

Three options, pick the one that fits:

### Option A — Python directly (fastest for dev)

**Requirements:** Python 3.13, Node 22 (via nvm), uv

```bash
# First-time setup
uv venv && uv pip install -e .

# Start the API + frontend server
python main.py serve
# → http://localhost:8742

# Optional: frontend hot-reload dev server (separate terminal)
cd frontend && nvm use 22 && npm run dev
# → http://localhost:5173 (proxies /api to :8742)
```

### Option B — Docker (local, no Traefik)

Uses `docker-compose-local.yml`, which publishes port 8742 directly to the host. No shared network or Traefik labels needed.

```bash
docker compose -f docker-compose-local.yml up -d --build
# → http://localhost:8742

docker compose -f docker-compose-local.yml down
```

---

## Deploying to the VPS (production)

The production setup runs behind the shared Traefik reverse proxy on the AAI infrastructure. Traefik handles TLS (Let's Encrypt), routing by hostname, and authentication — the app itself does nothing special.

The relevant files for this are `docker-compose.yml`, `Makefile`, and `portal.json`.

### Prerequisites (admin, one-time)

The repo must be cloned under `/opt/aai/projects/` for the Makefile's `SHARED_ENV` path to resolve correctly:

```bash
cd /opt/aai/projects
git clone <repo-url> pipeline
cd pipeline
cp .env.example .env   # fill in any secrets; create empty file if none needed
```

### Starting and managing the service

```bash
make up        # build and start (reads shared.env + .env)
make ps        # confirm aai-pipeline is "Up"
make logs      # tail logs
make restart   # force-recreate (e.g. after a git pull)
make down      # stop
```

The app will be reachable at `https://pipeline.<BASE_DOMAIN>` once Traefik picks up the container (a few seconds after `make up`).

### How it integrates with the platform

- `docker-compose.yml` declares `container_name: aai-pipeline`, joins the `aai-public` external network, and carries the 6 Traefik labels that tell the proxy where to route traffic.
- `Makefile` passes `/opt/aai/shared.env` (which contains `BASE_DOMAIN` and other platform-wide variables) alongside the project's own `.env`.
- `portal.json` is read by the portal on startup to register the project card automatically — no manual edit of the infrastructure repo needed.
- The `/health` endpoint is polled every 30 seconds by the portal to display the status badge on the card.

### After a code change

```bash
git pull
make restart
```

---

## Resetting the database

Drops all tables and recreates them — wipes all data. Requires interactive confirmation.

**Production:**
```bash
make reset-db
```

**Local (Python directly):**
```bash
uv run main.py reset-db
```

**Local (Docker):**
```bash
docker exec -it aai-pipeline python main.py reset-db
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

Interactive docs: `http://localhost:8742/docs` (local) or `https://pipeline.<BASE_DOMAIN>/docs` (production).

### Opportunity statuses

`in_crm` · `to_be_assigned` · `assigned` · `completed`

---

## MCP (AI interface)

The MCP server uses the **streamable HTTP** transport, mounted at `/mcp`.

**Connect from Claude Code** — `.mcp.json` is already included at the project root:

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

**Connect from Claude Desktop** — add to `claude_desktop_config.json`:

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
├── docker-compose.yml       # Production: Traefik labels + aai-public network
├── docker-compose-local.yml # Local Docker: publishes port 8742 to host
├── Makefile                 # Production helpers (up / down / restart / logs)
├── portal.json              # Platform portal registration
├── .mcp.json                # Claude Code MCP server declaration
└── main.py                  # CLI: serve
```

---

## Configuration

Environment variables (set in `docker-compose.yml` / `docker-compose-local.yml`, can be overridden):

| Variable | Default (Docker) | Description |
|---|---|---|
| `DB_PATH` | `/app/data/pipeline.db` | Path to SQLite database |
| `FRONTEND_DIST` | `/app/frontend/dist` | Path to built React assets |
| `INPUT_DIR` | `/app/input` | Path to JSON input directory |
