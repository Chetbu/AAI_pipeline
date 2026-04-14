from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from aai_pipeline.database import get_session
from aai_pipeline.models import TeamMember

router = APIRouter(prefix="/api/team", tags=["team"])


class TeamMemberCreate(BaseModel):
    name: str
    email: Optional[str] = None


@router.get("")
def list_team():
    with get_session() as session:
        return [m.to_dict() for m in session.query(TeamMember).order_by(TeamMember.name).all()]


@router.post("", status_code=201)
def create_team_member(body: TeamMemberCreate):
    with get_session() as session:
        existing = session.query(TeamMember).filter(TeamMember.name == body.name).first()
        if existing:
            raise HTTPException(status_code=409, detail="Team member with this name already exists")
        member = TeamMember(name=body.name, email=body.email)
        session.add(member)
        session.flush()
        return member.to_dict()


@router.delete("/{member_id}", status_code=204)
def delete_team_member(member_id: int):
    with get_session() as session:
        member = session.get(TeamMember, member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Team member not found")
        session.delete(member)
