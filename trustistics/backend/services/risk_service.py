import logging
from datetime import datetime, timezone
from backend.services.database import temperature_logs, handoffs, documents, alerts, shipments as shipments_col, audit_logs
from backend.models.schemas import AlertType, GoodsType

logger = logging.getLogger(__name__)
GOODS_RISK = {GoodsType.VACCINE: 1.4, GoodsType.MEDICINE: 1.2, GoodsType.SEAFOOD: 1.1, GoodsType.DAIRY: 1.0, GoodsType.OTHER: 0.9}
HIGH_RISK_THRESHOLD = 70.0
def _utcnow(): return datetime.now(timezone.utc)

def compute_risk(shipment_id: str) -> dict:
    shipment = shipments_col.find_one({"shipment_id": shipment_id})
    if not shipment: return {"score": 0.0, "factors": ["Shipment not found"], "verdict": "UNKNOWN"}
    score = 0.0
    factors = []
    goods_type = shipment.get("goods_type", GoodsType.OTHER)
    multiplier = GOODS_RISK.get(goods_type, 1.0)
    logs = list(temperature_logs.find({"shipment_id": shipment_id}))
    breaches = [l for l in logs if l.get("is_breach")]
    if logs:
        rate = len(breaches) / len(logs)
        score += min(rate * 50, 50)
        if breaches: factors.append(f"{len(breaches)}/{len(logs)} temperature readings breached")
    else:
        score += 10
        factors.append("No temperature data")
    min_t = shipment.get("min_temp_celsius", 2.0)
    max_t = shipment.get("max_temp_celsius", 8.0)
    if breaches:
        worst = max(breaches, key=lambda l: max(min_t - l["temperature_celsius"], l["temperature_celsius"] - max_t, 0))
        dev = max(min_t - worst["temperature_celsius"], worst["temperature_celsius"] - max_t, 0)
        score += min(dev * 5, 20)
        if dev > 0: factors.append(f"Worst deviation: {dev:.1f}°C")
    chain = list(handoffs.find({"shipment_id": shipment_id}))
    gaps = sum(1 for i in range(len(chain)-1) if chain[i]["to_party"] != chain[i+1]["from_party"])
    if gaps: score += min(gaps * 8, 16); factors.append(f"{gaps} custody gap(s)")
    tamper = alerts.count_documents({"shipment_id": shipment_id, "alert_type": AlertType.DOCUMENT_TAMPER})
    if tamper: score += min(tamper * 15, 30); factors.append(f"{tamper} tamper alert(s)")
    score = min(score * multiplier, 100.0)
    if not factors: factors.append("No risk factors identified")
    verdict = "LOW" if score < 31 else ("MEDIUM" if score < 71 else "HIGH")
    return {"shipment_id": shipment_id, "score": round(score, 2), "factors": factors, "verdict": verdict}

def compute_and_save_risk(shipment_id: str) -> dict:
    result = compute_risk(shipment_id)
    shipments_col.update_one({"shipment_id": shipment_id}, {"$set": {"risk_score": result["score"], "updated_at": _utcnow()}})
    if result["score"] > HIGH_RISK_THRESHOLD:
        if not alerts.find_one({"shipment_id": shipment_id, "alert_type": AlertType.HIGH_RISK_SCORE, "resolved": False}):
            alerts.insert_one({"shipment_id": shipment_id, "alert_type": AlertType.HIGH_RISK_SCORE,
                "message": f"Risk score {result['score']}/100 — {'; '.join(result['factors'])}",
                "severity": "CRITICAL", "resolved": False, "created_at": _utcnow()})
    return result
