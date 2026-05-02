from datetime import datetime, timezone
from backend.services.database import shipments, temperature_logs, handoffs, documents, alerts, audit_logs

def _utcnow(): return datetime.now(timezone.utc)

def get_summary() -> dict:
    total = shipments.count_documents({})
    by_status = {s["_id"]: s["count"] for s in shipments.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}])}
    avg = list(shipments.aggregate([{"$group": {"_id": None, "avg": {"$avg": "$risk_score"}}}]))
    return {"shipments": {"total": total, "by_status": by_status, "average_risk_score": round(avg[0]["avg"], 2) if avg else 0.0},
            "documents": {"total": documents.count_documents({})},
            "temperature": {"total_breaches": temperature_logs.count_documents({"is_breach": True})},
            "alerts": {"total": alerts.count_documents({}), "unresolved": alerts.count_documents({"resolved": False})},
            "generated_at": _utcnow().isoformat()}

def get_audit_trail(shipment_id: str, limit: int = 100) -> list:
    return list(audit_logs.find({"shipment_id": shipment_id}, {"_id": 0}).sort("timestamp", -1).limit(limit))

def get_flagged_shipments() -> list:
    return list(shipments.find({"$or": [{"status": "FLAGGED"}, {"risk_score": {"$gt": 70}}]}, {"_id": 0}).sort("risk_score", -1).limit(50))
