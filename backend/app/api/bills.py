from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/bills", tags=["bills"])


def serialize(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/")
async def create_bill(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    patient = await db.patients.find_one({"_id": ObjectId(data["patient_id"])})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    items = data.get("items", [])
    total = sum(float(item.get("amount", 0)) for item in items)

    # Generate bill number
    count = await db.bills.count_documents({})
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    bill_number = f"BILL-{today_str}-{count + 1:04d}"

    bill = {
        "bill_number": bill_number,
        "patient_id": data["patient_id"],
        "patient_name": patient["name"],
        "patient_phone": patient.get("phone", ""),
        "appointment_id": data.get("appointment_id", ""),
        "items": items,
        "total": total,
        "payment_method": data.get("payment_method", "cash"),
        "status": "paid",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.bills.insert_one(bill)
    bill["id"] = str(result.inserted_id)
    return {"success": True, "bill": bill}


@router.get("/")
async def list_bills(db=Depends(get_db), user=Depends(get_current_user)):
    docs = await db.bills.find().sort("created_at", -1).to_list(500)
    return {"success": True, "bills": [serialize(d) for d in docs]}


@router.get("/today")
async def today_bills(db=Depends(get_db), user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    docs = await db.bills.find({"created_at": {"$regex": f"^{today}"}}).sort("created_at", -1).to_list(200)
    return {"success": True, "bills": [serialize(d) for d in docs]}


@router.get("/stats")
async def bill_stats(db=Depends(get_db), user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_bills = await db.bills.count_documents({})
    today_bills_docs = await db.bills.find({"created_at": {"$regex": f"^{today}"}}).to_list(200)
    today_revenue = sum(b.get("total", 0) for b in today_bills_docs)

    all_bills = await db.bills.find().to_list(5000)
    total_revenue = sum(b.get("total", 0) for b in all_bills)

    # Revenue by payment method
    by_method = {}
    for b in all_bills:
        m = b.get("payment_method", "cash")
        by_method[m] = by_method.get(m, 0) + b.get("total", 0)

    return {
        "success": True,
        "stats": {
            "total_bills": total_bills,
            "total_revenue": total_revenue,
            "today_revenue": today_revenue,
            "by_payment_method": by_method,
        },
    }


@router.get("/{bill_id}")
async def get_bill(bill_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    doc = await db.bills.find_one({"_id": ObjectId(bill_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"success": True, "bill": serialize(doc)}


@router.get("/receipt/{bill_id}")
async def bill_receipt(bill_id: str, db=Depends(get_db)):
    doc = await db.bills.find_one({"_id": ObjectId(bill_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Bill not found")

    settings_docs = await db.settings.find().to_list(20)
    sm = {d["key"]: d["value"] for d in settings_docs}
    clinic_name = sm.get("clinic_name", "MediCare Clinic")
    clinic_address = sm.get("clinic_address", "")
    clinic_phone = sm.get("clinic_phone", "")

    from datetime import datetime as dt
    date_str = dt.fromisoformat(doc["created_at"]).strftime("%d %b %Y, %I:%M %p")

    rows = ""
    for i, item in enumerate(doc.get("items", []), 1):
        rows += f"""<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">{i}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">{item.get('description','')}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">&#8377;{item.get('amount',0):,.2f}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Receipt - {doc.get('bill_number','')}</title>
<style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }}
    .header {{ text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 15px; }}
    .header h1 {{ color: #1e40af; margin: 0; font-size: 22px; }}
    .header p {{ margin: 2px 0; font-size: 12px; color: #666; }}
    .meta {{ display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    .total {{ text-align: right; font-size: 18px; font-weight: bold; color: #1e40af; margin-top: 15px; padding-top: 10px; border-top: 2px solid #1e40af; }}
    .footer {{ text-align: center; margin-top: 30px; font-size: 11px; color: #999; }}
    @media print {{ body {{ margin: 0; }} }}
</style></head><body>
<div class="header">
    <h1>{clinic_name}</h1>
    <p>{clinic_address}</p>
    <p>Phone: {clinic_phone}</p>
    <p style="margin-top:8px;font-weight:bold;font-size:14px;">RECEIPT</p>
</div>
<div class="meta">
    <div><strong>Bill No:</strong> {doc.get('bill_number','')}<br><strong>Date:</strong> {date_str}</div>
    <div><strong>Patient:</strong> {doc.get('patient_name','')}<br><strong>Payment:</strong> {doc.get('payment_method','cash').title()}</div>
</div>
<table>
    <tr style="background:#f8fafc;"><th style="padding:8px;text-align:left;">S.No</th><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Amount</th></tr>
    {rows}
</table>
<div class="total">Total: &#8377;{doc.get('total',0):,.2f}</div>
<div class="footer">
    <p>Thank you for your visit!</p>
    <p>This is a computer-generated receipt</p>
</div>
</body></html>"""
    return HTMLResponse(content=html)
