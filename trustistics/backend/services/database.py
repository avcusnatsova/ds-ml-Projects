from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from backend.config import MONGO_URI, DB_NAME

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

shipments = db["shipments"]
documents = db["documents"]
temperature_logs = db["temperature_logs"]
handoffs = db["handoffs"]
alerts = db["alerts"]
audit_logs = db["audit_logs"]
blockchain_events = db["blockchain_events"]
users = db["users"]

def ensure_indexes():
    shipments.create_index([("shipment_id", ASCENDING)], unique=True)
    shipments.create_index([("status", ASCENDING)])
    documents.create_index([("shipment_id", ASCENDING)])
    documents.create_index([("sha256_hash", ASCENDING)])
    temperature_logs.create_index([("shipment_id", ASCENDING), ("logged_at", DESCENDING)])
    handoffs.create_index([("shipment_id", ASCENDING), ("timestamp", ASCENDING)])
    alerts.create_index([("shipment_id", ASCENDING), ("resolved", ASCENDING)])
    audit_logs.create_index([("shipment_id", ASCENDING), ("timestamp", DESCENDING)])
    users.create_index([("email", ASCENDING)], unique=True)
