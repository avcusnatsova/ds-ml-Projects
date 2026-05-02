from fastapi import APIRouter, Query
import backend.services.analytics_service as svc
from backend.utils.response import api_response

router = APIRouter(tags=["Analytics"])

@router.get("/summary")
def get_summary():
    data = svc.get_summary()
    return api_response(success=True, message="Analytics summary", data=data)

@router.get("/flagged")
def get_flagged():
    data = svc.get_flagged_shipments()
    return api_response(success=True, message="Flagged shipments", data=data)

@router.get("/audit/{shipment_id}")
def get_audit(shipment_id: str, limit: int = Query(100)):
    data = svc.get_audit_trail(shipment_id, limit=limit)
    return api_response(success=True, message=f"Audit trail for {shipment_id}", data=data)
