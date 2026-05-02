"""
Trustistics IoT Sensor Simulator
=================================
Simulates a temperature + GPS sensor physically placed inside a cold-chain
shipping box. Runs automatically every 30 seconds — no human input.

Usage:
    python iot_simulator.py <SHIPMENT_ID> [BASE_TEMP]

Example:
    python iot_simulator.py SHP-3601
    python iot_simulator.py SHP-3601 -72
"""

import sys
import time
import random
import hashlib
import requests
from datetime import datetime, timezone

# ─── Config ───────────────────────────────────────────────────────────────────

BACKEND_URL = "http://127.0.0.1:8000"
INTERVAL_SECONDS = 30
DEVICE_ID = f"SENSOR-BOX-{random.randint(1000, 9999)}"

ROUTE = [
    {"lat": 19.0760, "lng": 72.8777, "location": "Mumbai"},
    {"lat": 20.0059, "lng": 73.7898, "location": "Nashik"},
    {"lat": 21.1458, "lng": 79.0882, "location": "Nagpur"},
    {"lat": 23.2599, "lng": 77.4126, "location": "Bhopal"},    # ← Breach injected here
    {"lat": 26.9124, "lng": 75.7873, "location": "Jaipur"},
    {"lat": 28.6139, "lng": 77.2090, "location": "Delhi"},
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_temperature(base_temp: float, step_index: int) -> float:
    """Realistic temperature fluctuation. Injects breach at Bhopal (step 3)."""
    fluctuation = random.uniform(-3, 3)
    if step_index == 3:
        # Deliberate breach: +25 above base (e.g. -72 + 25 = -47°C — above safe max)
        fluctuation += 25
    return round(base_temp + fluctuation, 2)

def get_battery(step_index: int, total_steps: int) -> float:
    """Battery drains from ~95% to ~60% over the journey."""
    start = 95.0
    end = 60.0
    ratio = step_index / max(total_steps - 1, 1)
    return round(start - (start - end) * ratio + random.uniform(-2, 2), 1)

def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()

def send_log(shipment_id: str, waypoint: dict, temperature: float, battery: float, step_index: int):
    """POST the sensor reading to the FastAPI backend."""
    payload = {
        "shipment_id": shipment_id,
        "temperature_celsius": temperature,
        "location": waypoint["location"],
        "latitude": waypoint["lat"],
        "longitude": waypoint["lng"],
        "source": "IOT_SENSOR",
        "device_id": DEVICE_ID,
        "battery_level": battery,
        "timestamp": utcnow_str(),
        "logged_by": DEVICE_ID,
    }

    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/tracking/{shipment_id}/temperature",
            json=payload,
            timeout=10,
        )
        return resp.status_code, resp.json()
    except requests.exceptions.ConnectionError:
        return None, {"error": "Backend not reachable"}
    except Exception as e:
        return None, {"error": str(e)}

# ─── Main Loop ────────────────────────────────────────────────────────────────

def run(shipment_id: str, base_temp: float):
    total = len(ROUTE)
    print(f"\n{'═' * 60}")
    print(f"  Trustistics IoT Sensor Simulator")
    print(f"  Device : {DEVICE_ID}")
    print(f"  Shipment: {shipment_id}")
    print(f"  Route   : {ROUTE[0]['location']} → {ROUTE[-1]['location']}")
    print(f"  Base °C : {base_temp}°C")
    print(f"  Interval: every {INTERVAL_SECONDS}s")
    print(f"{'═' * 60}\n")

    for i, waypoint in enumerate(ROUTE):
        temp = get_temperature(base_temp, i)
        battery = get_battery(i, total)
        timestamp = utcnow_str()
        is_breach = i == 3  # Bhopal step

        # Print reading to terminal
        status = "🚨 BREACH DETECTED" if is_breach else "✅ OK"
        print(f"[{timestamp}]")
        print(f"  📍 {waypoint['location']} ({waypoint['lat']}, {waypoint['lng']})")
        print(f"  🌡  Temperature : {temp}°C   {status}")
        print(f"  🔋 Battery     : {battery}%")
        print(f"  📡 Sending to backend...")

        status_code, response = send_log(shipment_id, waypoint, temp, battery, i)

        if status_code == 201:
            risk = response.get("data", {}).get("updated_risk", "?")
            print(f"  ✔ Logged. Risk score: {risk}")
        elif status_code is None:
            print(f"  ✖ Connection error: {response.get('error')}")
        else:
            print(f"  ✖ Backend error [{status_code}]: {response}")

        print()

        if i < total - 1:
            print(f"  ⏱ Next reading in {INTERVAL_SECONDS}s...\n")
            time.sleep(INTERVAL_SECONDS)

    print(f"{'═' * 60}")
    print(f"  ✅ Simulation complete. Shipment reached {ROUTE[-1]['location']}.")
    print(f"{'═' * 60}\n")

# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python iot_simulator.py <SHIPMENT_ID> [BASE_TEMP]")
        print("Example: python iot_simulator.py SHP-3601")
        sys.exit(1)

    shipment_id = sys.argv[1]
    base_temp = float(sys.argv[2]) if len(sys.argv) > 2 else -72.0

    run(shipment_id, base_temp)
