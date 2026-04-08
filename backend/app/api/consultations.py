from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/consultations", tags=["consultations"])


def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/")
async def create_consultation(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    if data.get("appointment_id"):
        appt = await db.appointments.find_one({"_id": ObjectId(data["appointment_id"])})
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")

    patient = await db.patients.find_one({"_id": ObjectId(data["patient_id"])})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = await db.doctors.find_one({"_id": ObjectId(data["doctor_id"])})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    consultation = {
        "appointment_id": data.get("appointment_id", ""),
        "patient_id": data["patient_id"],
        "doctor_id": data["doctor_id"],
        "symptoms": data.get("symptoms", []),
        "diagnosis": data.get("diagnosis", ""),
        "vitals": data.get("vitals", {}),
        "prescriptions": data.get("prescriptions", []),
        "notes": data.get("notes", ""),
        "patient_name": patient["name"],
        "doctor_name": doctor["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.consultations.insert_one(consultation)
    consultation["id"] = str(result.inserted_id)

    if data.get("appointment_id"):
        await db.appointments.update_one(
            {"_id": ObjectId(data["appointment_id"])},
            {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )

    return {"success": True, "consultation": consultation}


@router.get("/{cid}")
async def get_consultation(cid: str, db=Depends(get_db), user=Depends(get_current_user)):
    doc = await db.consultations.find_one({"_id": ObjectId(cid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return {"success": True, "consultation": s(doc)}


@router.get("/patient/{pid}")
async def patient_history(pid: str, db=Depends(get_db), user=Depends(get_current_user)):
    docs = await db.consultations.find({"patient_id": pid}).sort("created_at", -1).to_list(200)
    return {"success": True, "consultations": [s(d) for d in docs]}


@router.get("/prescription/{cid}")
async def print_prescription(cid: str, db=Depends(get_db)):
    doc = await db.consultations.find_one({"_id": ObjectId(cid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Consultation not found")

    settings_docs = await db.settings.find().to_list(20)
    sm = {d["key"]: d["value"] for d in settings_docs}
    clinic_name = sm.get("clinic_name", "MediCare Clinic")
    clinic_address = sm.get("clinic_address", "")
    clinic_phone = sm.get("clinic_phone", "")

    patient = await db.patients.find_one({"_id": ObjectId(doc["patient_id"])})
    doctor = await db.doctors.find_one({"_id": ObjectId(doc["doctor_id"])})

    vitals = doc.get("vitals", {})
    vitals_parts = []
    if vitals.get("bp"):
        vitals_parts.append(f"BP: {vitals['bp']} mmHg")
    if vitals.get("temperature"):
        vitals_parts.append(f"Temp: {vitals['temperature']}&deg;F")
    if vitals.get("pulse"):
        vitals_parts.append(f"Pulse: {vitals['pulse']} bpm")
    if vitals.get("weight"):
        vitals_parts.append(f"Weight: {vitals['weight']} kg")
    if vitals.get("spo2"):
        vitals_parts.append(f"SpO2: {vitals['spo2']}%")
    vitals_html = " &bull; ".join(vitals_parts)

    rx_rows = ""
    for i, rx in enumerate(doc.get("prescriptions", []), 1):
        rx_rows += f"""<tr>
            <td style="padding:6px;border:1px solid #ddd;text-align:center;">{i}</td>
            <td style="padding:6px;border:1px solid #ddd;">{rx.get('medicine','')}</td>
            <td style="padding:6px;border:1px solid #ddd;">{rx.get('dosage','')}</td>
            <td style="padding:6px;border:1px solid #ddd;">{rx.get('frequency','')}</td>
            <td style="padding:6px;border:1px solid #ddd;">{rx.get('duration','')}</td>
            <td style="padding:6px;border:1px solid #ddd;">{rx.get('instructions','')}</td>
        </tr>"""

    symptoms_str = ", ".join(doc.get("symptoms", []))
    created = doc.get("created_at", "")
    if isinstance(created, str):
        try:
            date_str = datetime.fromisoformat(created).strftime("%d %b %Y, %I:%M %p")
        except Exception:
            date_str = str(created)
    else:
        date_str = created.strftime("%d %b %Y, %I:%M %p") if created else ""

    p_name = patient["name"] if patient else "N/A"
    p_age = patient.get("age", "") if patient else ""
    p_gender = patient.get("gender", "") if patient else ""
    p_phone = patient.get("phone", "") if patient else ""
    d_name = doctor["name"] if doctor else "N/A"
    d_spec = doctor.get("specialization", "") if doctor else ""
    d_qual = doctor.get("qualification", "") if doctor else ""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Prescription</title>
<style>
body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }}
.header {{ text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px; }}
.header h1 {{ color: #1e40af; margin: 0; font-size: 24px; }}
.header p {{ margin: 3px 0; font-size: 13px; color: #666; }}
.info {{ display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 12px; border-radius: 6px; }}
.info div {{ font-size: 13px; }}
.info strong {{ color: #1e40af; }}
.section {{ margin-bottom: 15px; }}
.section-title {{ font-weight: bold; color: #1e40af; font-size: 14px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }}
table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
th {{ background: #1e40af; color: white; padding: 8px; text-align: left; }}
.signature {{ text-align: right; margin-top: 50px; }}
.signature-line {{ border-top: 1px solid #333; display: inline-block; width: 200px; padding-top: 5px; }}
.footer {{ margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #666; }}
@media print {{ body {{ margin: 0; }} }}
</style></head><body>
<div class="header">
    <h1>{clinic_name}</h1>
    <p>{clinic_address}</p>
    <p>Phone: {clinic_phone}</p>
</div>
<div class="info">
    <div><strong>Patient:</strong> {p_name}<br><strong>Age/Gender:</strong> {p_age} / {p_gender}<br><strong>Phone:</strong> {p_phone}</div>
    <div><strong>Doctor:</strong> Dr. {d_name}<br><strong>Specialization:</strong> {d_spec}<br><strong>Date:</strong> {date_str}</div>
</div>
{f'<div class="section"><div class="section-title">Vitals</div><p style="font-size:13px;">{vitals_html}</p></div>' if vitals_html else ''}
{f'<div class="section"><div class="section-title">Symptoms</div><p style="font-size:13px;">{symptoms_str}</p></div>' if symptoms_str else ''}
{f'<div class="section"><div class="section-title">Diagnosis</div><p style="font-size:13px;">{doc.get("diagnosis","")}</p></div>' if doc.get("diagnosis") else ''}
<div class="section">
    <div class="section-title">Prescription (Rx)</div>
    <table><tr><th style="width:40px;">S.No</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>{rx_rows}</table>
</div>
{f'<div class="section"><div class="section-title">Notes</div><p style="font-size:13px;">{doc.get("notes","")}</p></div>' if doc.get("notes") else ''}
<div class="signature"><div class="signature-line">Dr. {d_name}<br>{d_qual}</div></div>
<div class="footer"><span>Generated by {clinic_name}</span><span>Computer-generated prescription</span></div>
</body></html>"""
    return HTMLResponse(content=html)
