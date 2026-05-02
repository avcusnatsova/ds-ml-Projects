from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum

def utcnow():
    return datetime.now(timezone.utc)

class ShipmentStatus(str, Enum):
    CREATED = "CREATED"
    IN_TRANSIT = "IN_TRANSIT"
    IN_STORAGE = "IN_STORAGE"
    AT_CUSTOMS = "AT_CUSTOMS"
    CUSTODY_TRANSFER = "CUSTODY_TRANSFER"
    DELIVERED = "DELIVERED"
    FLAGGED = "FLAGGED"
    REJECTED = "REJECTED"

class GoodsType(str, Enum):
    VACCINE = "vaccine"
    MEDICINE = "medicine"
    DAIRY = "dairy"
    SEAFOOD = "seafood"
    OTHER = "other"

class AlertType(str, Enum):
    TEMPERATURE_BREACH = "TEMPERATURE_BREACH"
    DOCUMENT_TAMPER = "DOCUMENT_TAMPER"
    INCOMPLETE_HANDOFF = "INCOMPLETE_HANDOFF"
    HIGH_RISK_SCORE = "HIGH_RISK_SCORE"
    CUSTOMS_HELD = "CUSTOMS_HELD"
    CUSTOMS_REJECTED = "CUSTOMS_REJECTED"

class EventType(str, Enum):
    GENESIS = "GENESIS"
    DOCUMENT_UPLOAD = "DOCUMENT_UPLOAD"
    CUSTODY_HANDOFF = "CUSTODY_HANDOFF"
    TEMPERATURE_LOG = "TEMPERATURE_LOG"
    VERIFICATION = "VERIFICATION"

class ShipmentCreate(BaseModel):
    shipment_id: str
    product: str
    origin: str
    destination: str
    min_temp_celsius: Optional[float] = 2.0
    max_temp_celsius: Optional[float] = 8.0

class EventCreate(BaseModel):
    event_type: str
    location: Optional[str] = None

class ShipmentStatusUpdate(BaseModel):
    status: ShipmentStatus
    note: Optional[str] = None

class DocumentRecord(BaseModel):
    shipment_id: str
    filename: str
    sha256_hash: str
    file_size: int
    content_type: str
    uploaded_by: str
    blockchain_tx: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=utcnow)

class TemperatureLogCreate(BaseModel):
    temperature_celsius: float
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    logged_by: Optional[str] = "MANUAL"
    source: Optional[str] = "MANUAL"          # "IOT_SENSOR" or "MANUAL"
    device_id: Optional[str] = None
    battery_level: Optional[float] = None
    timestamp: Optional[str] = None           # ISO timestamp from sensor; uses server time if absent

class HandoffCreate(BaseModel):
    from_party: str
    to_party: str
    location: str
    notes: Optional[str] = None
    signed_by: str

class CustomsClearanceCreate(BaseModel):
    location: str
    clearance_status: str  # Cleared / Held / Rejected
    notes: Optional[str] = None
    officer_name: Optional[str] = "Customs Officer"

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str
