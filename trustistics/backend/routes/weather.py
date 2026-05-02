from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.database import shipments, alerts
from backend.services.weather_service import get_current_weather, get_route_forecast, assess_weather_risk
from backend.utils.response import api_response
from datetime import datetime, timezone

router = APIRouter(tags=["Weather"])

def _utcnow(): return datetime.now(timezone.utc)

class TransitCheckPayload(BaseModel):
    shipmentId: str
    currentLocation: str
    currentTemp: float

@router.get("/dispatch-check/{shipment_id}")
async def dispatch_check(shipment_id: str):
    shipment = shipments.find_one({"shipment_id": shipment_id}, {"_id": 0})
    if not shipment:
        return api_response(success=False, message="Shipment not found")
    
    origin = shipment.get("origin", "Unknown")
    safe_min = shipment.get("min_temp_celsius", 2.0)
    safe_max = shipment.get("max_temp_celsius", 8.0)
    product_type = shipment.get("product", "")
    
    weather = await get_current_weather(origin)
    risk_assessment = assess_weather_risk(
        external_temp=weather["temperature"],
        safe_min=safe_min,
        safe_max=safe_max,
        product_type=product_type
    )
    
    return api_response(success=True, message="Success", data={
        "weather": weather,
        "assessment": risk_assessment
    })

@router.get("/route-forecast/{shipment_id}")
async def route_forecast(shipment_id: str):
    shipment = shipments.find_one({"shipment_id": shipment_id}, {"_id": 0})
    if not shipment:
        return api_response(success=False, message="Shipment not found")
        
    origin = shipment.get("origin", "Unknown")
    destination = shipment.get("destination", "Unknown")
    safe_min = shipment.get("min_temp_celsius", 2.0)
    safe_max = shipment.get("max_temp_celsius", 8.0)
    
    forecasts = await get_route_forecast(origin, destination)
    
    # Assess risk for each point
    for f in forecasts:
        risk = assess_weather_risk(f["temperature"], safe_min, safe_max, "")
        f["risk_level"] = risk["risk_level"]
        
    return api_response(success=True, message="Success", data=forecasts)

@router.post("/transit-check")
async def transit_check(payload: TransitCheckPayload):
    shipment = shipments.find_one({"shipment_id": payload.shipmentId}, {"_id": 0})
    if not shipment:
        return api_response(success=False, message="Shipment not found")
        
    safe_min = shipment.get("min_temp_celsius", 2.0)
    safe_max = shipment.get("max_temp_celsius", 8.0)
    
    weather = await get_current_weather(payload.currentLocation)
    risk_assessment = assess_weather_risk(
        external_temp=weather["temperature"],
        safe_min=safe_min,
        safe_max=safe_max,
        product_type=""
    )
    
    alert_created = False
    if risk_assessment["risk_level"] == "high":
        # Create alert
        alert = {
            "shipment_id": payload.shipmentId,
            "alert_type": "Climate Risk",
            "message": risk_assessment["reasons"][0] if risk_assessment["reasons"] else f"High climate risk at {payload.currentLocation}",
            "severity": "CRITICAL",
            "resolved": False,
            "created_at": _utcnow()
        }
        alerts.insert_one(alert)
        alert_created = True
        
    return api_response(success=True, message="Success", data={
        "weather": weather,
        "assessment": risk_assessment,
        "alert_created": alert_created
    })
