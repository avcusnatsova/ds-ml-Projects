import logging
from datetime import datetime, timezone
from backend.services.document_service import verify_all_documents
from backend.services.handoff_service import validate_custody_chain
from backend.services.temperature_service import get_breach_summary
from backend.services.risk_service import compute_and_save_risk
from backend.services.database import shipments, audit_logs

logger = logging.getLogger(__name__)
def _utcnow(): return datetime.now(timezone.utc)

def full_verify(shipment_id: str) -> dict:
    shipment = shipments.find_one({"shipment_id": shipment_id}, {"_id": 0})
    if not shipment: return {"verdict": "ERROR", "reason": "Shipment not found"}
    reasons = []
    checks = {}
    doc_result = verify_all_documents(shipment_id)
    if doc_result["status"] == "NO_DOCUMENTS":
        # No documents is perfectly fine — not a flag
        checks["document_check"] = "NO_DOCUMENTS"
    elif doc_result["status"] == "FAIL":
        # Only flag if documents exist AND they are tampered
        checks["document_check"] = "FAIL"
        reasons.append(f"{doc_result['failed']} document(s) failed hash/blockchain verification — possible tampering")
    else:
        checks["document_check"] = "PASS"

    custody = validate_custody_chain(shipment_id)
    if custody["status"] == "NO_HANDOFFS":
        # No handoffs yet is fine — shipment may just have been created
        checks["custody_check"] = "NO_HANDOFFS"
    elif custody["status"] == "FAIL":
        # Only flag on actual gaps/mismatches in an existing chain
        checks["custody_check"] = "FAIL"
        for issue in custody["issues"]: reasons.append(f"Custody: {issue}")
    else:
        checks["custody_check"] = "PASS"

    temp = get_breach_summary(shipment_id)
    if temp["breach_count"] > 0:
        checks["temperature_check"] = "BREACH_DETECTED"
        reasons.append(f"{temp['breach_count']} temperature breach(es) detected by sensor")
    elif temp["total_readings"] == 0:
        # No readings yet — IoT simulator not started; informational only
        checks["temperature_check"] = "NO_DATA"
    else:
        checks["temperature_check"] = "PASS"

    risk = compute_and_save_risk(shipment_id)
    if risk["score"] > 70: reasons.append(f"Risk score {risk['score']}/100 (HIGH)")

    # FLAGGED only when there is real evidence of tampering or breach
    verdict = "FLAGGED" if any([
        checks.get("document_check") == "FAIL",   # tampered documents
        checks.get("custody_check") == "FAIL",    # broken custody chain
        checks.get("temperature_check") == "BREACH_DETECTED",  # temp breach
        risk["score"] > 70,
    ]) else "APPROVED"

    # Fetch real records for the public verify page
    from backend.services.database import temperature_logs, documents as docs_col, handoffs as handoffs_col, alerts as alerts_col
    real_handoffs = list(handoffs_col.find({"shipment_id": shipment_id}, {"_id": 0}).sort("timestamp", 1))
    all_logs = list(temperature_logs.find({"shipment_id": shipment_id}, {"_id": 0}).sort("logged_at", 1))
    all_docs = list(docs_col.find({"shipment_id": shipment_id}, {"_id": 0}))
    climate_alerts = list(alerts_col.find({"shipment_id": shipment_id, "alert_type": "Climate Risk"}, {"_id": 0}))

    return {
        "shipment_id": shipment_id, 
        "verdict": verdict, 
        "reasons": reasons or ["All checks passed"],
        "document_check": checks.get("document_check"), 
        "custody_check": checks.get("custody_check"),
        "temperature_check": checks.get("temperature_check"), 
        "risk_score": risk["score"],
        "verified_at": _utcnow().isoformat(),
        # Shipment status fields
        "status": shipment.get("status", "CREATED"),
        "customs_status": shipment.get("customs_status"),
        "customs_location": shipment.get("customs_location"),
        "customs_notes": shipment.get("customs_notes"),
        "customs_officer": shipment.get("customs_officer"),
        # Added for Public Verify page
        "product": shipment.get("product"),
        "origin": shipment.get("origin"),
        "destination": shipment.get("destination"),
        "createdAt": shipment.get("created_at"),
        "safeMinTemp": shipment.get("min_temp_celsius", 2.0),
        "safeMaxTemp": shipment.get("max_temp_celsius", 8.0),
        "overallStatus": verdict.lower(),
        "spoilageRisk": risk["score"],
        "documents": [{"name": d["filename"], "hash": d["sha256_hash"], "verified": True} for d in all_docs],
        "handoffs": [
            {
                "role": h.get("from_party", "Handler"), 
                "handler": h.get("signed_by", "System"), 
                "timestamp": h["timestamp"], 
                "location": h.get("location"), 
                "blockchainTx": h.get("blockchain_tx"),
                "to_party": h.get("to_party")
            } for h in real_handoffs
        ],
        "temperatureLogs": [{"timestamp": l["logged_at"].strftime("%H:%M") if l.get("logged_at") else "??:??", "temperature": l["temperature_celsius"]} for l in all_logs],
        "flagReasons": reasons,
        "climate_alerts": climate_alerts
    }



