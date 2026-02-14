import logging
from datetime import datetime

import httpx

from models import WeatherCondition

logger = logging.getLogger(__name__)

OPEN_METEO_BASE = "https://api.open-meteo.com/v1"

WMO_TO_CONDITION: dict[int, WeatherCondition] = {
    0: WeatherCondition.CLEAR,
    1: WeatherCondition.CLEAR,
    2: WeatherCondition.CLOUDY,
    3: WeatherCondition.CLOUDY,
    45: WeatherCondition.CLOUDY,
    48: WeatherCondition.CLOUDY,
    51: WeatherCondition.RAIN,
    53: WeatherCondition.RAIN,
    55: WeatherCondition.RAIN,
    56: WeatherCondition.RAIN,
    57: WeatherCondition.RAIN,
    61: WeatherCondition.RAIN,
    63: WeatherCondition.RAIN,
    65: WeatherCondition.HEAVY_RAIN,
    66: WeatherCondition.RAIN,
    67: WeatherCondition.HEAVY_RAIN,
    71: WeatherCondition.SNOW,
    73: WeatherCondition.SNOW,
    75: WeatherCondition.SNOW,
    77: WeatherCondition.SNOW,
    80: WeatherCondition.RAIN,
    81: WeatherCondition.RAIN,
    82: WeatherCondition.HEAVY_RAIN,
    85: WeatherCondition.SNOW,
    86: WeatherCondition.SNOW,
    95: WeatherCondition.STORM,
    96: WeatherCondition.STORM,
    99: WeatherCondition.STORM,
}


async def fetch_weather_for_event(
    lat: float,
    lng: float,
    date_time_iso: str,
) -> tuple[float, float, WeatherCondition]:
    try:
        dt = datetime.fromisoformat(date_time_iso.replace("Z", "+00:00"))
        date_str = dt.strftime("%Y-%m-%d")
        hour = dt.hour

        url = (
            f"{OPEN_METEO_BASE}/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&hourly=temperature_2m,precipitation_probability,weathercode"
            f"&start_date={date_str}&end_date={date_str}"
            f"&timezone=auto"
        )
        logger.debug("Fetching weather from Open-Meteo for %s at (%s, %s)", date_str, lat, lng)
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        hourly = data.get("hourly", {})
        temps = hourly.get("temperature_2m", [0] * 24)
        probs = hourly.get("precipitation_probability", [0] * 24)
        codes = hourly.get("weathercode", [0] * 24)

        idx = min(hour, len(temps) - 1)
        temp = float(temps[idx]) if temps else 20.0
        prob = float(probs[idx]) if probs else 0.0
        code = int(codes[idx]) if codes else 0
        condition = WMO_TO_CONDITION.get(code, WeatherCondition.CLOUDY)

        if temp >= 35:
            condition = WeatherCondition.EXTREME_HEAT

        logger.info(
            "Fetched weather: %.1f C, %.0f%% precip, %s",
            temp,
            prob,
            condition.value,
        )
        return (temp, prob, condition)

    except Exception as exc:
        logger.warning("Weather fetch failed, using defaults: %s", exc)
        return (25.0, 20.0, WeatherCondition.CLEAR)
