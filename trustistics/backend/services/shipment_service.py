import uuid, hashlib, qrcode, logging
from datetime import datetime, timezone
from pathlib import Path
from .database import shipments, audit_logs
from .blockchain_service import blockchain
from ..models.schemas import ShipmentCreate, ShipmentStatus, EventType
from ..config import QR_DIR

logger = logging.getLogger(__name__)

def _utcnow(): return datetime.now(timezone.utc)
def _shipment_id(): return "SHP-" + uuid.uuid4().hex[:10].upper()

def create_shipment(payload: ShipmentCreate) -> dict:
    # 2. Create deterministic hash using: shipment_id + product + origin + destination
    raw_str = f"{payload.shipment_id}{payload.product}{payload.origin}{payload.destination}"
    data_hash = "0x" + hashlib.sha256(raw_str.encode()).hexdigest()
    
    # 3. Call blockchain_service.anchor_event()
    bc_result = blockchain.anchor_event(
        shipment_id=payload.shipment_id,
        event_type="CREATED",
        data_hash=data_hash
    )
    
    # 1. Insert shipment into MongoDB collection "shipments"
    doc = {
        "shipment_id": payload.shipment_id,
        "product": payload.product,
        "origin": payload.origin,
        "destination": payload.destination,
        "min_temp_celsius": payload.min_temp_celsius,
        "max_temp_celsius": payload.max_temp_celsius,
        "status": "CREATED",
        "customs_status": None,
        "data_hash": data_hash,
        "blockchain_tx": bc_result.get("tx_hash"),
        "created_at": _utcnow(),
        "events": [{
            "event_type": "CREATED",
            "timestamp": _utcnow(),
            "location": payload.origin,
            "data_hash": data_hash,
            "tx_hash": bc_result.get("tx_hash")
        }]
    }
    
    try:
        shipments.insert_one(doc.copy())
        logger.info(f"✔ MongoDB insert success for shipment {payload.shipment_id}")
    except Exception as e:
        logger.error(f"✖ MongoDB insert failed: {e}")
        raise e
    
    # 4. Return combined response
    return {
        "shipment_id": payload.shipment_id,
        "db_status": "success",
        "blockchain_tx": bc_result.get("tx_hash"),
        "block_number": bc_result.get("block_number"),
        "data_hash": data_hash,
        "blockchain_ready": blockchain.is_ready,
        "blockchain_error": bc_result.get("error") if not bc_result.get("success") else None
    }


def list_shipments(status=None, goods_type=None, limit=50) -> list:
    query = {}
    if status: query["status"] = status
    if goods_type: query["goods_type"] = goods_type
    return list(shipments.find(query, {"_id": 0}).sort("created_at", -1).limit(limit))

def get_shipment(sid: str) -> dict:
    doc = shipments.find_one({"shipment_id": sid}, {"_id": 0})
    return doc

def update_status(sid: str, status: ShipmentStatus, note: str = None) -> dict:
    result = shipments.find_one_and_update(
        {"shipment_id": sid},
        {"$set": {"status": status, "updated_at": _utcnow()}},
        return_document=True,
    )
    if result: result.pop("_id", None)
    return result

def update_risk_score(sid: str, score: float):
    shipments.update_one({"shipment_id": sid}, {"$set": {"risk_score": score, "updated_at": _utcnow()}})

def add_shipment_event(shipment_id: str, event_type: str, location: str = None) -> dict:
    timestamp = _utcnow()
    raw_str = f"{shipment_id}{event_type}{location or ''}"
    data_hash = "0x" + hashlib.sha256(raw_str.encode()).hexdigest()
    
    bc_result = blockchain.anchor_event(
        shipment_id=shipment_id,
        event_type=event_type,
        data_hash=data_hash
    )
        
    event_doc = {
        "event_type": event_type,
        "timestamp": timestamp,
        "location": location,
        "data_hash": data_hash,
        "tx_hash": bc_result.get("tx_hash")
    }
    
    try:
        result = shipments.update_one(
            {"shipment_id": shipment_id},
            {"$push": {"events": event_doc}, "$set": {"updated_at": timestamp}}
        )
        if result.matched_count == 0:
            logger.error(f"✖ MongoDB update failed: Shipment {shipment_id} not found")
            return {
                "success": False,
                "shipment_id": shipment_id,
                "event_type": event_type,
                "mongo_status": "failed",
                "blockchain_success": bc_result.get("success", False),
                "tx_hash": bc_result.get("tx_hash"),
                "error": "Shipment not found"
            }
        logger.info(f"✔ MongoDB event append success for shipment {shipment_id}")
    except Exception as e:
        logger.error(f"✖ MongoDB event append failed: {e}")
        return {
            "success": False,
            "shipment_id": shipment_id,
            "event_type": event_type,
            "mongo_status": "failed",
            "blockchain_success": bc_result.get("success", False),
            "tx_hash": bc_result.get("tx_hash"),
            "error": str(e)
        }
        
    return {
        "success": True,
        "shipment_id": shipment_id,
        "event_type": event_type,
        "mongo_status": "success",
        "blockchain_success": bc_result.get("success", False),
        "tx_hash": bc_result.get("tx_hash"),
        "error": bc_result.get("error") if not bc_result.get("success") else None
    }
