from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from aai_pipeline.database import get_session
from aai_pipeline.models import Opportunity, OpportunityComment

router = APIRouter(prefix="/api/opportunities", tags=["comments"])


class CommentCreate(BaseModel):
    author: str
    body: str


@router.get("/{opportunity_id}/comments")
def list_comments(opportunity_id: str):
    with get_session() as session:
        if not session.get(Opportunity, opportunity_id):
            raise HTTPException(status_code=404, detail="Opportunity not found")
        comments = (
            session.query(OpportunityComment)
            .filter(OpportunityComment.opportunity_id == opportunity_id)
            .order_by(OpportunityComment.created_at)
            .all()
        )
        return [c.to_dict() for c in comments]


@router.post("/{opportunity_id}/comments", status_code=201)
def add_comment(opportunity_id: str, payload: CommentCreate):
    if not payload.author.strip():
        raise HTTPException(status_code=422, detail="author is required")
    if not payload.body.strip():
        raise HTTPException(status_code=422, detail="body is required")
    with get_session() as session:
        if not session.get(Opportunity, opportunity_id):
            raise HTTPException(status_code=404, detail="Opportunity not found")
        comment = OpportunityComment(
            opportunity_id=opportunity_id,
            author=payload.author.strip(),
            body=payload.body.strip(),
        )
        session.add(comment)
        session.flush()
        return comment.to_dict()
