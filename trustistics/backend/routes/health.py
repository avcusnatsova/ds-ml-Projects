from fastapi import APIRouter
from backend.services.database import client
from backend.services.blockchain_service import blockchain
from backend.utils.response import api_response

router = APIRouter(tags=["Health Checks"])

@router.get("")
def health_status():
    return api_response(
        success=True,
        message="Backend is fully operational",
        data={"status": "online"},
        blockchain_ready=blockchain.is_ready
    )

@router.get("/db")
def health_db():
    try:
        client.admin.command('ping')
        return api_response(
            success=True,
            message="MongoDB is reachable",
            data={"connected": True},
            mongo_status=True,
            blockchain_ready=blockchain.is_ready
        )
    except Exception as e:
        return api_response(
            success=False,
            message="MongoDB unreachable",
            error=str(e),
            mongo_status=False,
            blockchain_ready=blockchain.is_ready
        )

@router.get("/blockchain")
def health_blockchain():
    is_ready = blockchain.is_ready
    return api_response(
        success=is_ready,
        message="Blockchain securely connected" if is_ready else "Blockchain unready or disconnected",
        data={"rpc_connected": blockchain._connected},
        error=None if is_ready else "Missing Contract or RPC variables",
        blockchain_ready=is_ready
    )
