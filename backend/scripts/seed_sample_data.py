import asyncio, sys, random
from datetime import datetime, timezone, timedelta
sys.path.insert(0, ".")
from app.core.database import init_db, get_db
from app.utils.auth import hash_password

DOCTORS = [
    ("Dr. Sharma", "General Medicine", "MBBS, MD", 500),
    ("Dr. Patel", "Pediatrics", "MBBS, DCH", 600),
    ("Dr. Iyer", "Dermatology", "MBBS, DD", 700),
]
PATIENTS = [
    ("Aarav Mehta", 35, "male", "9876543001", "O+"), ("Diya Kapoor", 28, "female", "9876543002", "A+"),
    ("Vihaan Reddy", 45, "male", "9876543003", "B+"), ("Ananya Nair", 22, "female", "9876543004", "AB+"),
    ("Arjun Desai", 55, "male", "9876543005", "O-"), ("Ishita Gupta", 30, "female", "9876543006", "A-"),
    ("Kabir Singh", 8, "male", "9876543007", "B+"), ("Myra Joshi", 65, "female", "9876543008", "O+"),
    ("Reyansh Verma", 40, "male", "9876543009", "A+"), ("Saanvi Pillai", 18, "female", "9876543010", "B-"),
    ("Dhruv Kumar", 50, "male", "9876543011", "AB-"), ("Kiara Sharma", 25, "female", "9876543012", "O+"),
    ("Aditya Rao", 33, "male", "9876543013", "A+"), ("Navya Iyer", 42, "female", "9876543014", "B+"),
    ("Vivaan Bhat", 12, "male", "9876543015", "O+"),
]
MEDS = [
    ("Paracetamol 500mg", "1 tablet", "Twice daily", "5 days", "After meals"),
    ("Vitamin D3 1000IU", "1 capsule", "Once daily", "30 days", "With breakfast"),
    ("Antacid Syrup", "10ml", "Thrice daily", "7 days", "Before meals"),
    ("Iron Supplement", "1 tablet", "Once daily", "30 days", "With orange juice"),
    ("Cough Syrup", "5ml", "Thrice daily", "5 days", "After meals"),
    ("Antihistamine 10mg", "1 tablet", "Once daily", "7 days", "At bedtime"),
]

async def seed():
    await init_db()
    db = await get_db()
    if await db.patients.count_documents({}) > 0:
        print("Data exists"); return

    doctor_ids = []
    for name, spec, qual, fee in DOCTORS:
        r = await db.users.insert_one({"email": f"{name.lower().replace('. ', '').replace(' ', '')}@clinic.local", "password_hash": hash_password("doctor123"), "name": name, "role": "doctor", "is_active": True})
        await db.doctors.insert_one({"user_id": str(r.inserted_id), "name": name, "specialization": spec, "qualification": qual, "consultation_fee": fee, "phone": f"987654{random.randint(1000,9999)}", "is_active": True})
        doctor_ids.append(str(r.inserted_id))

    patient_ids = []
    for name, age, gender, phone, blood in PATIENTS:
        r = await db.patients.insert_one({"name": name, "age": age, "gender": gender, "phone": phone, "blood_group": blood, "allergies": [], "medical_history": "", "created_at": datetime.now(timezone.utc)})
        patient_ids.append(str(r.inserted_id))

    now = datetime.now(timezone.utc)
    statuses = ["completed"] * 10 + ["scheduled"] * 5 + ["cancelled"] * 3 + ["no_show"] * 2
    for i in range(20):
        day_off = random.randint(0, 6)
        d = now - timedelta(days=day_off)
        slot = f"{random.randint(9,16)}:{random.choice(['00','15','30','45'])}"
        pid = random.choice(patient_ids)
        did = random.choice(doctor_ids)
        st = statuses[i] if i < len(statuses) else "scheduled"
        await db.appointments.insert_one({"patient_id": pid, "doctor_id": did, "date": d.strftime("%Y-%m-%d"), "time_slot": slot, "status": st, "created_at": d})

        if st == "completed":
            symptoms = random.sample(["Fever", "Headache", "Cough", "Back pain", "Fatigue", "Nausea", "Joint pain", "Skin rash"], 2)
            diag = random.choice(["Viral fever", "Migraine", "Common cold", "Muscle strain", "Allergic reaction", "Gastritis"])
            presc = [dict(zip(["medicine","dosage","frequency","duration","instructions"], random.choice(MEDS))) for _ in range(random.randint(1, 3))]
            await db.consultations.insert_one({
                "patient_id": pid, "doctor_id": did, "symptoms": symptoms, "diagnosis": diag,
                "vitals": {"bp": f"{random.randint(110,140)}/{random.randint(70,90)}", "temperature": round(random.uniform(97.5, 100.5), 1), "pulse": random.randint(65, 95), "weight": random.randint(45, 90)},
                "prescriptions": presc, "notes": "", "created_at": d,
            })

    print(f"Seeded: {len(DOCTORS)} doctors, {len(PATIENTS)} patients, 20 appointments, consultations")

asyncio.run(seed())
