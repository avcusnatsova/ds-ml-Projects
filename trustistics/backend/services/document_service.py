import hashlib, logging
from datetime import datetime, timezone
from pathlib import Path
from backend.services.database import documents, alerts, audit_logs
from backend.services.blockchain_service import blockchain
from backend.models.schemas import EventType, AlertType
from backend.config import UPLOAD_DIR

logger = logging.getLogger(__name__)
def _utcnow(): return datetime.now(timezone.utc)
def _sha256(data: bytes) -> str: return "0x" + hashlib.sha256(data).hexdigest()

def upload_document(shipment_id, filename, content_type, raw_bytes, uploaded_by) -> dict:
    file_hash = _sha256(raw_bytes)
    dest_dir = Path(UPLOAD_DIR) / shipment_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(raw_bytes)
    bc_result = blockchain.anchor_event(shipment_id, EventType.DOCUMENT_UPLOAD, file_hash)
    doc = {
        "shipment_id": shipment_id, "filename": filename,
        "sha256_hash": file_hash, "file_size": len(raw_bytes),
        "content_type": content_type, "uploaded_by": uploaded_by,
        "file_path": str(dest_path),
        "blockchain_tx": bc_result.get("tx_hash") if bc_result else None,
        "uploaded_at": _utcnow(),
    }
    documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

def get_documents(shipment_id: str) -> list:
    return list(documents.find({"shipment_id": shipment_id}, {"_id": 0}))

def verify_document(shipment_id: str, doc_hash: str) -> dict:
    print(f"DEBUG: Verifying Shipment: {shipment_id}, Hash: {doc_hash}")
    record = documents.find_one({"shipment_id": shipment_id, "sha256_hash": doc_hash})
    
    if not record:
        # Check if maybe the shipment_id is the issue
        any_doc = documents.find_one({"sha256_hash": doc_hash})
        if any_doc:
            print(f"DEBUG: Hash found but for DIFFERENT shipment: {any_doc['shipment_id']}")
        else:
            print(f"DEBUG: Hash {doc_hash} not found in DB at all.")
        return {"verified": False, "reason": "Not found in Database", "db_match": False, "blockchain_match": False}

    file_path = Path(record["file_path"])
    print(f"DEBUG: Looking for file at: {file_path}")
    
    if not file_path.exists():
        fallback_path = Path(UPLOAD_DIR) / shipment_id / record["filename"]
        print(f"DEBUG: Primary path missing. Trying fallback: {fallback_path}")
        if fallback_path.exists():
            file_path = fallback_path
        else:
            return {"verified": False, "reason": f"File not found on disk at {file_path}", "db_match": True, "blockchain_match": False}
    recomputed = _sha256(file_path.read_bytes())
    db_match = recomputed == record["sha256_hash"]
    bc_match = blockchain.verify_hash(shipment_id, doc_hash)
    
    verified = db_match and bc_match
    if not verified:
        alerts.insert_one({
            "shipment_id": shipment_id, 
            "alert_type": AlertType.DOCUMENT_TAMPER,
            "message": f"Tampering detected in {record['filename']}! Fingerprint mismatch.",
            "severity": "CRITICAL", 
            "resolved": False, 
            "created_at": _utcnow(),
        })
        
    return {"verified": verified, "filename": record["filename"],
            "stored_hash": record["sha256_hash"], "recomputed_hash": recomputed,
            "db_match": db_match, "blockchain_match": bc_match}

def verify_all_documents(shipment_id: str) -> dict:
    docs = get_documents(shipment_id)
    if not docs: return {"status": "NO_DOCUMENTS", "results": []}
    results = [verify_document(shipment_id, d["sha256_hash"]) for d in docs]
    all_ok = all(r["verified"] for r in results)
    return {"status": "PASS" if all_ok else "FAIL", "total": len(docs),
            "passed": sum(1 for r in results if r["verified"]),
            "failed": sum(1 for r in results if not r["verified"]), "results": results}
