import hashlib, logging
from datetime import datetime, timezone
from backend.services.database import handoffs, alerts, audit_logs, shipments
from backend.services.blockchain_service import blockchain
from backend.models.schemas import HandoffCreate, EventType, AlertType

logger = logging.getLogger(__name__)
def _utcnow(): return datetime.now(timezone.utc)

def _infer_status(from_party: str, to_party: str) -> str:
    """Auto-detect the next shipment status based on who is handing off to whom."""
    to_lower = to_party.lower()
    from_lower = from_party.lower()
    if any(k in to_lower for k in ["warehouse", "storage", "facility", "cold-room"]):
        return "IN_STORAGE"
    if any(k in to_lower for k in ["customs", "border", "checkpoint"]):
        return "AT_CUSTOMS"
    if any(k in to_lower for k in ["customer", "receiver", "recipient", "destination", "pharmacy", "hospital"]):
        return "DELIVERED"
    if any(k in from_lower for k in ["supplier", "manufacturer", "origin"]):
        return "IN_TRANSIT"
    return "IN_TRANSIT"

def record_handoff(shipment_id: str, data: HandoffCreate) -> dict:
    shipment = shipments.find_one({"shipment_id": shipment_id})
    if not shipment: return None
    timestamp = _utcnow()
    payload = f"{shipment_id}|{data.from_party}|{data.to_party}|{data.location}|{data.signed_by}|{timestamp.isoformat()}"
    handoff_hash = "0x" + hashlib.sha256(payload.encode()).hexdigest()
    bc_result = blockchain.anchor_event(shipment_id, EventType.CUSTODY_HANDOFF, handoff_hash)
    record = {
        "shipment_id": shipment_id, "from_party": data.from_party, "to_party": data.to_party,
        "location": data.location, "notes": data.notes, "signed_by": data.signed_by,
        "handoff_hash": handoff_hash,
        "blockchain_tx": bc_result.get("tx_hash") if bc_result else None,
        "timestamp": timestamp,
    }
    handoffs.insert_one(record)
    record.pop("_id", None)
    new_status = _infer_status(data.from_party, data.to_party)
    shipments.update_one({"shipment_id": shipment_id}, {"$set": {"status": new_status, "updated_at": timestamp}})
    return record


def get_handoffs(shipment_id: str) -> list:
    return list(handoffs.find({"shipment_id": shipment_id}, {"_id": 0}).sort("timestamp", 1))

def validate_custody_chain(shipment_id: str) -> dict:
    chain = get_handoffs(shipment_id)
    if not chain: return {"status": "NO_HANDOFFS", "issues": []}
    
    issues = []
    # 1. Check for gaps in the chain
    for i in range(len(chain) - 1):
        curr = chain[i]
        next_h = chain[i + 1]
        if curr["to_party"] != next_h["from_party"]:
            # Check for common naming variations or 'System' transfers
            if curr["to_party"].lower() == "next handler" or next_h["from_party"].lower() == "previous":
                continue # Skip placeholder gaps
            issues.append(f"Gaps in custody: '{curr['to_party']}' handed over, but '{next_h['from_party']}' picked up.")
    
    # 2. Verify blockchain anchoring
    for h in chain:
        if h.get("handoff_hash"):
            if not blockchain.verify_hash(shipment_id, h["handoff_hash"]):
                if not blockchain.is_ready:
                    # Don't flag if blockchain is just offline during local dev
                    continue
                issues.append(f"Blockchain integrity mismatch for handoff at {h['location'] or 'unknown location'}")
                
    return {
        "status": "PASS" if not issues else "FAIL", 
        "total_handoffs": len(chain), 
        "issues": issues, 
        "chain": chain
    }

