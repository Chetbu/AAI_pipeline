from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from aai_pipeline.database import get_session
from aai_pipeline.models import TeamMember

router = APIRouter(prefix="/api/team", tags=["team"])


class TeamMemberCreate(BaseModel):
    email: str
    name: Optional[str] = None
    surname: Optional[str] = None


@router.get("")
def list_team():
    with get_session() as session:
        members = session.query(TeamMember).all()
        members.sort(key=lambda m: (m.name or m.email).lower())
        return [m.to_dict() for m in members]


@router.post("", status_code=201)
def create_team_member(body: TeamMemberCreate):
    if not body.email.strip():
        raise HTTPException(status_code=422, detail="email is required")
    with get_session() as session:
        if session.query(TeamMember).filter(TeamMember.email == body.email.strip()).first():
            raise HTTPException(status_code=409, detail="Team member with this email already exists")
        member = TeamMember(
            email=body.email.strip(),
            name=body.name.strip() if body.name else None,
            surname=body.surname.strip() if body.surname else None,
        )
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
