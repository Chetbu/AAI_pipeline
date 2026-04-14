from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from aai_pipeline.database import get_session
from aai_pipeline.models import Opportunity

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])

VALID_STATUSES = {"in_crm", "to_be_assigned", "assigned", "completed"}


class OpportunityPatch(BaseModel):
    status: Optional[str] = None
    covered_by: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_opportunities(
    status: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    covered_by: Optional[str] = Query(None),
    customer: Optional[str] = Query(None),
):
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


@router.get("/{opportunity_id}")
def get_opportunity(opportunity_id: str):
    with get_session() as session:
        opp = session.get(Opportunity, opportunity_id)
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return opp.to_dict()


@router.patch("/{opportunity_id}")
def update_opportunity(opportunity_id: str, patch: OpportunityPatch):
    if patch.status and patch.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Valid: {sorted(VALID_STATUSES)}")
    with get_session() as session:
        opp = session.get(Opportunity, opportunity_id)
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if patch.status is not None:
            opp.status = patch.status
        if patch.covered_by is not None:
            opp.covered_by = patch.covered_by
        if patch.notes is not None:
            opp.notes = patch.notes
        opp.updated_at = datetime.now(timezone.utc)
        return opp.to_dict()
