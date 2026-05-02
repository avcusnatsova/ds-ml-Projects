import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from backend.config import MONGO_URI, BLOCKCHAIN_RPC, CONTRACT_ADDRESS
from backend.services.database import ensure_indexes
from backend.routes import (shipments_router, documents_router, tracking_router,
    handoffs_router, alerts_router, verification_router, analytics_router, customs_router)
from backend.routes.shipments import shipment_router
from backend.routes.health import router as health_router
from backend.routes.auth import router as auth_router
from backend.routes.weather import router as weather_router


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ColdChain backend starting…")
    ensure_indexes()
    logger.info("Indexes ensured")
    yield

app = FastAPI(title="ColdChain Provenance API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy Routes (Backward Compatibility)
app.include_router(shipment_router)
app.include_router(shipments_router, prefix="/api/shipments")
app.include_router(documents_router, prefix="/api/documents")
app.include_router(tracking_router, prefix="/api/tracking")
app.include_router(handoffs_router, prefix="/api/handoffs")
app.include_router(alerts_router, prefix="/api/alerts")
app.include_router(verification_router, prefix="/api/verify")
app.include_router(analytics_router, prefix="/api/analytics")
app.include_router(customs_router, prefix="/api/customs")
app.include_router(health_router, prefix="/health")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(weather_router, prefix="/api/weather")

# API V1 Routes (Production)

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(shipment_router)
api_v1.include_router(shipments_router, prefix="/shipments")
api_v1.include_router(documents_router, prefix="/documents")
api_v1.include_router(tracking_router, prefix="/tracking")
api_v1.include_router(handoffs_router, prefix="/handoffs")
api_v1.include_router(alerts_router, prefix="/alerts")
api_v1.include_router(verification_router, prefix="/verify")
api_v1.include_router(analytics_router, prefix="/analytics")
api_v1.include_router(customs_router, prefix="/customs")
api_v1.include_router(health_router, prefix="/health")
api_v1.include_router(auth_router, prefix="/auth")
app.include_router(api_v1)
