from fastapi import APIRouter, HTTPException
from backend.models.schemas import HandoffCreate
import backend.services.handoff_service as svc
from backend.services.risk_service import compute_and_save_risk
from backend.utils.response import api_response
from backend.services.blockchain_service import blockchain

router = APIRouter(tags=["Handoffs"])

@router.post("/{shipment_id}", status_code=201)
def record_handoff(shipment_id: str, data: HandoffCreate):
    record = svc.record_handoff(shipment_id, data)
    if record is None:
        return api_response(success=False, message="Shipment not found", error="Not Found", status_code=404)
    
    # Recompute risk score as custody chain has changed
    compute_and_save_risk(shipment_id)
    
    return api_response(success=True, message="Handoff recorded", data=record, blockchain_ready=blockchain.is_ready)

@router.get("/{shipment_id}")
def get_handoffs(shipment_id: str):
    data = svc.get_handoffs(shipment_id)
    return api_response(success=True, message="Handoff logs", data=data)

@router.get("/{shipment_id}/validate")
def validate(shipment_id: str):
    data = svc.validate_custody_chain(shipment_id)
    return api_response(success=True, message="Custody chain validation", data=data)
