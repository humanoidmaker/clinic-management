from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["patients"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("/")
async def list_patients(q: str = "", db=Depends(get_db), user=Depends(get_current_user)):
    f = {}
    if q: f["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q}}]
    docs = await db.patients.find(f).sort("name", 1).to_list(500)
    return {"success": True, "patients": [s(d) for d in docs]}

@router.get("/{pid}")
async def get_patient(pid: str, db=Depends(get_db), user=Depends(get_current_user)):
    doc = await db.patients.find_one({"_id": ObjectId(pid)})
    if not doc: raise HTTPException(404, "Not found")
    consults = await db.consultations.find({"patient_id": pid}).sort("created_at", -1).to_list(50)
    return {"success": True, "patient": s(doc), "consultations": [s(c) for c in consults]}

@router.post("/")
async def create(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data["created_at"] = datetime.now(timezone.utc)
    r = await db.patients.insert_one(data)
    return {"success": True, "id": str(r.inserted_id)}

@router.put("/{pid}")
async def update(pid: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.pop("id", None); data.pop("_id", None)
    await db.patients.update_one({"_id": ObjectId(pid)}, {"$set": data})
    return {"success": True}
