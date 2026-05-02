from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import backend.services.document_service as svc
from backend.services.risk_service import compute_and_save_risk
from backend.utils.response import api_response
from backend.services.blockchain_service import blockchain

router = APIRouter(tags=["Documents"])

@router.post("/{shipment_id}/upload", status_code=201)
async def upload_document(shipment_id: str, uploaded_by: str = Form(...), file: UploadFile = File(...)):
    raw = await file.read()
    if not raw:
        return api_response(success=False, message="Empty file", error="Bad Request", status_code=400)
    data = svc.upload_document(shipment_id, file.filename, file.content_type or "application/octet-stream", raw, uploaded_by)
    # Recompute risk if document volume changes
    compute_and_save_risk(shipment_id)
    return api_response(success=True, message="Document uploaded", data=data, blockchain_ready=blockchain.is_ready)

@router.get("/{shipment_id}")
def list_documents(shipment_id: str):
    data = svc.get_documents(shipment_id)
    return api_response(success=True, message="Document list", data=data)

@router.post("/{shipment_id}/verify/{doc_hash}")
def verify_document(shipment_id: str, doc_hash: str):
    data = svc.verify_document(shipment_id, doc_hash)
    # Recompute risk because verification might have triggered a DOCUMENT_TAMPER alert
    compute_and_save_risk(shipment_id)
    return api_response(success=True, message="Verification result", data=data, blockchain_ready=blockchain.is_ready)

@router.post("/{shipment_id}/verify-all")
def verify_all(shipment_id: str):
    data = svc.verify_all_documents(shipment_id)
    # Recompute risk because verification might have triggered DOCUMENT_TAMPER alerts
    compute_and_save_risk(shipment_id)
    return api_response(success=True, message="Full verification result", data=data, blockchain_ready=blockchain.is_ready)
