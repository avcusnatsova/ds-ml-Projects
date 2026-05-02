import hashlib
import logging
from datetime import datetime, timezone
from backend.services.database import temperature_logs, shipments, alerts
from backend.models.schemas import TemperatureLogCreate, AlertType
from backend.services.blockchain_service import blockchain

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


def _parse_timestamp(ts_str: str | None) -> datetime:
    """Use provided ISO timestamp (from IoT sensor) or fall back to server time."""
    if ts_str:
        try:
            return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            pass
    return _utcnow()


def _risk_score(temp_vals: list[float], safe_min: float, safe_max: float) -> int:
    """Rule-based risk score from historical temperature logs."""
    if not temp_vals:
        return 5
    breaches = [t for t in temp_vals if t < safe_min or t > safe_max]
    ratio = len(breaches) / len(temp_vals)
    if ratio == 0:
        return 5
    elif ratio < 0.1:
        return 30
    elif ratio < 0.3:
        return 60
    elif ratio < 0.5:
        return 80
    return 95


def log_temperature(shipment_id: str, data: TemperatureLogCreate) -> dict | None:
    shipment = shipments.find_one({"shipment_id": shipment_id})
    if not shipment:
        return None

    safe_min = shipment.get("min_temp_celsius", 2.0)
    safe_max = shipment.get("max_temp_celsius", 8.0)
    is_breach = not (safe_min <= data.temperature_celsius <= safe_max)
    logged_at = _parse_timestamp(data.timestamp)
    source = data.source or "MANUAL"

    # ── Build log record ──────────────────────────────────────────────
    log = {
        "shipment_id":      shipment_id,
        "temperature_celsius": data.temperature_celsius,
        "location":         data.location,
        "latitude":         data.latitude,
        "longitude":        data.longitude,
        "logged_by":        data.logged_by or source,
        "source":           source,
        "device_id":        data.device_id,
        "battery_level":    data.battery_level,
        "logged_at":        logged_at,
        "is_breach":        is_breach,
        "safe_min":         safe_min,
        "safe_max":         safe_max,
    }

    # ── Blockchain: hash + anchor ─────────────────────────────────────
    hash_input = f"{shipment_id}:{data.temperature_celsius}:{logged_at.isoformat()}"
    data_hash = "0x" + hashlib.sha256(hash_input.encode()).hexdigest()
    bc_result = blockchain.anchor_event(shipment_id, "TEMP_LOG", data_hash)
    log["blockchain_tx"] = bc_result.get("tx_hash") if bc_result.get("success") else None

    temperature_logs.insert_one(log)
    log.pop("_id", None)

    # ── Auto-alert on breach ──────────────────────────────────────────
    if is_breach:
        alerts.insert_one({
            "shipment_id": shipment_id,
            "alert_type":  AlertType.TEMPERATURE_BREACH,
            "message": (
                f"Temperature {data.temperature_celsius}°C breached safe range "
                f"({safe_min}°C to {safe_max}°C)"
            ),
            "severity":   "HIGH",
            "source":     source,
            "device_id":  data.device_id,
            "location":   data.location,
            "resolved":   False,
            "created_at": logged_at,
        })
        logger.warning(
            "🚨 Breach on %s: %.1f°C [%s]",
            shipment_id, data.temperature_celsius, source
        )

    return log


def get_temperature_logs(shipment_id: str, limit: int = 200) -> list:
    return list(
        temperature_logs
        .find({"shipment_id": shipment_id}, {"_id": 0})
        .sort("logged_at", -1)
        .limit(limit)
    )


def get_latest_log(shipment_id: str) -> dict | None:
    """Returns the single most-recent log — used by /live endpoint."""
    doc = (
        temperature_logs
        .find_one({"shipment_id": shipment_id}, {"_id": 0}, sort=[("logged_at", -1)])
    )
    return doc


def get_breach_summary(shipment_id: str) -> dict:
    all_logs = list(temperature_logs.find({"shipment_id": shipment_id}, {"_id": 0}))
    breaches = [l for l in all_logs if l.get("is_breach")]
    if not all_logs:
        return {"total_readings": 0, "breach_count": 0, "breach_rate": 0.0}
    return {
        "total_readings": len(all_logs),
        "breach_count":   len(breaches),
        "breach_rate":    round(len(breaches) / len(all_logs) * 100, 2),
        "breaches":       breaches,
    }


def compute_and_save_risk(shipment_id: str) -> int:
    """Recalculate and persist spoilage risk score based on all logs."""
    shipment = shipments.find_one({"shipment_id": shipment_id})
    if not shipment:
        return 0

    safe_min = shipment.get("min_temp_celsius", 2.0)
    safe_max = shipment.get("max_temp_celsius", 8.0)
    all_logs = list(temperature_logs.find({"shipment_id": shipment_id}, {"temperature_celsius": 1, "_id": 0}))
    temps = [l["temperature_celsius"] for l in all_logs]
    score = _risk_score(temps, safe_min, safe_max)

    shipments.update_one({"shipment_id": shipment_id}, {"$set": {"risk_score": score}})
    logger.info("Risk score for %s updated → %d", shipment_id, score)
    return score
