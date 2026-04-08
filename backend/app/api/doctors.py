from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/doctors", tags=["doctors"])

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"]


def serialize(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/")
async def list_doctors(db=Depends(get_db), user=Depends(get_current_user)):
    docs = await db.doctors.find().sort("name", 1).to_list(100)
    return {"success": True, "doctors": [serialize(d) for d in docs]}


@router.post("/")
async def create_doctor(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    doctor = {
        "name": data["name"],
        "specialization": data.get("specialization", ""),
        "qualification": data.get("qualification", ""),
        "phone": data.get("phone", ""),
        "consultation_fee": data.get("consultation_fee", 0),
        "schedule": data.get("schedule", {}),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.doctors.insert_one(doctor)
    doctor["id"] = str(result.inserted_id)
    return {"success": True, "doctor": doctor}


@router.get("/available")
async def available_doctors(date: str = Query(...), db=Depends(get_db), user=Depends(get_current_user)):
    """Get doctors available on a specific date based on their schedule."""
    from datetime import datetime as dt
    try:
        d = dt.strptime(date, "%Y-%m-%d")
        day_name = d.strftime("%a").lower()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    doctors = await db.doctors.find({"is_active": True}).to_list(100)
    available = []
    for doc in doctors:
        schedule = doc.get("schedule", {})
        if day_name in schedule and schedule[day_name].get("start"):
            available.append(serialize(doc))
    return {"success": True, "doctors": available}


@router.get("/{doctor_id}")
async def get_doctor(doctor_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"success": True, "doctor": serialize(doctor)}


@router.put("/{doctor_id}")
async def update_doctor(doctor_id: str, data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    data.pop("id", None)
    data.pop("_id", None)
    result = await db.doctors.update_one({"_id": ObjectId(doctor_id)}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor = serialize(await db.doctors.find_one({"_id": ObjectId(doctor_id)}))
    return {"success": True, "doctor": doctor}
