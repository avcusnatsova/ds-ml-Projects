from typing import Any, Optional
from datetime import datetime, timezone
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

def api_response(
    success: bool,
    message: str,
    data: Any = None,
    error: Any = None,
    mongo_status: bool = True,
    blockchain_ready: bool = True,
    status_code: int = 200
) -> JSONResponse:
    """
    Standard envelope format for all API returns across Trustistics.
    Returns a FastAPI JSONResponse with the specified status code.
    Uses jsonable_encoder to handle non-standard types like datetime or ObjectId.
    """
    content = {
        "success": success,
        "message": message,
        "data": data,
        "error": error,
        "meta": {
            "mongodb": mongo_status,
            "blockchain": blockchain_ready,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    return JSONResponse(content=jsonable_encoder(content), status_code=status_code)
