import asyncio
import sys
import random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, ".")
from app.core.database import init_db, get_db
from app.utils.auth import hash_password

DOCTORS = [
    {
        "name": "Rajesh Sharma",
        "specialization": "General Medicine",
        "qualification": "MBBS, MD (Gen Medicine)",
        "phone": "9876540001",
        "consultation_fee": 500,
        "schedule": {
            "mon": {"start": "09:00", "end": "17:00"},
            "tue": {"start": "09:00", "end": "17:00"},
            "wed": {"start": "09:00", "end": "17:00"},
            "thu": {"start": "09:00", "end": "17:00"},
            "fri": {"start": "09:00", "end": "17:00"},
            "sat": {"start": "09:00", "end": "13:00"},
        },
    },
    {
        "name": "Priya Patel",
        "specialization": "Pediatrics",
        "qualification": "MBBS, DCH, DNB (Pediatrics)",
        "phone": "9876540002",
        "consultation_fee": 600,
        "schedule": {
            "mon": {"start": "10:00", "end": "18:00"},
            "tue": {"start": "10:00", "end": "18:00"},
            "wed": {"start": "10:00", "end": "18:00"},
            "thu": {"start": "10:00", "end": "18:00"},
            "fri": {"start": "10:00", "end": "18:00"},
            "sat": {"start": "10:00", "end": "14:00"},
        },
    },
    {
        "name": "Suresh Iyer",
        "specialization": "Dermatology",
        "qualification": "MBBS, DD, DNB (Dermatology)",
        "phone": "9876540003",
        "consultation_fee": 700,
        "schedule": {
            "mon": {"start": "11:00", "end": "18:00"},
            "tue": {"start": "11:00", "end": "18:00"},
            "wed": {"start": "11:00", "end": "18:00"},
            "thu": {"start": "11:00", "end": "18:00"},
            "fri": {"start": "11:00", "end": "18:00"},
            "sat": {"start": "11:00", "end": "15:00"},
        },
    },
]

PATIENTS = [
    {"name": "Aarav Mehta", "age": 35, "gender": "Male", "phone": "9876543001", "blood_group": "O+", "allergies": ["Penicillin"], "address": "12, MG Road, New Delhi"},
    {"name": "Diya Kapoor", "age": 28, "gender": "Female", "phone": "9876543002", "blood_group": "A+", "allergies": [], "address": "45, Nehru Nagar, Mumbai"},
    {"name": "Vihaan Reddy", "age": 45, "gender": "Male", "phone": "9876543003", "blood_group": "B+", "allergies": ["Sulfa drugs"], "address": "78, Jubilee Hills, Hyderabad"},
    {"name": "Ananya Nair", "age": 22, "gender": "Female", "phone": "9876543004", "blood_group": "AB+", "allergies": [], "address": "23, Indiranagar, Bangalore"},
    {"name": "Arjun Desai", "age": 55, "gender": "Male", "phone": "9876543005", "blood_group": "O-", "allergies": ["Aspirin"], "address": "67, SG Highway, Ahmedabad"},
    {"name": "Ishita Gupta", "age": 30, "gender": "Female", "phone": "9876543006", "blood_group": "A-", "allergies": [], "address": "34, Civil Lines, Jaipur"},
    {"name": "Kabir Singh", "age": 8, "gender": "Male", "phone": "9876543007", "blood_group": "B+", "allergies": ["Dust"], "address": "89, Sector 17, Chandigarh"},
    {"name": "Myra Joshi", "age": 65, "gender": "Female", "phone": "9876543008", "blood_group": "O+", "allergies": ["Ibuprofen"], "address": "56, Koregaon Park, Pune"},
    {"name": "Reyansh Verma", "age": 40, "gender": "Male", "phone": "9876543009", "blood_group": "A+", "allergies": [], "address": "12, Gomti Nagar, Lucknow"},
    {"name": "Saanvi Pillai", "age": 18, "gender": "Female", "phone": "9876543010", "blood_group": "B-", "allergies": [], "address": "45, Marine Drive, Kochi"},
    {"name": "Dhruv Kumar", "age": 50, "gender": "Male", "phone": "9876543011", "blood_group": "AB-", "allergies": ["Codeine"], "address": "78, Rajendra Nagar, Patna"},
    {"name": "Kiara Sharma", "age": 25, "gender": "Female", "phone": "9876543012", "blood_group": "O+", "allergies": [], "address": "23, Banjara Hills, Hyderabad"},
    {"name": "Aditya Rao", "age": 33, "gender": "Male", "phone": "9876543013", "blood_group": "A+", "allergies": [], "address": "67, Whitefield, Bangalore"},
    {"name": "Navya Iyer", "age": 42, "gender": "Female", "phone": "9876543014", "blood_group": "B+", "allergies": ["Latex"], "address": "34, Adyar, Chennai"},
    {"name": "Vivaan Bhat", "age": 12, "gender": "Male", "phone": "9876543015", "blood_group": "O+", "allergies": [], "address": "89, Panaji, Goa"},
]

CONSULTATIONS_DATA = [
    {"symptoms": ["Fever", "Headache", "Body ache"], "diagnosis": "Viral Fever", "prescriptions": [
        {"medicine": "Paracetamol 500mg", "dosage": "1 tablet", "frequency": "Three times daily", "duration": "5 days", "instructions": "After meals"},
        {"medicine": "Vitamin C 500mg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "10 days", "instructions": "After breakfast"},
    ]},
    {"symptoms": ["Cough", "Sore throat", "Runny nose"], "diagnosis": "Common Cold (Upper Respiratory Infection)", "prescriptions": [
        {"medicine": "Cetirizine 10mg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "5 days", "instructions": "At bedtime"},
        {"medicine": "Cough Syrup (Dextromethorphan)", "dosage": "10ml", "frequency": "Three times daily", "duration": "5 days", "instructions": "After meals"},
        {"medicine": "Paracetamol 500mg", "dosage": "1 tablet", "frequency": "As needed", "duration": "3 days", "instructions": "For fever above 100F"},
    ]},
    {"symptoms": ["Stomach pain", "Nausea", "Acidity"], "diagnosis": "Acute Gastritis", "prescriptions": [
        {"medicine": "Omeprazole 20mg", "dosage": "1 capsule", "frequency": "Once daily", "duration": "14 days", "instructions": "Before breakfast on empty stomach"},
        {"medicine": "Antacid Syrup (Aluminium Hydroxide)", "dosage": "15ml", "frequency": "Three times daily", "duration": "7 days", "instructions": "After meals"},
    ]},
    {"symptoms": ["Joint pain", "Stiffness", "Swelling"], "diagnosis": "Osteoarthritis", "prescriptions": [
        {"medicine": "Diclofenac 50mg", "dosage": "1 tablet", "frequency": "Twice daily", "duration": "7 days", "instructions": "After meals with plenty of water"},
        {"medicine": "Calcium + Vitamin D3", "dosage": "1 tablet", "frequency": "Once daily", "duration": "30 days", "instructions": "After dinner"},
    ]},
    {"symptoms": ["Skin rash", "Itching", "Redness"], "diagnosis": "Allergic Dermatitis", "prescriptions": [
        {"medicine": "Cetirizine 10mg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "7 days", "instructions": "At bedtime"},
        {"medicine": "Calamine Lotion", "dosage": "Apply thin layer", "frequency": "Three times daily", "duration": "10 days", "instructions": "On affected areas"},
    ]},
    {"symptoms": ["Fatigue", "Weakness", "Dizziness"], "diagnosis": "Iron Deficiency Anemia", "prescriptions": [
        {"medicine": "Iron Supplement (Ferrous Sulphate 200mg)", "dosage": "1 tablet", "frequency": "Once daily", "duration": "90 days", "instructions": "With orange juice, empty stomach"},
        {"medicine": "Vitamin B12 1500mcg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "30 days", "instructions": "After breakfast"},
        {"medicine": "Folic Acid 5mg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "30 days", "instructions": "After breakfast"},
    ]},
    {"symptoms": ["Frequent urination", "Burning sensation", "Lower abdominal pain"], "diagnosis": "Urinary Tract Infection", "prescriptions": [
        {"medicine": "Nitrofurantoin 100mg", "dosage": "1 capsule", "frequency": "Twice daily", "duration": "5 days", "instructions": "With food"},
        {"medicine": "Paracetamol 500mg", "dosage": "1 tablet", "frequency": "As needed", "duration": "3 days", "instructions": "For pain relief"},
    ]},
    {"symptoms": ["Cough", "Shortness of breath", "Chest tightness"], "diagnosis": "Acute Bronchitis", "prescriptions": [
        {"medicine": "Amoxicillin 500mg", "dosage": "1 capsule", "frequency": "Three times daily", "duration": "7 days", "instructions": "After meals"},
        {"medicine": "Cough Syrup (Guaifenesin)", "dosage": "10ml", "frequency": "Three times daily", "duration": "5 days", "instructions": "After meals"},
        {"medicine": "Vitamin D3 60000IU", "dosage": "1 sachet", "frequency": "Once weekly", "duration": "4 weeks", "instructions": "With milk"},
    ]},
    {"symptoms": ["Ear pain", "Hearing difficulty", "Discharge"], "diagnosis": "Otitis Media (Middle Ear Infection)", "prescriptions": [
        {"medicine": "Amoxicillin 250mg", "dosage": "1 capsule", "frequency": "Three times daily", "duration": "7 days", "instructions": "After meals"},
        {"medicine": "Ear Drops (Ciprofloxacin)", "dosage": "3 drops", "frequency": "Twice daily", "duration": "7 days", "instructions": "In affected ear"},
        {"medicine": "Paracetamol 500mg", "dosage": "1 tablet", "frequency": "As needed", "duration": "3 days", "instructions": "For pain"},
    ]},
    {"symptoms": ["Runny nose", "Sneezing", "Watery eyes"], "diagnosis": "Allergic Rhinitis", "prescriptions": [
        {"medicine": "Cetirizine 10mg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "14 days", "instructions": "At bedtime"},
        {"medicine": "Nasal Spray (Fluticasone)", "dosage": "2 sprays each nostril", "frequency": "Once daily", "duration": "14 days", "instructions": "In the morning"},
    ]},
]

TIME_SLOTS = ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
              "11:00", "11:15", "11:30", "11:45", "12:00", "14:00", "14:15", "14:30",
              "15:00", "15:15", "15:30", "16:00", "16:15", "16:30", "17:00"]


async def seed():
    await init_db()
    db = await get_db()

    if await db.patients.count_documents({}) > 0:
        print("Data already exists, skipping seed.")
        return

    # Create doctors
    doctor_ids = []
    for doc_data in DOCTORS:
        result = await db.doctors.insert_one({
            **doc_data,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        doctor_ids.append(str(result.inserted_id))
    print(f"Created {len(doctor_ids)} doctors")

    # Create patients
    patient_ids = []
    for p in PATIENTS:
        result = await db.patients.insert_one({
            **p,
            "emergency_contact": {"name": "Family Contact", "phone": f"98765{random.randint(10000, 99999)}", "relation": random.choice(["Spouse", "Parent", "Sibling"])},
            "medical_history": random.choice(["", "No significant history", "Hypertension", "Diabetes Type 2", "Asthma in childhood"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        patient_ids.append(str(result.inserted_id))
    print(f"Created {len(patient_ids)} patients")

    # Create 20 appointments over 7 days
    now = datetime.now(timezone.utc)
    appt_ids = []
    statuses_pool = ["completed"] * 10 + ["scheduled"] * 5 + ["cancelled"] * 3 + ["no_show"] * 2
    for i in range(20):
        day_offset = random.randint(0, 6)
        appt_date = now - timedelta(days=day_offset)
        date_str = appt_date.strftime("%Y-%m-%d")
        time_slot = random.choice(TIME_SLOTS)
        pid = random.choice(patient_ids)
        did = random.choice(doctor_ids)
        status = statuses_pool[i] if i < len(statuses_pool) else "scheduled"

        patient = await db.patients.find_one({"_id": __import__("bson").ObjectId(pid)})
        doctor = await db.doctors.find_one({"_id": __import__("bson").ObjectId(did)})

        result = await db.appointments.insert_one({
            "patient_id": pid,
            "doctor_id": did,
            "date": date_str,
            "time_slot": time_slot,
            "status": status,
            "notes": random.choice(["", "Follow-up visit", "First consultation", "Routine checkup"]),
            "patient_name": patient["name"] if patient else "",
            "doctor_name": doctor["name"] if doctor else "",
            "created_at": appt_date.isoformat(),
        })
        appt_ids.append({"id": str(result.inserted_id), "pid": pid, "did": did, "status": status, "date": date_str})
    print(f"Created {len(appt_ids)} appointments")

    # Create 10 consultations for completed appointments
    completed_appts = [a for a in appt_ids if a["status"] == "completed"]
    for i, appt in enumerate(completed_appts[:10]):
        c_data = CONSULTATIONS_DATA[i % len(CONSULTATIONS_DATA)]

        patient = await db.patients.find_one({"_id": __import__("bson").ObjectId(appt["pid"])})
        doctor = await db.doctors.find_one({"_id": __import__("bson").ObjectId(appt["did"])})

        await db.consultations.insert_one({
            "appointment_id": appt["id"],
            "patient_id": appt["pid"],
            "doctor_id": appt["did"],
            "symptoms": c_data["symptoms"],
            "diagnosis": c_data["diagnosis"],
            "vitals": {
                "bp": f"{random.randint(110, 140)}/{random.randint(70, 90)}",
                "temperature": round(random.uniform(97.5, 100.5), 1),
                "pulse": random.randint(65, 95),
                "weight": random.randint(45, 90),
                "spo2": random.randint(95, 99),
            },
            "prescriptions": c_data["prescriptions"],
            "notes": random.choice(["", "Follow up after 1 week", "Advised rest for 3 days", "Blood test recommended"]),
            "patient_name": patient["name"] if patient else "",
            "doctor_name": doctor["name"] if doctor else "",
            "created_at": appt["date"] + "T10:30:00+00:00",
        })
    print(f"Created {min(10, len(completed_appts))} consultations")

    # Create 10 bills
    for i, appt in enumerate(completed_appts[:10]):
        doctor = await db.doctors.find_one({"_id": __import__("bson").ObjectId(appt["did"])})
        patient = await db.patients.find_one({"_id": __import__("bson").ObjectId(appt["pid"])})
        fee = doctor.get("consultation_fee", 500) if doctor else 500
        items = [{"description": "Consultation Fee", "amount": fee}]
        if random.random() > 0.5:
            items.append({"description": "Lab Test", "amount": random.choice([200, 300, 500, 800])})
        if random.random() > 0.7:
            items.append({"description": "X-Ray", "amount": random.choice([500, 800, 1200])})
        total = sum(item["amount"] for item in items)
        bill_number = f"BILL-{appt['date'].replace('-', '')}-{i + 1:04d}"

        await db.bills.insert_one({
            "bill_number": bill_number,
            "patient_id": appt["pid"],
            "patient_name": patient["name"] if patient else "",
            "patient_phone": patient.get("phone", "") if patient else "",
            "appointment_id": appt["id"],
            "items": items,
            "total": total,
            "payment_method": random.choice(["cash", "card", "upi"]),
            "status": "paid",
            "created_at": appt["date"] + "T11:00:00+00:00",
        })
    print(f"Created {min(10, len(completed_appts))} bills")
    print("Seed complete!")


asyncio.run(seed())
