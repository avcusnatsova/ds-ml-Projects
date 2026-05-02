import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "coldchain")
BLOCKCHAIN_RPC = os.getenv("BLOCKCHAIN_RPC", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")

# This key must never be pushed to GitHub
DEPLOYER_PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY")
if DEPLOYER_PRIVATE_KEY == "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80":
    import logging
    logging.warning("DO NOT use Hardhat default key outside local testing")

CHAIN_ID = int(os.getenv("CHAIN_ID", "31337"))
UPLOAD_DIR = os.path.abspath(os.getenv("UPLOAD_DIR", "./uploads"))
QR_DIR = os.getenv("QR_DIR", "./qrcodes")
RISK_BREACH_THRESHOLD = float(os.getenv("RISK_BREACH_THRESHOLD", "2.0"))
RISK_HIGH_SCORE = float(os.getenv("RISK_HIGH_SCORE", "70.0"))
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(QR_DIR, exist_ok=True)
