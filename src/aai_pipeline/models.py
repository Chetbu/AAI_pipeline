from datetime import datetime, date, timezone

from sqlalchemy import Column, String, Text, Date, DateTime, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from aai_pipeline.database import Base


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(String, primary_key=True)           # UUID from JSON
    name = Column(String, nullable=False)
    description = Column(Text)
    customer = Column(String)
    region = Column(String)
    account_manager = Column(String)
    link = Column(String)
    gttl_current = Column(String)
    gttl_next = Column(String)
    ai_summary = Column(Text)
    ai_reason = Column(Text)
    ai_tags = Column(String)

    # Team enrichment (managed via the frontend/API)
    status = Column(String, default="in_crm")        # in_crm | to_be_assigned | assigned | completed
    covered_by = Column(String)                      # team member name
    notes = Column(Text)

    # Tracking
    first_seen_date = Column(Date)
    last_seen_date = Column(Date)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "customer": self.customer,
            "region": self.region,
            "account_manager": self.account_manager,
            "link": self.link,
            "gttl_current": self.gttl_current,
            "gttl_next": self.gttl_next,
            "ai_summary": self.ai_summary,
            "ai_reason": self.ai_reason,
            "ai_tags": self.ai_tags,
            "status": self.status,
            "covered_by": self.covered_by,
            "notes": self.notes,
            "first_seen_date": self.first_seen_date.isoformat() if self.first_seen_date else None,
            "last_seen_date": self.last_seen_date.isoformat() if self.last_seen_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class IngestLog(Base):
    __tablename__ = "ingest_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    file_date = Column(Date)                 # date parsed from filename
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    records_inserted = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "file_date": self.file_date.isoformat() if self.file_date else None,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "records_inserted": self.records_inserted,
            "records_updated": self.records_updated,
        }


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    email = Column(String)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "email": self.email}
