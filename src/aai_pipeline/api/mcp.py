"""FastMCP server — mounted into the FastAPI app at /mcp (streamable HTTP transport)."""

from typing import Optional

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from aai_pipeline.database import get_session
from aai_pipeline.models import Opportunity, TeamMember

mcp = FastMCP(
    "AAI Pipeline",
    streamable_http_path="/",
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        # Allow standard local hosts with or without explicit port
        # (HTTPS on :443 sends Host: localhost without a port number)
        allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*", "localhost", "127.0.0.1"],
        allowed_origins=[
            "http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*",
            "https://localhost", "https://127.0.0.1",
        ],
    ),
)


@mcp.tool()
def list_opportunities(
    status: Optional[str] = None,
    region: Optional[str] = None,
    covered_by: Optional[str] = None,
    customer: Optional[str] = None,
) -> list[dict]:
    """List AI opportunities with optional filters (status, region, covered_by, customer)."""
    with get_session() as session:
        q = session.query(Opportunity)
        if status:
            q = q.filter(Opportunity.status == status)
        if region:
            q = q.filter(Opportunity.region.contains(region))
        if covered_by:
            q = q.filter(Opportunity.covered_by == covered_by)
        if customer:
            q = q.filter(Opportunity.customer.ilike(f"%{customer}%"))
        return [o.to_dict() for o in q.order_by(Opportunity.name).all()]


@mcp.tool()
def get_opportunity(opportunity_id: str) -> dict:
    """Get full details of a single opportunity by its ID."""
    with get_session() as session:
        opp = session.get(Opportunity, opportunity_id)
        if not opp:
            return {"error": f"No opportunity found with id={opportunity_id}"}
        return opp.to_dict()


@mcp.tool()
def get_pipeline_summary() -> dict:
    """Return summary statistics: counts by status, by region, and team coverage."""
    with get_session() as session:
        all_opps = session.query(Opportunity).all()

    by_status: dict[str, int] = {}
    by_region: dict[str, int] = {}
    covered = 0

    for opp in all_opps:
        by_status[opp.status] = by_status.get(opp.status, 0) + 1
        region_top = (opp.region or "Unknown").split("/")[0]
        by_region[region_top] = by_region.get(region_top, 0) + 1
        if opp.covered_by:
            covered += 1

    return {
        "total": len(all_opps),
        "covered": covered,
        "uncovered": len(all_opps) - covered,
        "by_status": by_status,
        "by_region": by_region,
    }


@mcp.tool()
def update_opportunity(
    opportunity_id: str,
    status: Optional[str] = None,
    covered_by: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """Update an opportunity's status, assignment, or notes."""
    from datetime import datetime, timezone
    valid = {"in_crm", "to_be_assigned", "assigned", "completed"}
    if status and status not in valid:
        return {"error": f"Invalid status '{status}'. Valid values: {sorted(valid)}"}
    with get_session() as session:
        opp = session.get(Opportunity, opportunity_id)
        if not opp:
            return {"error": f"No opportunity found with id={opportunity_id}"}
        if status is not None:
            opp.status = status
        if covered_by is not None:
            opp.covered_by = covered_by
        if notes is not None:
            opp.notes = notes
        opp.updated_at = datetime.now(timezone.utc)
        return opp.to_dict()


@mcp.tool()
def list_team() -> list[dict]:
    """List all team members."""
    with get_session() as session:
        return [m.to_dict() for m in session.query(TeamMember).order_by(TeamMember.name).all()]
