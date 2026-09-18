"""
lms_routes.py
-------------
Serves the files that faculty upload. Upload already existed; nothing read
them back, so documents were written to disk and never reachable.

Shared by every role. Access is decided per document:
  - faculty and the HOD can open anything
  - a student can open a document only if for_students is true

Wire into app.py:
    from lms_routes import router as lms_router
    app.include_router(lms_router)
"""
import mimetypes
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

import auth
import db

router = APIRouter(prefix="/api/lms", tags=["lms"])


def readable(doc_id: int, user: dict) -> dict:
    """Fetch a document, or refuse if this user may not see it."""
    doc = db.query_one(
        """SELECT l.id, l.title, l.doc_type, l.file_path, l.file_type,
                  l.for_students, l.uploaded_by, l.download_count,
                  s.name AS subject_name
           FROM lms_documents l
           LEFT JOIN subjects s ON s.id = l.subject_id
           WHERE l.id = %s""",
        (doc_id,),
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if user["role"] == "student" and not doc["for_students"]:
        raise HTTPException(
            status_code=403,
            detail="This document has not been shared with students.",
        )
    return doc


@router.get("/{doc_id}/download")
def download(doc_id: int, user: dict = Depends(auth.current_user)):
    """Stream the file back, and count the download."""
    doc = readable(doc_id, user)

    path = doc["file_path"]
    if not path or not os.path.exists(path):
        raise HTTPException(
            status_code=410,
            detail="The file is recorded but missing from the server. "
                   "Ask the uploader to add it again.",
        )

    db.execute(
        "UPDATE lms_documents SET download_count = download_count + 1 WHERE id = %s",
        (doc_id,),
    )

    # A clean filename for the browser, built from the title rather than the
    # timestamped name on disk.
    ext = os.path.splitext(path)[1] or f".{doc['file_type'] or 'bin'}"
    safe_title = "".join(
        c for c in (doc["title"] or "document") if c.isalnum() or c in " -_"
    ).strip() or "document"

    media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"

    return FileResponse(path, media_type=media_type, filename=f"{safe_title}{ext}")


@router.get("/{doc_id}/view")
def view(doc_id: int, user: dict = Depends(auth.current_user)):
    """Same file, rendered inline so a PDF opens in the browser tab."""
    doc = readable(doc_id, user)

    path = doc["file_path"]
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=410, detail="The file is missing from the server.")

    media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type)


@router.get("/{doc_id}")
def meta(doc_id: int, user: dict = Depends(auth.current_user)):
    """Details for one document, without sending the file."""
    doc = readable(doc_id, user)
    doc.pop("file_path", None)          # never expose the server path
    doc["exists"] = True
    return doc
