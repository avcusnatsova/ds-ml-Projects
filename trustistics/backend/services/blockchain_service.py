import json
import hashlib
import logging
from pathlib import Path
from typing import Optional
from web3 import Web3

from ..config import BLOCKCHAIN_RPC, CONTRACT_ADDRESS, DEPLOYER_PRIVATE_KEY, CHAIN_ID

logger = logging.getLogger(__name__)

# ABI from your ColdChainProvenance.sol contract
ABI_PATH = Path(__file__).parent.parent.parent / "blockchain" / "artifacts" / "contracts" / "ColdChainProvenance.sol" / "ColdChainProvenance.json"


class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_RPC))
        self.contract = None
        self.account = None
        self._connected = False
        self._init()

    def _init(self):
        if not self.w3.is_connected():
            logger.warning("Blockchain node not reachable — running in offline mode")
            return

        self._connected = True

        # Load wallet
        if DEPLOYER_PRIVATE_KEY:
            self.account = self.w3.eth.account.from_key(DEPLOYER_PRIVATE_KEY)

        # Load contract
        if CONTRACT_ADDRESS:
            if ABI_PATH.exists():
                artifact = json.loads(ABI_PATH.read_text())
                self.contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
                    abi=artifact["abi"]
                )
                logger.info("✔ Blockchain connected + contract loaded")
            else:
                logger.error("✖ ABI missing - run npx hardhat compile")
                self.contract = None

    @property
    def is_ready(self):
        return self._connected and self.contract is not None and self.account is not None

    # ----------------------------
    # Utility
    # ----------------------------

    def sha256_hex(self, data: str) -> str:
        return "0x" + hashlib.sha256(data.encode()).hexdigest()

    def bytes32(self, hex_str: str) -> bytes:
        clean = hex_str.replace("0x", "")[:64].ljust(64, "0")
        return bytes.fromhex(clean)

    # ----------------------------
    # WRITE → Blockchain
    # ----------------------------

    def add_status(self, product_id: str, status: str) -> dict:
        """
        Writes shipment status to blockchain using addStatus()
        """
        if not self.is_ready:
            logger.error("✖ Blockchain not ready")
            return {"success": False, "error": "Blockchain unready", "blockchain_ready": False}

        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            tx = self.contract.functions.addStatus(
                product_id,
                status
            ).build_transaction({
                "chainId": CHAIN_ID,
                "gas": 300000,
                "gasPrice": self.w3.eth.gas_price,
                "nonce": nonce,
                "from": self.account.address,
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)

            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            logger.info(f"✔ Blockchain add_status success: tx {receipt.transactionHash.hex()}")
            return {
                "success": True,
                "tx_hash": receipt.transactionHash.hex(),
                "block_number": receipt.blockNumber,
                "blockchain_ready": True
            }

        except Exception as e:
            logger.error(f"✖ add_status failed: {e}")
            return {"success": False, "error": str(e), "blockchain_ready": True}

    # ----------------------------
    # READ → Blockchain
    # ----------------------------

    def get_history(self, product_id: str) -> list:
        """
        Reads shipment history from blockchain
        """
        if not self.is_ready:
            return []

        try:
            raw = self.contract.functions.getHistory(product_id).call()

            return [
                {
                    "product_id": r[0],
                    "status": r[1],
                    "timestamp": r[2],
                }
                for r in raw
            ]

        except Exception as e:
            logger.error("get_history failed: %s", e)
            return []

    # ----------------------------
    # VERIFY (optional helper)
    # ----------------------------

    def verify_data(self, data: str) -> str:
        """
        Creates hash for integrity checking
        """
        return self.sha256_hex(data)

    def verify_hash(self, shipment_id: str, data_hash: str) -> bool:
        """
        Checks if a hash exists on the blockchain for a given shipment
        """
        if not self.is_ready:
            logger.warning("Blockchain not ready — cannot verify hash")
            return False

        try:
            result = self.contract.functions.verifyHash(
                shipment_id,
                self.bytes32(data_hash)
            ).call()
            return result
        except Exception as e:
            logger.error(f"verify_hash failed: {e}")
            return False


    def anchor_event(self, shipment_id: str, event_type: str, data_hash: str) -> dict:
        """
        Anchors an event to the blockchain using anchorEvent()
        """
        if not self.is_ready:
            logger.error("✖ Blockchain not ready")
            return {"success": False, "error": "Blockchain unready", "blockchain_ready": False}

        try:
            from ..config import CHAIN_ID
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            tx = self.contract.functions.anchorEvent(
                shipment_id,
                event_type,
                self.bytes32(data_hash)
            ).build_transaction({
                "chainId": CHAIN_ID,
                "gas": 300000,
                "gasPrice": self.w3.eth.gas_price,
                "nonce": nonce,
                "from": self.account.address,
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            logger.info(f"✔ Blockchain anchor success: tx {receipt.transactionHash.hex()}")
            return {
                "success": True,
                "tx_hash": receipt.transactionHash.hex(),
                "block_number": receipt.blockNumber,
                "blockchain_ready": True
            }

        except Exception as e:
            logger.error(f"✖ anchor_event failed: {e}")
            return {"success": False, "error": str(e), "blockchain_ready": True}

# Singleton
blockchain = BlockchainService()