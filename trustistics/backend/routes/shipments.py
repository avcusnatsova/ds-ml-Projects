from fastapi import APIRouter, HTTPException, Query
from backend.models.schemas import ShipmentCreate, ShipmentStatusUpdate
import backend.services.shipment_service as svc
from backend.utils.response import api_response
from backend.services.blockchain_service import blockchain

shipment_router = APIRouter(tags=["Shipment API"])

@shipment_router.post("/shipment/create")
def create_shipment_api(payload: ShipmentCreate):
    try:
        data = svc.create_shipment(payload)
        return api_response(
            success=True,
            message="Shipment created successfully",
            data=data,
            blockchain_ready=blockchain.is_ready
        )
    except Exception as e:
        return api_response(
            success=False,
            message="Failed to create shipment",
            error=str(e),
            blockchain_ready=blockchain.is_ready
        )

router = APIRouter(tags=["Shipments"])

@router.post("/", status_code=201)
def original_create_shipment(data: ShipmentCreate):
    res = svc.create_shipment(data)
    return api_response(success=True, message="Created", data=res, blockchain_ready=blockchain.is_ready)

@router.get("/")
def list_shipments(status: str = Query(None), goods_type: str = Query(None), limit: int = Query(50)):
    items = svc.list_shipments(status=status, goods_type=goods_type, limit=limit)
    return api_response(success=True, message="Shipment list", data=items)

@router.get("/{shipment_id}")
def get_shipment(shipment_id: str):
    doc = svc.get_shipment(shipment_id)
    if not doc:
        return api_response(success=False, message="Not found", error="Shipment not found", status_code=404)
    return api_response(success=True, message="Retrieved", data=doc)

@router.patch("/{shipment_id}/status")
def update_status(shipment_id: str, body: ShipmentStatusUpdate):
    doc = svc.update_status(shipment_id, body.status, body.note)
    if not doc:
        return api_response(success=False, message="Not found", error="Shipment not found", status_code=404)
    return api_response(success=True, message="Updated", data=doc)
