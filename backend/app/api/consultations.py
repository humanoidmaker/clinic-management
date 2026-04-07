from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/consultations", tags=["consultations"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.post("/")
async def create(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data["created_at"] = datetime.now(timezone.utc)
    r = await db.consultations.insert_one(data)
    if data.get("appointment_id"):
        await db.appointments.update_one({"_id": ObjectId(data["appointment_id"])}, {"$set": {"status": "completed"}})
    return {"success": True, "id": str(r.inserted_id)}

@router.get("/{cid}")
async def get_consultation(cid: str, db=Depends(get_db), user=Depends(get_current_user)):
    doc = await db.consultations.find_one({"_id": ObjectId(cid)})
    if not doc: raise HTTPException(404, "Not found")
    return {"success": True, "consultation": s(doc)}

@router.get("/patient/{pid}")
async def patient_history(pid: str, db=Depends(get_db), user=Depends(get_current_user)):
    docs = await db.consultations.find({"patient_id": pid}).sort("created_at", -1).to_list(100)
    return {"success": True, "consultations": [s(d) for d in docs]}
