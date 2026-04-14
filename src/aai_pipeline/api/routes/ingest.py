import os
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File

from aai_pipeline.database import get_session
from aai_pipeline.ingest import ingest, _parse_date_from_filename
from aai_pipeline.models import IngestLog

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

_FILENAME_PATTERN = re.compile(r"^results-\d{4}-\d{2}-\d{2}\.json$")

_env = os.environ.get("INPUT_DIR")
# src/aai_pipeline/api/routes/ingest.py → 5 parents → project root
_INPUT_DIR = Path(_env) if _env else Path(__file__).parent.parent.parent.parent.parent / "input"


@router.post("")
async def upload_ingest(file: UploadFile = File(...)):
    """Upload a results-YYYY-MM-DD.json file and ingest it immediately."""
    if not _FILENAME_PATTERN.match(file.filename or ""):
        raise HTTPException(
            status_code=422,
            detail="Filename must match results-YYYY-MM-DD.json",
        )

    _INPUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = _INPUT_DIR / file.filename

    contents = await file.read()
    dest.write_bytes(contents)

    result = ingest(dest)

    with get_session() as session:
        session.add(IngestLog(
            filename=file.filename,
            file_date=_parse_date_from_filename(dest),
            records_inserted=result["inserted"],
            records_updated=result["updated"],
        ))

    return result


@router.get("/history")
def ingest_history():
    """Return the list of all past ingestions, newest first."""
    with get_session() as session:
        logs = session.query(IngestLog).order_by(IngestLog.uploaded_at.desc()).all()
        return [log.to_dict() for log in logs]
