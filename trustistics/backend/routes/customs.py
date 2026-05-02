import hashlib, logging
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from backend.models.schemas import CustomsClearanceCreate, AlertType, EventType
from backend.services.database import shipments, alerts
from backend.services.blockchain_service import blockchain
from backend.services.risk_service import compute_and_save_risk
from backend.utils.response import api_response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Customs"])

def _utcnow(): return datetime.now(timezone.utc)

@router.post("/{shipment_id}/clearance", status_code=201)
def submit_clearance(shipment_id: str, data: CustomsClearanceCreate):
    shipment = shipments.find_one({"shipment_id": shipment_id})
    if not shipment:
        return api_response(success=False, message="Shipment not found", error="Not Found", status_code=404)

    timestamp = _utcnow()
    clearance = data.clearance_status.strip().upper()  # CLEARED / HELD / REJECTED

    # Normalize
    if clearance in ("CLEARED", "CLEAR"):
        clearance = "CLEARED"
    elif clearance in ("HELD", "HOLD"):
        clearance = "HELD"
    elif clearance in ("REJECTED", "REJECT"):
        clearance = "REJECTED"

    # Anchor customs decision to blockchain
    raw = f"{shipment_id}|CUSTOMS|{clearance}|{data.location}|{timestamp.isoformat()}"
    data_hash = "0x" + hashlib.sha256(raw.encode()).hexdigest()
    bc_result = blockchain.anchor_event(shipment_id, "CUSTOMS_CLEARANCE", data_hash)

    # Update shipment
    update_fields = {
        "customs_status": clearance,
        "customs_location": data.location,
        "customs_notes": data.notes,
        "customs_officer": data.officer_name,
        "customs_timestamp": timestamp,
        "customs_tx": bc_result.get("tx_hash"),
        "updated_at": timestamp,
    }

    if clearance == "CLEARED":
        update_fields["status"] = "AT_CUSTOMS"
    elif clearance in ("HELD", "REJECTED"):
        update_fields["status"] = "FLAGGED"
        # Create alert
        alert_type = AlertType.CUSTOMS_HELD if clearance == "HELD" else AlertType.CUSTOMS_REJECTED
        alerts.insert_one({
            "shipment_id": shipment_id,
            "alert_type": alert_type,
            "message": f"Customs {clearance} at {data.location}. {data.notes or ''}".strip(),
            "severity": "CRITICAL" if clearance == "REJECTED" else "HIGH",
            "resolved": False,
            "created_at": timestamp,
        })

    shipments.update_one({"shipment_id": shipment_id}, {"$set": update_fields})

    # Also push a timeline event
    shipments.update_one(
        {"shipment_id": shipment_id},
        {"$push": {"events": {
            "event_type": f"CUSTOMS_{clearance}",
            "timestamp": timestamp,
            "location": data.location,
            "data_hash": data_hash,
            "tx_hash": bc_result.get("tx_hash"),
        }}}
    )

    # Recompute risk
    compute_and_save_risk(shipment_id)

    return api_response(
        success=True,
        message=f"Customs clearance recorded: {clearance}",
        data={
            "shipment_id": shipment_id,
            "clearance_status": clearance,
            "blockchain_tx": bc_result.get("tx_hash"),
            "status": update_fields.get("status"),
        },
        blockchain_ready=blockchain.is_ready,
    )
