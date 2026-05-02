import time
import requests
import json
import uuid

def simulate_workflow():
    BASE_URL = "http://127.0.0.1:8000"
    shipment_id = f"SHP-E2E-{str(uuid.uuid4())[:8].upper()}"
    
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
            log_step("health_check_api", "passed", latency=time.time()-t0)
        else:
            log_step("health_check_api", "failed", error=res.json().get("error") if res.status_code == 200 else "Invalid code")
    except Exception as e:
        log_step("health_check_api", "failed", error=str(e))
        print(json.dumps(logs, indent=2))
        return

    # Step 1: Create Shipment
    t1 = time.time()
    try:
        payload = {
            "shipment_id": shipment_id,
            "product": "COVID-19 Vaccine Batch",
            "origin": "Laboratory XYZ",
            "destination": "Hospital ABC"
        }
        res = requests.post(f"{BASE_URL}/shipment/create", json=payload)
        res_data = res.json()
        log_step("create_shipment", "passed" if res.status_code == 200 else "failed", 
                 tx_hash=res_data.get("blockchain_tx"), 
                 db_written=True if res.status_code == 200 else False,
                 latency=time.time()-t1)
    except Exception as e:
        log_step("create_shipment", "failed", error=str(e), latency=time.time()-t1)
        
    # Step 2: Add Shipment Event
    t2 = time.time()
    try:
        event_payload = {
            "event_type": "IN_TRANSIT",
            "location": "Transit Hub Alpha"
        }
        res = requests.post(f"{BASE_URL}/api/tracking/shipment/{shipment_id}/event", json=event_payload)
        res_data = res.json()
        # the native schema currently returns raw dict, so handling both:
        success_flag = res_data.get("success", False) if "success" in res_data else (res.status_code == 200)
        log_step("add_event", "passed" if success_flag else "failed",
                 tx_hash=res_data.get("tx_hash"),
                 db_written=True if success_flag else False,
                 latency=time.time()-t2)
    except Exception as e:
        log_step("add_event", "failed", error=str(e), latency=time.time()-t2)
        
    # Step 3: Fetch Timeline
    t3 = time.time()
    try:
        res = requests.get(f"{BASE_URL}/api/tracking/shipment/{shipment_id}/timeline")
        log_step("fetch_timeline", "passed" if res.status_code == 200 else "failed",
                 db_written=True if res.status_code == 200 else False,
                 latency=time.time()-t3)
    except Exception as e:
        log_step("fetch_timeline", "failed", error=str(e), latency=time.time()-t3)
        
    print(json.dumps(logs, indent=2))

if __name__ == "__main__":
    simulate_workflow()
