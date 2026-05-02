import httpx
from backend.config import OPENWEATHER_API_KEY

BASE_URL = "https://api.openweathermap.org/data/2.5"

async def get_current_weather(location: str) -> dict:
    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == "your_key_here":
        return get_mock_weather(location)
    url = f"{BASE_URL}/weather?q={location}&appid={OPENWEATHER_API_KEY}&units=metric"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return {
                "location": location,
                "temperature": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "humidity": data["main"]["humidity"],
                "description": data["weather"][0]["description"],
                "wind_speed": data["wind"]["speed"]
            }
        except Exception:
            return get_mock_weather(location)

async def get_route_forecast(origin: str, destination: str) -> list:
    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == "your_key_here":
        return get_mock_forecast(origin, destination)
    results = []
    for location in [origin, destination]:
        url = f"{BASE_URL}/forecast?q={location}&appid={OPENWEATHER_API_KEY}&units=metric&cnt=8"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                forecasts = [
                    {
                        "location": location,
                        "timestamp": item["dt_txt"],
                        "temperature": item["main"]["temp"],
                        "description": item["weather"][0]["description"]
                    }
                    for item in data["list"]
                ]
                results.extend(forecasts)
            except Exception:
                return get_mock_forecast(origin, destination)
    return results

def assess_weather_risk(
    external_temp: float,
    safe_min: float,
    safe_max: float,
    product_type: str = ""
) -> dict:
    risk_level = "low"
    recommendation = "Safe to dispatch"
    reasons = []

    temp_buffer = 10

    if external_temp > (safe_max + temp_buffer):
        risk_level = "high"
        reasons.append(
            f"External temp {external_temp}°C may overwhelm cooling unit"
        )
        recommendation = "Delay dispatch or verify carrier cooling capacity"

    elif external_temp > safe_max:
        risk_level = "medium"
        reasons.append(
            f"External temp {external_temp}°C is close to safe max {safe_max}°C"
        )
        recommendation = "Proceed with caution — monitor temperature closely"

    if external_temp < safe_min - temp_buffer:
        risk_level = "high"
        reasons.append(
            f"External temp {external_temp}°C risks freezing the product"
        )
        recommendation = "Delay dispatch — freezing risk detected"
        
    if external_temp < safe_min and external_temp >= safe_min - temp_buffer:
        if risk_level != "high":
            risk_level = "medium"
        reasons.append(
            f"External temp {external_temp}°C is close to safe min {safe_min}°C"
        )
        if recommendation == "Safe to dispatch":
            recommendation = "Proceed with caution — monitor temperature closely"

    return {
        "risk_level": risk_level,
        "recommendation": recommendation,
        "reasons": reasons,
        "external_temp": external_temp,
        "safe_min": safe_min,
        "safe_max": safe_max
    }

def get_mock_weather(location: str):
    import random
    temp = round(random.uniform(35.0, 46.0), 1) if "nagpur" in location.lower() or "pune" in location.lower() else round(random.uniform(25.0, 38.0), 1)
    return {
        "location": location,
        "temperature": temp,
        "feels_like": temp + 2.0,
        "humidity": 78,
        "description": "haze",
        "wind_speed": 3.2
    }

def get_mock_forecast(origin: str, destination: str):
    results = []
    from datetime import datetime, timedelta
    now = datetime.now()
    for loc in [origin, destination]:
        for i in range(4):
            dt = now + timedelta(hours=i*3)
            temp = get_mock_weather(loc)["temperature"]
            results.append({
                "location": loc,
                "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "temperature": round(temp + (i * 0.5), 1),
                "description": "clear sky" if i % 2 == 0 else "few clouds"
            })
    return results
