from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["patients"])


def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/")
async def list_patients(q: str = Query(""), db=Depends(get_db), user=Depends(get_current_user)):
    f = {}
    if q:
        f["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.patients.find(f).sort("name", 1).to_list(500)
    return {"success": True, "patients": [s(d) for d in docs]}


@router.post("/")
async def create_patient(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    if await db.patients.find_one({"phone": data.get("phone")}):
        raise HTTPException(status_code=400, detail="Patient with this phone already exists")
    patient = {
        "name": data["name"],
        "age": data.get("age", 0),
        "gender": data.get("gender", ""),
        "phone": data["phone"],
        "blood_group": data.get("blood_group", ""),
        "allergies": data.get("allergies", []),
        "emergency_contact": data.get("emergency_contact", {}),
        "medical_history": data.get("medical_history", ""),
        "address": data.get("address", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.patients.insert_one(patient)
    patient["id"] = str(result.inserted_id)
    return {"success": True, "patient": patient}


@router.get("/{pid}")
async def get_patient(pid: str, db=Depends(get_db), user=Depends(get_current_user)):
    doc = await db.patients.find_one({"_id": ObjectId(pid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = s(doc)
    consultations = await db.consultations.find({"patient_id": pid}).sort("created_at", -1).to_list(100)
    patient["consultations"] = [s(c) for c in consultations]
    bills = await db.bills.find({"patient_id": pid}).sort("created_at", -1).to_list(100)
    patient["bills"] = [s(b) for b in bills]
    return {"success": True, "patient": patient}


@router.put("/{pid}")
async def update_patient(pid: str, data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    data.pop("id", None)
    data.pop("_id", None)
    data.pop("consultations", None)
    data.pop("bills", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.patients.update_one({"_id": ObjectId(pid)}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    updated = s(await db.patients.find_one({"_id": ObjectId(pid)}))
    return {"success": True, "patient": updated}


@router.delete("/{pid}")
async def delete_patient(pid: str, db=Depends(get_db), user=Depends(get_current_user)):
    result = await db.patients.delete_one({"_id": ObjectId(pid)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True, "message": "Patient deleted"}
