from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
        for k in ["patient_id", "doctor_id"]:
            if k in doc and doc[k]: doc[k] = str(doc[k])
    return doc

@router.get("/")
async def list_appts(date: str = "", doctor_id: str = "", db=Depends(get_db), user=Depends(get_current_user)):
    f = {}
    if date: f["date"] = date
    if doctor_id: f["doctor_id"] = doctor_id
    docs = await db.appointments.find(f).sort("time_slot", 1).to_list(500)
    return {"success": True, "appointments": [s(d) for d in docs]}

@router.get("/today")
async def today(db=Depends(get_db), user=Depends(get_current_user)):
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    docs = await db.appointments.find({"date": today_str}).sort("time_slot", 1).to_list(100)
    return {"success": True, "appointments": [s(d) for d in docs]}

@router.post("/")
async def create(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data["status"] = data.get("status", "scheduled")
    data["created_at"] = datetime.now(timezone.utc)
    r = await db.appointments.insert_one(data)
    return {"success": True, "id": str(r.inserted_id)}

@router.put("/{aid}/status")
async def update_status(aid: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"status": data["status"]}})
    return {"success": True}
