import logging
import math
from typing import Any

import httpx

from models import LatLng

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
SNAP_THRESHOLD_M = 25.0


def _bbox_from_polygon(polygon: list[LatLng], margin_deg: float = 0.0005) -> tuple[float, float, float, float]:
    lats = [p.lat for p in polygon]
    lngs = [p.lng for p in polygon]
    south = min(lats) - margin_deg
    north = max(lats) + margin_deg
    west = min(lngs) - margin_deg
    east = max(lngs) + margin_deg
    return south, west, north, east


def _dist_approx_m(a: LatLng, b: LatLng) -> float:
    R = 6371000
    dlat = math.radians(b.lat - a.lat)
    dlon = math.radians(b.lng - a.lng)
    y = math.sin(dlat / 2) ** 2 + math.cos(math.radians(a.lat)) * math.cos(math.radians(b.lat)) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(min(1.0, y)))


def _closest_point_on_segment(p: LatLng, a: LatLng, b: LatLng) -> tuple[LatLng, float]:
    ap_lat = p.lat - a.lat
    ap_lng = p.lng - a.lng
    ab_lat = b.lat - a.lat
    ab_lng = b.lng - a.lng
    ab2 = ab_lat * ab_lat + ab_lng * ab_lng
    if ab2 < 1e-20:
        return LatLng(lat=a.lat, lng=a.lng), _dist_approx_m(p, a)
    t = max(0.0, min(1.0, (ap_lat * ab_lat + ap_lng * ab_lng) / ab2))
    q = LatLng(lat=a.lat + t * ab_lat, lng=a.lng + t * ab_lng)
    return q, _dist_approx_m(p, q)


async def snap_path_to_map_boundaries(path: list[LatLng]) -> list[LatLng]:
    if len(path) < 3:
        return list(path)
    south, west, north, east = _bbox_from_polygon(path)
    query = f"""
    [out:json][timeout:20];
    (
      way["building"]({south},{west},{north},{east});
      way["landuse"]({south},{west},{north},{east});
      way["leisure"]({south},{west},{north},{east});
    );
    out body;
    >;
    out skel qt;
    """
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                OVERPASS_URL,
                data={"data": query},
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("Overpass (boundaries) request failed: %s", exc)
        return list(path)

    elements = data.get("elements", [])
    ways = [e for e in elements if e.get("type") == "way"]
    nodes = {e["id"]: e for e in elements if e.get("type") == "node"}

    segments: list[tuple[LatLng, LatLng]] = []
    for way in ways:
        node_ids = way.get("nodes", [])
        if len(node_ids) < 2:
            continue
        coords: list[LatLng] = []
        for nid in node_ids:
            if nid in nodes:
                n = nodes[nid]
                coords.append(LatLng(lat=n["lat"], lng=n["lon"]))
        if len(coords) < 2:
            continue
        for i in range(len(coords) - 1):
            segments.append((coords[i], coords[i + 1]))
        closed = way.get("nodes", []) and way["nodes"][0] == way["nodes"][-1]
        if closed and len(coords) >= 3:
            segments.append((coords[-1], coords[0]))

    if not segments:
        logger.info("Snap to boundaries: no OSM boundaries in bbox, path unchanged")
        return list(path)

    out: list[LatLng] = []
    for p in path:
        best = p
        best_d = SNAP_THRESHOLD_M
        for a, b in segments:
            q, d = _closest_point_on_segment(p, a, b)
            if d < best_d:
                best_d = d
                best = q
        out.append(best)
    logger.info("Snap to map boundaries: %d segments, path %d points", len(segments), len(out))
    return out


async def fetch_roads_in_area(
    polygon: list[LatLng],
    limit: int = 80,
) -> list[dict[str, Any]]:
    if len(polygon) < 3:
        return []

    south, west, north, east = _bbox_from_polygon(polygon)

    query = f"""
    [out:json][timeout:25];
    (
      way["highway"~"^(primary|secondary|tertiary|trunk|motorway|unclassified)$"]({south},{west},{north},{east});
    );
    out body;
    >;
    out skel qt;
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                OVERPASS_URL,
                data={"data": query},
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("Overpass request failed: %s", exc)
        return []

    elements = data.get("elements", [])
    ways = [e for e in elements if e.get("type") == "way"]
    nodes = {e["id"]: e for e in elements if e.get("type") == "node"}

    roads: list[dict[str, Any]] = []
    for way in ways[:limit]:
        node_ids = way.get("nodes", [])
        coords = []
        for nid in node_ids:
            if nid in nodes:
                n = nodes[nid]
                coords.append({"lat": n["lat"], "lng": n["lon"]})

        if len(coords) < 2:
            continue

        tags = way.get("tags", {})
        name = (
            tags.get("name")
            or tags.get("ref")
            or tags.get("highway", "road")
        )
        if isinstance(name, list):
            name = name[0] if name else "road"

        roads.append({"name": str(name), "coordinates": coords})

    logger.info("Fetched %d road segments from Overpass", len(roads))
    return roads
