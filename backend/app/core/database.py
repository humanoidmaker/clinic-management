from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = None
db = None

async def get_db():
    return db

async def init_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_name = settings.MONGODB_URI.rsplit("/", 1)[-1].split("?")[0] or "clinic_mgmt"
    db = client[db_name]
    # Indexes
    await db.patients.create_index("phone", unique=True)
    await db.appointments.create_index([("date", 1), ("doctor_id", 1)])
    await db.consultations.create_index("patient_id")
    await db.doctors.create_index("phone")
    await db.bills.create_index("patient_id")
    await db.users.create_index("email", unique=True)
    # Seed settings
    if not await db.settings.find_one({"key": "clinic_name"}):
        await db.settings.insert_many([
            {"key": "clinic_name", "value": "MediCare Clinic"},
            {"key": "clinic_address", "value": "456 Health Avenue, Medical District, New Delhi - 110001"},
            {"key": "clinic_phone", "value": "+91 98765 43210"},
            {"key": "appointment_duration", "value": "15"},
            {"key": "working_hours", "value": "09:00-18:00"},
        ])

    # Email settings defaults
    email_defaults = [
        {"key": "smtp_host", "value": ""},
        {"key": "smtp_port", "value": "587"},
        {"key": "smtp_user", "value": ""},
        {"key": "smtp_pass", "value": ""},
        {"key": "smtp_from", "value": ""},
        {"key": "email_verification_enabled", "value": "true"},
        {"key": "email_welcome_enabled", "value": "true"},
        {"key": "email_password_reset_enabled", "value": "true"},
        {"key": "email_password_changed_enabled", "value": "true"},
        {"key": "require_email_verification", "value": "false"},
    ]
    for d in email_defaults:
        await db.settings.update_one({"key": d["key"]}, {"$setOnInsert": d}, upsert=True)

