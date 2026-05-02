from fastapi import APIRouter, HTTPException, Query
from backend.models.schemas import TemperatureLogCreate, EventCreate
import backend.services.temperature_service as svc
import backend.services.shipment_service as ship_svc
from backend.utils.response import api_response
from backend.services.blockchain_service import blockchain

router = APIRouter(tags=["Tracking"])


# ─── Shipment Events ──────────────────────────────────────────────────────────

@router.post("/shipment/{shipment_id}/event")
def add_event(shipment_id: str, payload: EventCreate):
    result = ship_svc.add_shipment_event(shipment_id, payload.event_type, payload.location)
    if not result.get("success"):
        return api_response(success=False, message="Failed to add event",
                            error=result.get("error"), blockchain_ready=blockchain.is_ready)
    return api_response(success=True, message="Event added", data=result,
                        blockchain_ready=blockchain.is_ready)


@router.get("/shipment/{shipment_id}/timeline")
def get_timeline(shipment_id: str):
    doc = ship_svc.get_shipment(shipment_id)
    if not doc:
        return api_response(success=False, message="Shipment not found",
                            error="Not Found", status_code=404)
    return api_response(success=True, message="Timeline retrieved",
                        data={"shipment_id": shipment_id, "events": doc.get("events", [])})


# ─── Temperature Logging ──────────────────────────────────────────────────────

@router.post("/{shipment_id}/temperature", status_code=201)
def log_temperature(shipment_id: str, data: TemperatureLogCreate):
    """
    Accepts readings from both the IoT simulator and manual driver entry.
    Set data.source = "IOT_SENSOR" for sensor data, "MANUAL" for human input.
    Automatically:
      - hashes the reading and anchors it to blockchain
      - creates a breach alert if temperature is out of range
      - recomputes the spoilage risk score
    """
    record = svc.log_temperature(shipment_id, data)
    if record is None:
        return api_response(success=False, message="Shipment not found",
                            error="Not Found", status_code=404)
    risk = svc.compute_and_save_risk(shipment_id)
    return api_response(
        success=True,
        message="Temperature logged",
        data={**record, "updated_risk": risk},
        blockchain_ready=blockchain.is_ready,
    )


@router.get("/{shipment_id}/temperature")
def get_logs(shipment_id: str, limit: int = Query(200)):
    items = svc.get_temperature_logs(shipment_id, limit=limit)
    return api_response(success=True, message="Temperature logs", data=items)


@router.get("/{shipment_id}/temperature/live")
def get_live(shipment_id: str):
    """
    Returns the single most-recent sensor reading for a shipment.
    Frontend polls this every 30 s to show the live IoT panel.
    """
    doc = svc.get_latest_log(shipment_id)
    if not doc:
        return api_response(success=False, message="No readings yet", data=None)
    return api_response(success=True, message="Live reading", data=doc)


@router.get("/{shipment_id}/temperature/summary")
def get_summary(shipment_id: str):
    summary = svc.get_breach_summary(shipment_id)
    return api_response(success=True, message="Breach summary", data=summary)
