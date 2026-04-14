# AAI Pipeline — Claude Code Guide

## What this project is

A full-stack pipeline for tracking AI sales opportunities. A daily JSON export from the CRM is ingested into a SQLite database, enriched with team metadata (who covers it, progress), exposed via a React/TypeScript Kanban frontend, and queryable by LLMs through an MCP server.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.13 (`.python-version`) |
| Package manager | `uv` (venv at `.venv/`) |
| Database | SQLite at `data/pipeline.db` |
| ORM | SQLAlchemy 2.0 (sync) |
| API | FastAPI + uvicorn |
| MCP | FastMCP (`mcp.server.fastmcp`) — mounted as streamable HTTP in FastAPI at `/mcp` |
| Frontend | React 18 + TypeScript + Vite 8 |
| Node | v22 (managed via nvm; run `nvm use 22` before frontend commands) |

## Project layout

```
AAI_pipeline/
├── src/aai_pipeline/
│   ├── database.py          # SQLAlchemy engine, Base, get_session(), init_db()
│   ├── models.py            # Opportunity, TeamMember ORM models
│   ├── ingest.py            # JSON → DB upsert logic (requires explicit file_path)
│   └── api/
│       ├── app.py           # FastAPI app: CORS, routes, MCP mount, static files
│       ├── mcp.py           # FastMCP tools (list/get/update opportunities, summary, team)
│       └── routes/
│           ├── opportunities.py   # GET /api/opportunities, GET/PATCH /api/opportunities/{id}
│           ├── team.py            # GET/POST /api/team, DELETE /api/team/{id}
│           └── ingest.py          # POST /api/ingest (multipart file upload)
├── frontend/                # React + TypeScript (Vite)
│   ├── src/
│   │   ├── App.tsx          # Root component: load data, header, filter, team panel
│   │   ├── App.css          # All styles (no CSS framework)
│   │   ├── api/client.ts    # Typed fetch wrapper for all API endpoints
│   │   ├── types/index.ts   # Opportunity, TeamMember, OpportunityStatus types
│   │   └── components/
│   │       ├── KanbanBoard.tsx    # 6-column board (backlog/in_progress/covered/declined/won/lost)
│   │       ├── OpportunityCard.tsx # Clickable card; opens AssignDialog
│   │       ├── AssignDialog.tsx   # Modal: set status, covered_by, notes
│   │       └── TeamPanel.tsx      # Add/remove team members
│   └── vite.config.ts       # Dev proxy: /api → localhost:8742
├── main.py                  # CLI: `serve` subcommand only
├── input/                   # gitignored — uploaded JSON files saved here
├── data/                    # gitignored — SQLite DB lives here
├── pyproject.toml           # Dependencies + src layout
└── docker-compose.yml       # App service + aai-public external network (Traefik)
```

## Common commands

```bash
# Set up (first time)
uv venv && uv pip install -e .

# Start the server (API + frontend + MCP, all on port 8742)
python main.py serve

# Start with hot-reload (dev)
python main.py serve --reload

# Frontend dev server (hot reload, proxies /api to :8742)
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build
```

## Docker

The container is deployed behind a **Traefik** reverse proxy. It joins the `aai-public` external Docker network — Traefik routes to it by hostname over that network. TLS and auth are handled at the Traefik layer; the app serves plain HTTP on port 8742.

```bash
# Build and start (production mode, SQLite persisted in ./data/)
docker compose up -d

# Rebuild after code changes
docker compose build && docker compose up -d

# Stop
docker compose down
```

The `./data/` volume is bind-mounted so the database persists across restarts.

> The `aai-public` network must exist on the host before starting (`docker network create aai-public`). Traefik owns this network.

**Environment variables** (set in `docker-compose.yml`, also override for local dev):
- `DB_PATH` — path to SQLite file (default: derived from `__file__` in local dev)
- `FRONTEND_DIST` — path to built React assets
- `INPUT_DIR` — path where uploaded JSON files are saved

## Key URLs (local dev — `python main.py serve`)

| URL | Purpose |
|---|---|
| `http://localhost:8742` | React Kanban UI (served from `frontend/dist/`) |
| `http://localhost:8742/api/opportunities` | REST API |
| `http://localhost:8742/docs` | FastAPI auto-docs (Swagger) |
| `http://localhost:8742/mcp` | MCP streamable HTTP endpoint for LLM clients |
| `http://localhost:8742/health` | Health check — returns `{"status": "ok"}` |

## Database schema

**`opportunities`** — upserted from JSON; team fields preserved on re-ingest

- `id` (TEXT PK — UUID from JSON)
- `name`, `description`, `customer`, `region`, `account_manager`, `link`
- `gttl_current`, `gttl_next` — pipeline value
- `ai_summary`, `ai_reason`, `ai_tags` — from the JSON `Output` field
- `status` — `backlog | in_progress | covered | declined | won | lost`
- `covered_by` — team member name (free text, not FK)
- `notes` — manual notes
- `first_seen_date`, `last_seen_date` — derived from JSON filename (`results-YYYY-MM-DD.json`)

**`team_members`** — managed via the UI

- `id`, `name` (unique), `email`

## Ingestion logic

- Triggered exclusively via `POST /api/ingest` (multipart file upload from the UI)
- Filename must match `results-YYYY-MM-DD.json` — validated by the API, date parsed from filename
- File is saved to `INPUT_DIR` then ingested
- Upserts by `id`: JSON fields are overwritten, `status / covered_by / notes` are preserved
- `first_seen_date` is set only on insert; `last_seen_date` is updated every ingest

## MCP tools (available to any LLM client)

| Tool | Description |
|---|---|
| `list_opportunities` | Filter by status, region, covered_by, customer |
| `get_opportunity` | Full detail by id |
| `get_pipeline_summary` | Counts by status, region, coverage stats |
| `update_opportunity` | Set status, covered_by, notes |
| `list_team` | List team members |

Connect Claude Desktop (or any MCP client) to `http://localhost:8742/mcp` (local dev) or via the Traefik hostname in production.

## Opportunity statuses

`backlog` → `in_progress` → `covered` / `declined` / `won` / `lost`

Status is set manually by the team via the Kanban UI or the MCP `update_opportunity` tool.

## Adding new API routes

1. Create `src/aai_pipeline/api/routes/my_route.py` with an `APIRouter`
2. Include it in `src/aai_pipeline/api/app.py` with `app.include_router(...)`

## Adding new MCP tools

Add a `@mcp.tool()` decorated function to `src/aai_pipeline/api/mcp.py`. The function must be synchronous (shares the same SQLAlchemy sync session layer).

## Frontend notes

- No CSS framework — all styles are in `App.css` using plain class names
- Vite dev proxy (`/api → :8742`) is configured in `vite.config.ts`
- `frontend/dist/` is built output — gitignored, served by FastAPI in production
- Node 22 required (nvm manages this); run `nvm use 22` before any `npm` commands
