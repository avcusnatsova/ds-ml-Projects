import time
import requests
import json
import uuid

def simulate_v1_workflow():
    BASE_URL = "http://127.0.0.1:8000/api/v1"
    shipment_id = f"V1-TEST-{str(uuid.uuid4())[:8].upper()}"
    
    logs = []
    
    def log_step(step_name, status, tx_hash=None, db_written=None, error=None, latency=None):
        logs.append({
            "step": step_name,
            "status": status,
            "tx_hash": tx_hash,
            "db_written": db_written,
            "error": error,
            "latency": f"{latency:.3f}s" if latency else None
        })

    # Step 0: Health Checks
    t0 = time.time()
    try:
        res = requests.get(f"{BASE_URL}/health")
        if res.status_code == 200 and res.json().get("success"):
            log_step("v1_health_check", "passed", latency=time.time()-t0)
        else:
            log_step("v1_health_check", "failed", error=res.text)
    except Exception as e:
        log_step("v1_health_check", "failed", error=str(e))

    # Step 1: Create Shipment
    t1 = time.time()
    try:
        payload = {
            "shipment_id": shipment_id,
            "product": "V1 Pfizer Vaccine",
            "origin": "Main Lab",
            "destination": "New Clinic"
        }
        res = requests.post(f"{BASE_URL}/shipment/create", json=payload)
        res_data = res.json()
        log_step("v1_create_shipment", "passed" if res.status_code == 200 else "failed", 
                 tx_hash=res_data.get("blockchain_tx") or res_data.get("data", {}).get("blockchain_tx"),
                 latency=time.time()-t1)
    except Exception as e:
        log_step("v1_create_shipment", "failed", error=str(e), latency=time.time()-t1)
        
    print(json.dumps(logs, indent=2))

if __name__ == "__main__":
    simulate_v1_workflow()
