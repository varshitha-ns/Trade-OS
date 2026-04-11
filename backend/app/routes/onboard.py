from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.models import UserCreate
from app.auth import get_password_hash
from app.services.document_validator import document_validator

router = APIRouter()

BASIC_REQUIRED_DOCS = ["id", "bank_proof", "iec"]
EXPORT_READY_DOCS = BASIC_REQUIRED_DOCS + ["lab_report", "phytosanitary"]


def _compute_missing(docs: List[dict]) -> List[str]:
    present_types = {d.get("type") for d in docs}
    missing = [d for d in EXPORT_READY_DOCS if d not in present_types]
    return missing


@router.post("/register", response_model=dict)
async def onboard_register(user: UserCreate):
    db = get_database()

    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user.password)
    user_dict["verification_status"] = "unverified"
    user_dict["onboarding_stage"] = "basic"
    user_dict["onboarding_missing_items"] = EXPORT_READY_DOCS
    user_dict["documents"] = []
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()

    result = await db.users.insert_one(user_dict)

    return {
        "onboarding_id": str(result.inserted_id),
        "required_docs": EXPORT_READY_DOCS,
    }


@router.post("/{user_id}/upload", response_model=dict)
async def onboard_upload_documents(
    user_id: str,
    doc_type: str = "other",
    files: List[UploadFile] = File(...),
):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stored_docs = user.get("documents", [])

    # For Phase 1 we just record metadata; actual file storage can be added later
    now = datetime.utcnow()
    
    validation_status = "verified_basic" # Assume verified unless proven otherwise
    
    for f in files:
        file_bytes = await f.read()
        
        # Call Hybrid Document Validator
        validation_result = document_validator.verify_document(file_bytes, f.content_type)
        
        if validation_result["status"] == "pending_manual_review":
            validation_status = "pending_manual_review"
            
        stored_docs.append({
            "type": doc_type,
            "filename": f.filename,
            "uploaded_at": now,
            "validation_result": validation_result
        })

    missing = _compute_missing(stored_docs)

    if validation_status == "verified_basic":
        if set(BASIC_REQUIRED_DOCS).issubset({d.get("type") for d in stored_docs}):
            verification_status = "verified_basic" if missing else "verified_export_ready"
        else:
            verification_status = "pending"
    else:
        verification_status = validation_status # pass down the manual review status

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "documents": stored_docs,
                "onboarding_missing_items": missing,
                "verification_status": verification_status,
                "onboarding_stage": "docs_uploaded",
                "updated_at": now,
            }
        },
    )

    return {
        "status": "ok",
        "verification_status": verification_status,
        "missing": missing,
    }


@router.get("/{user_id}/status", response_model=dict)
async def onboard_status(user_id: str):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "verification_status": user.get("verification_status", "unverified"),
        "onboarding_stage": user.get("onboarding_stage", "basic"),
        "missing": user.get("onboarding_missing_items", EXPORT_READY_DOCS),
    }
