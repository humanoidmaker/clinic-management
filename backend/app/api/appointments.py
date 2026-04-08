from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

VALID_STATUSES = ["scheduled", "in_progress", "completed", "cancelled", "no_show"]


def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/")
async def list_appointments(
    date: str = Query(""),
    doctor_id: str = Query(""),
    status: str = Query(""),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    f = {}
    if date:
        f["date"] = date
    if doctor_id:
        f["doctor_id"] = doctor_id
    if status:
        f["status"] = status
    docs = await db.appointments.find(f).sort([("date", -1), ("time_slot", 1)]).to_list(500)
    for doc in docs:
        if doc.get("patient_id"):
            try:
                p = await db.patients.find_one({"_id": ObjectId(doc["patient_id"])})
                doc["patient_name"] = p["name"] if p else "Unknown"
                doc["patient_phone"] = p.get("phone", "") if p else ""
            except Exception:
                doc["patient_name"] = "Unknown"
                doc["patient_phone"] = ""
        if doc.get("doctor_id"):
            try:
                d = await db.doctors.find_one({"_id": ObjectId(doc["doctor_id"])})
                doc["doctor_name"] = d["name"] if d else "Unknown"
                doc["doctor_specialization"] = d.get("specialization", "") if d else ""
            except Exception:
                doc["doctor_name"] = "Unknown"
                doc["doctor_specialization"] = ""
    return {"success": True, "appointments": [s(d) for d in docs]}


@router.get("/today")
async def today_appointments(db=Depends(get_db), user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    docs = await db.appointments.find({"date": today}).sort("time_slot", 1).to_list(200)
    for doc in docs:
        if doc.get("patient_id"):
            try:
                p = await db.patients.find_one({"_id": ObjectId(doc["patient_id"])})
                doc["patient_name"] = p["name"] if p else "Unknown"
                doc["patient_phone"] = p.get("phone", "") if p else ""
            except Exception:
                doc["patient_name"] = "Unknown"
        if doc.get("doctor_id"):
            try:
                d = await db.doctors.find_one({"_id": ObjectId(doc["doctor_id"])})
                doc["doctor_name"] = d["name"] if d else "Unknown"
            except Exception:
                doc["doctor_name"] = "Unknown"
    return {"success": True, "appointments": [s(d) for d in docs]}


@router.post("/")
async def create_appointment(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    patient = await db.patients.find_one({"_id": ObjectId(data["patient_id"])})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    doctor = await db.doctors.find_one({"_id": ObjectId(data["doctor_id"])})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    existing = await db.appointments.find_one({
        "doctor_id": data["doctor_id"],
        "date": data["date"],
        "time_slot": data["time_slot"],
        "status": {"$nin": ["cancelled", "no_show"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="Time slot already booked for this doctor")
    appointment = {
        "patient_id": data["patient_id"],
        "doctor_id": data["doctor_id"],
        "date": data["date"],
        "time_slot": data["time_slot"],
        "notes": data.get("notes", ""),
        "status": "scheduled",
        "patient_name": patient["name"],
        "doctor_name": doctor["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.appointments.insert_one(appointment)
    appointment["id"] = str(result.inserted_id)
    return {"success": True, "appointment": appointment}


@router.put("/{aid}/status")
async def update_status(aid: str, data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    new_status = data.get("status")
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    result = await db.appointments.update_one(
        {"_id": ObjectId(aid)},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt = s(await db.appointments.find_one({"_id": ObjectId(aid)}))
    return {"success": True, "appointment": appt}


@router.delete("/{aid}")
async def delete_appointment(aid: str, db=Depends(get_db), user=Depends(get_current_user)):
    result = await db.appointments.delete_one({"_id": ObjectId(aid)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"success": True, "message": "Appointment deleted"}


@router.get("/calendar")
async def calendar(month: int = Query(...), year: int = Query(...), db=Depends(get_db), user=Depends(get_current_user)):
    prefix = f"{year}-{month:02d}"
    pipeline = [
        {"$match": {"date": {"$regex": f"^{prefix}"}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    results = await db.appointments.aggregate(pipeline).to_list(31)
    return {"success": True, "calendar": {r["_id"]: r["count"] for r in results}}


@router.get("/stats")
async def appointment_stats(db=Depends(get_db), user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total = await db.appointments.count_documents({})
    today_count = await db.appointments.count_documents({"date": today})
    scheduled = await db.appointments.count_documents({"status": "scheduled"})
    completed = await db.appointments.count_documents({"status": "completed"})
    cancelled = await db.appointments.count_documents({"status": "cancelled"})
    no_show = await db.appointments.count_documents({"status": "no_show"})
    in_progress = await db.appointments.count_documents({"status": "in_progress"})
    return {
        "success": True,
        "stats": {
            "total": total,
            "today": today_count,
            "scheduled": scheduled,
            "in_progress": in_progress,
            "completed": completed,
            "cancelled": cancelled,
            "no_show": no_show,
        },
    }
