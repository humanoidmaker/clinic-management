from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, patients, doctors, appointments, consultations, bills, settings as settings_api


@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield


app = FastAPI(title="MediCare Clinic API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(consultations.router)
app.include_router(bills.router)
app.include_router(settings_api.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "MediCare Clinic"}


@app.get("/api/stats")
async def stats():
    from app.core.database import get_db as gdb
    from datetime import datetime, timezone
    db = await gdb()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    total_patients = await db.patients.count_documents({})
    today_appointments = await db.appointments.count_documents({"date": today})
    total_doctors = await db.doctors.count_documents({"is_active": True})
    total_consultations = await db.consultations.count_documents({})

    # Today revenue
    today_bills = await db.bills.find({"created_at": {"$regex": f"^{today}"}}).to_list(500)
    today_revenue = sum(b.get("total", 0) for b in today_bills)

    # Total revenue
    all_bills = await db.bills.find().to_list(5000)
    total_revenue = sum(b.get("total", 0) for b in all_bills)

    # Appointment status breakdown
    scheduled = await db.appointments.count_documents({"status": "scheduled"})
    completed = await db.appointments.count_documents({"status": "completed"})
    cancelled = await db.appointments.count_documents({"status": "cancelled"})
    in_progress = await db.appointments.count_documents({"status": "in_progress"})
    no_show = await db.appointments.count_documents({"status": "no_show"})

    # Recent appointments for today
    recent = await db.appointments.find({"date": today}).sort("time_slot", 1).to_list(10)
    for r in recent:
        r["id"] = str(r.pop("_id"))
        if r.get("patient_id"):
            try:
                from bson import ObjectId
                p = await db.patients.find_one({"_id": ObjectId(r["patient_id"])})
                r["patient_name"] = p["name"] if p else "Unknown"
            except Exception:
                r["patient_name"] = "Unknown"
        if r.get("doctor_id"):
            try:
                from bson import ObjectId
                d = await db.doctors.find_one({"_id": ObjectId(r["doctor_id"])})
                r["doctor_name"] = d["name"] if d else "Unknown"
            except Exception:
                r["doctor_name"] = "Unknown"

    return {
        "success": True,
        "stats": {
            "total_patients": total_patients,
            "today_appointments": today_appointments,
            "total_doctors": total_doctors,
            "total_consultations": total_consultations,
            "today_revenue": today_revenue,
            "total_revenue": total_revenue,
            "appointment_status": {
                "scheduled": scheduled,
                "in_progress": in_progress,
                "completed": completed,
                "cancelled": cancelled,
                "no_show": no_show,
            },
            "upcoming_appointments": recent,
        },
    }
