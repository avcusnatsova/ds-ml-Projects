from fastapi import APIRouter, HTTPException
import backend.services.verification_service as svc
import backend.services.risk_service as risk_svc
from backend.utils.response import api_response
from backend.services.blockchain_service import blockchain

router = APIRouter(tags=["Verification"])

@router.get("/{shipment_id}")
def full_verify(shipment_id: str):
    result = svc.full_verify(shipment_id)
    if result.get("verdict") == "ERROR":
        return api_response(success=False, message="Verification failed", error=result.get("reason"), blockchain_ready=blockchain.is_ready)
    return api_response(success=True, message="Verification complete", data=result, blockchain_ready=blockchain.is_ready)

@router.get("/{shipment_id}/risk")
def get_risk(shipment_id: str):
    data = risk_svc.compute_and_save_risk(shipment_id)
    return api_response(success=True, message="Risk score computed", data=data)
