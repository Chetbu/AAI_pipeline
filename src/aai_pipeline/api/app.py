import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from aai_pipeline.database import init_db, get_session
from aai_pipeline.models import TeamMember
from aai_pipeline.api.routes import opportunities, team, ingest, comments
from aai_pipeline.api.mcp import mcp

# FRONTEND_DIST env var wins (set in Docker); fall back to project-relative path for local dev
_env = os.environ.get("FRONTEND_DIST")
_FRONTEND_DIST = Path(_env) if _env else Path(__file__).parent.parent.parent.parent / "frontend" / "dist"

# Initialize the MCP sub-app eagerly so the session manager is created now
_mcp_app = mcp.streamable_http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    async with mcp._session_manager.run():
        yield


app = FastAPI(title="AAI Pipeline", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(opportunities.router)
app.include_router(comments.router)
app.include_router(team.router)
app.include_router(ingest.router)

# Health check for portal dashboard
@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"})

# Returns the authenticated user's email injected by Traefik.
# Falls back to DEV_USER env var (default: test@localhost.com) when header is absent (local dev).
_DEV_USER = os.environ.get("DEV_USER", "test@localhost.com")

@app.get("/api/me")
async def me(request: Request):
    email = request.headers.get("x-forwarded-user") or _DEV_USER
    with get_session() as session:
        member = session.query(TeamMember).filter(TeamMember.email == email).first()
        if not member:
            member = TeamMember(email=email)
            session.add(member)
            session.flush()
        return {"email": email, "team_member": member.to_dict()}

# MCP streamable HTTP endpoint — LLM clients connect to /mcp
app.mount("/mcp", _mcp_app)

# Serve the built React frontend (if present)
if _FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")
