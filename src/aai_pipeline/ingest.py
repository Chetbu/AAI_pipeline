"""Ingest a daily JSON file of AI opportunities into the database."""

import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

from aai_pipeline.database import get_session, init_db
from aai_pipeline.models import Opportunity

_DATE_PATTERN = re.compile(r"results-(\d{4}-\d{2}-\d{2})\.json")


def _parse_date_from_filename(path: Path) -> date:
    m = _DATE_PATTERN.search(path.name)
    if m:
        return date.fromisoformat(m.group(1))
    return date.today()


def _map_record(record: dict, file_date: date) -> dict:
    output = record.get("Output", {}) or {}
    return {
        "id": record["Id"],
        "name": record.get("Name", ""),
        "description": record.get("Description"),
        "customer": record.get("Customer"),
        "region": record.get("Region"),
        "account_manager": record.get("AccountManager"),
        "link": record.get("link"),
        "gttl_current": record.get("GTTLCurrent"),
        "gttl_next": record.get("GTTLNext"),
        "ai_summary": output.get("Summary"),
        "ai_reason": output.get("Reason"),
        "ai_tags": output.get("Tags"),
        "last_seen_date": file_date,
    }


def ingest(file_path: Path) -> dict:
    """
    Ingest opportunities from a JSON file.

    Returns a summary dict: {"inserted": int, "updated": int, "file": str}
    """
    init_db()

    file_date = _parse_date_from_filename(file_path)

    with open(file_path, encoding="utf-8") as f:
        records = json.load(f)

    inserted = updated = 0

    with get_session() as session:
        for record in records:
            data = _map_record(record, file_date)
            opp = session.get(Opportunity, data["id"])

            if opp is None:
                opp = Opportunity(
                    **data,
                    first_seen_date=file_date,
                    status="in_crm",
                )
                session.add(opp)
                inserted += 1
            else:
                # Update JSON-sourced fields only; preserve team enrichment fields
                for field in (
                    "name", "description", "customer", "region", "account_manager",
                    "link", "gttl_current", "gttl_next",
                    "ai_summary", "ai_reason", "ai_tags", "last_seen_date",
                ):
                    setattr(opp, field, data[field])
                opp.updated_at = datetime.now(timezone.utc)
                updated += 1

    return {"inserted": inserted, "updated": updated, "file": str(file_path)}
