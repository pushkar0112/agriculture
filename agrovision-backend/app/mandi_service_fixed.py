import calendar
import logging
import re
import time
from datetime import date, timedelta
from functools import lru_cache

import requests
from app.location_service import (
    is_nominatim_rate_limited,
    resolve_location_details,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

BASE_URL = "https://api.agmarknet.gov.in/v1"

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/154.0.0.0 Safari/537.36"
    ),
}

COMMODITY_IDS = {
    "tomato": 65,
    "potato": 24,
    "green chilli": 73,
}

COMMODITIES = {
    "Tomato": 65,
    "Potato": 24,
    "Green Chilli": 73,
}


def agmarknet_get(endpoint, params=None):
    try:
        response = requests.get(
            f"{BASE_URL}/{endpoint}",
            headers=HEADERS,
            params=params,
            timeout=(5.0, 15.0),
        )
        response.raise_for_status()
        return response.json()
    except requests.Timeout as exc:
        logger.warning("AGMARKNET request timed out for %s: %s", endpoint, exc)
        raise RuntimeError("AGMARKNET request timed out. Please try again.") from exc
    except requests.HTTPError as exc:
        logger.warning("AGMARKNET HTTP error for %s: %s", endpoint, exc)
        raise RuntimeError(
            f"AGMARKNET returned HTTP {exc.response.status_code if exc.response is not None else 'error'}"
        ) from exc
    except requests.RequestException as exc:
        logger.warning("AGMARKNET connection error for %s: %s", endpoint, exc)
        raise RuntimeError("Unable to reach AGMARKNET provider.") from exc


@lru_cache(maxsize=1)
def get_filters():
    return agmarknet_get("daily-price-arrival/filters")


def _norm(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _filter_data():
    return get_filters().get("data", {})


def _state_lookup():
    return {
        _norm(item.get("state_name")): item.get("state_id")
        for item in _filter_data().get("state_data", [])
        if item.get("state_id") and _norm(item.get("state_name")) != "all states uts"
    }


def _district_lookup():
    lookup = {}
    for item in _filter_data().get("district_data", []):
        district_id = item.get("id") or item.get("district_id")
        district_name = _norm(item.get("district_name"))
        state_id = item.get("state_id")
        if district_id and district_name and state_id:
            lookup[(state_id, district_name)] = district_id
    return lookup


def resolve_location(location):
    """Resolve any Indian location to dynamic AGMARKNET state/district IDs."""

    text = _norm(location)

    # Common spellings / aliases
    aliases = {
        "bangalore": "bengaluru",
        "belgavi": "belagavi",
        "belga": "belagavi",
        "belgav": "belagavi",
        "belgaum": "belagavi",
    }

    for alias, canonical in aliases.items():
        text = re.sub(
            rf"\b{re.escape(alias)}\b",
            canonical,
            text,
        )

    state_id = None
    district_id = None
    states = _state_lookup()
    districts = _district_lookup()

    for state_name, candidate_id in sorted(states.items(), key=lambda item: len(item[0]), reverse=True):
        if state_name and state_name in text:
            state_id = candidate_id
            break

    for (candidate_state, district_name), candidate_id in sorted(
        districts.items(), key=lambda item: len(item[0][1]), reverse=True
    ):
        if district_name and district_name in text and (state_id is None or candidate_state == state_id):
            district_id = candidate_id
            state_id = state_id or candidate_state
            break

    return {
        "state_id": state_id,
        "district_id": district_id,
    }


def resolve_commodity(commodity):
    requested = _norm(commodity)

    for name, commodity_id in COMMODITIES.items():
        if _norm(name) == requested:
            return name, commodity_id

    # Allow the API to resolve additional commodities from its filters.
    for item in _filter_data().get("cmdt_data", []):
        name = item.get("cmdt_name") or item.get("commodity_name") or item.get("name") or ""
        if _norm(name) == requested:
            return name, item.get("cmdt_id") or item.get("commodity_id") or item.get("id")

    return commodity, None


def find_ids(location, commodity):
    location_ids = resolve_location(location)
    commodity_name, commodity_id = resolve_commodity(commodity)

    return {
        "state_id": location_ids["state_id"],
        "district_id": location_ids["district_id"],
        "commodity_id": commodity_id,
        "commodity": commodity_name,
    }


def _extract_price_rows(value, market=None, arrival_date=None, output=None):
    """Recursively extract price records from AGMARKNET responses."""
    if output is None:
        output = []

    if isinstance(value, dict):
        current_market = value.get("marketName") or value.get("market") or market
        current_date = value.get("arrivalDate") or value.get("date") or arrival_date

        if any(k in value for k in ("modalPrice", "minimumPrice", "maximumPrice")):
            output.append({
                "market": current_market,
                "date": current_date,
                "variety": value.get("variety"),
                "arrivals": value.get("arrivals"),
                "min_price": value.get("minimumPrice"),
                "max_price": value.get("maximumPrice"),
                "modal_price": value.get("modalPrice"),
            })

        for key, child in value.items():
            if key not in {"columns"}:
                _extract_price_rows(child, current_market, current_date, output)

    elif isinstance(value, list):
        for child in value:
            _extract_price_rows(child, market, arrival_date, output)

    return output


def _market_names_for_district(state_id, district_id):
    if not district_id:
        return set()

    data = get_filters().get("data", {})
    names = set()

    for item in data.get("market_data", []):
        if item.get("state_id") == state_id and item.get("district_id") == district_id:
            name = item.get("mkt_name") or item.get("market_name")
            if name:
                names.add(_norm(name.replace(" APMC", "").replace(" Market", "")))

    return names


def _is_district_market(market_name, allowed_names):
    if not market_name:
        return False
    if not allowed_names:
        return False

    normalized = _norm(market_name.replace(" APMC", "").replace(" Market", ""))
    return normalized in allowed_names


def _months_for_range(end_date, days):
    start_date = end_date - timedelta(days=days - 1)
    months = []
    cursor = date(start_date.year, start_date.month, 1)
    end_month = date(end_date.year, end_date.month, 1)

    while cursor <= end_month:
        months.append((cursor.year, cursor.month))
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)

    return start_date, months


def _parse_agmarknet_date(value):
    try:
        return date.fromisoformat("-".join(reversed(value.split("/"))))
    except (AttributeError, TypeError, ValueError):
        return None


def _fetch_rows(state_id, commodity_id, start_date, end_date, allowed_markets=None):
    _, months = _months_for_range(end_date, (end_date - start_date).days + 1)
    rows = []
    for year, month in months:
        try:
            raw = agmarknet_get(
                "prices-and-arrivals/date-wise/specific-commodity",
                params={
                    "year": year,
                    "month": month,
                    "stateId": state_id,
                    "commodityId": commodity_id,
                    "includeExcel": "false",
                },
            )
        except Exception as exc:
            logger.warning(
                "Failed to fetch rows from AGMARKNET for state %s, commodity %s, %d-%d: %s",
                state_id,
                commodity_id,
                year,
                month,
                exc,
            )
            continue

        for row in _extract_price_rows(raw):
            if not row["date"] or (allowed_markets and not _is_district_market(row["market"], allowed_markets)):
                continue
            parsed_date = _parse_agmarknet_date(row["date"])
            if parsed_date is None or not start_date <= parsed_date <= end_date:
                continue
            rows.append({
                "date": parsed_date.isoformat(),
                "market": row["market"],
                "variety": row["variety"],
                "arrivals": row["arrivals"],
                "min_price": row["min_price"],
                "max_price": row["max_price"],
                "modal_price": row["modal_price"],
                "unit": "Rs./Quintal",
            })
    return rows


def _safe_location_details(location, latitude=None, longitude=None):
    if latitude is not None and longitude is not None:
        parts = [part.strip() for part in str(location).split(",") if part.strip()]
        state = parts[-2] if len(parts) >= 2 and parts[-1].lower() == "india" else None
        return {
            "formatted": location,
            "name": parts[0] if parts else location,
            "district": parts[-3] if len(parts) >= 3 and parts[-1].lower() == "india" else None,
            "state": state,
            "latitude": latitude,
            "longitude": longitude,
        }
    try:
        details = resolve_location_details(location)
    except Exception:
        details = {"formatted": location, "latitude": None, "longitude": None}
    if latitude is not None and longitude is not None:
        details["latitude"] = latitude
        details["longitude"] = longitude
    return details


def _distance_km(first, second):
    from math import asin, cos, radians, sin, sqrt

    if None in (*first, *second):
        return None
    radius = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, (*first, *second))
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    value = sin(delta_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    return round(radius * 2 * asin(sqrt(value)), 1)


@lru_cache(maxsize=512)
def resolve_market_coordinates(market, state):
    candidates = [market]
    simplified = re.sub(r"\([^)]*\)", "", str(market))
    simplified = re.sub(r"\b(APMC|Market)\b", "", simplified, flags=re.IGNORECASE).strip()
    if simplified and simplified not in candidates:
        candidates.append(simplified)

    for candidate in candidates:
        try:
            details = resolve_location_details(f"{candidate}, {state}, India")
        except Exception:
            continue
        if details.get("latitude") is not None and details.get("longitude") is not None:
            return details["latitude"], details["longitude"]
        if is_nominatim_rate_limited():
            break
    return None, None


def _market_distance(market, state, origin):
    latitude, longitude = resolve_market_coordinates(market, state)
    if latitude is None or longitude is None:
        return None
    return _distance_km(
        (origin.get("latitude"), origin.get("longitude")),
        (latitude, longitude),
    )


def _nearest_market_rows(location, state_id, commodity_id, start_date, end_date, latitude=None, longitude=None, prefix="[PRICES]"):
    t_start = time.perf_counter()
    origin = _safe_location_details(location, latitude, longitude)

    t_ag_start = time.perf_counter()
    logger.info("%s AGMARKNET request started", prefix)
    print(f"{prefix} AGMARKNET request started", flush=True)

    all_rows = _fetch_rows(state_id, commodity_id, start_date, end_date)

    t_ag_ms = round((time.perf_counter() - t_ag_start) * 1000)
    logger.info("%s AGMARKNET request completed: %d ms", prefix, t_ag_ms)
    print(f"{prefix} AGMARKNET request completed: {t_ag_ms} ms", flush=True)

    if not all_rows:
        return [], None, None

    grouped = {}
    for row in all_rows:
        if row.get("market"):
            grouped.setdefault(_norm(row["market"]), []).append(row)

    if not grouped:
        return [], None, None

    state = origin.get("state") or "India"
    locality_terms = {
        _norm(origin.get("name")),
        _norm(origin.get("district")),
    }
    locality_terms.discard("")

    def candidate_priority(rows):
        market_name = rows[0]["market"]
        normalized_market = _norm(market_name)
        normalized_market = normalized_market.replace("belgaum", "belagavi")
        return 0 if any(term and term in normalized_market for term in locality_terms) else 1

    market_groups = sorted(
        grouped.values(),
        key=candidate_priority,
    )[:8]

    has_origin_coords = origin.get("latitude") is not None and origin.get("longitude") is not None
    candidates = []

    t_coord_start = time.perf_counter()
    logger.info("%s market coordinate lookup started", prefix)
    print(f"{prefix} market coordinate lookup started", flush=True)

    if has_origin_coords:
        for group in market_groups:
            m_name = group[0]["market"]
            try:
                lat, lon = resolve_market_coordinates(m_name, state)
            except Exception:
                lat, lon = None, None

            if lat is not None and lon is not None:
                dist = _distance_km((origin["latitude"], origin["longitude"]), (lat, lon))
                if dist is not None:
                    candidates.append((dist, m_name, group))

            if is_nominatim_rate_limited():
                logger.info("%s Nominatim rate-limited. Ceasing candidate coordinate lookups.", prefix)
                break

    t_coord_ms = round((time.perf_counter() - t_coord_start) * 1000)
    logger.info("%s market coordinate lookup completed: %d ms", prefix, t_coord_ms)
    print(f"{prefix} market coordinate lookup completed: {t_coord_ms} ms", flush=True)

    t_near_ms = round((time.perf_counter() - t_start) * 1000)
    logger.info("%s nearest market calculation completed: %d ms", prefix, t_near_ms)
    print(f"{prefix} nearest market calculation completed: {t_near_ms} ms", flush=True)

    if candidates:
        distance, market, market_rows = min(candidates, key=lambda item: item[0])
        return sorted(market_rows, key=lambda item: item["date"]), market, distance

    # If coordinates unavailable or rate-limited: return the highest-priority candidate with distance_km=None
    top_group = market_groups[0]
    top_market = top_group[0]["market"]
    return sorted(top_group, key=lambda item: item["date"]), top_market, None


def get_current_prices(location, commodity=None, latitude=None, longitude=None):
    t_start = time.perf_counter()
    logger.info("[PRICES] request started")
    print("[PRICES] request started", flush=True)

    t_loc_start = time.perf_counter()
    logger.info("[PRICES] location resolution started")
    print("[PRICES] location resolution started", flush=True)

    ids = resolve_location(location)

    t_loc_ms = round((time.perf_counter() - t_loc_start) * 1000)
    logger.info("[PRICES] location resolution completed: %d ms", t_loc_ms)
    print(f"[PRICES] location resolution completed: {t_loc_ms} ms", flush=True)

    if not ids["state_id"]:
        raise ValueError(
            f"State could not be resolved from location: {location}"
        )

    requested_commodities = list(COMMODITIES.items())
    if commodity:
        commodity_name, commodity_id = resolve_commodity(commodity)
        if not commodity_id:
            raise ValueError(f"Commodity could not be resolved: {commodity}")
        requested_commodities = [(commodity_name, commodity_id)]

    prices = []
    for commodity_name, commodity_id in requested_commodities:
        try:
            # Get recent historical data (days=7)
            history_result = get_price_history(
                location=location,
                commodity=commodity_name,
                days=7,
                latitude=latitude,
                longitude=longitude,
                _from_prices=True,
            )

            history = history_result.get("history", [])

            if history:
                latest = max(
                    history,
                    key=lambda item: item["date"]
                )

                prices.append({
                    "commodity": commodity_name,
                    "commodity_id": commodity_id,
                    "district_id": ids["district_id"],
                    "data": [latest],
                    "market": history_result.get("market"),
                    "distance_km": history_result.get("distance_km"),
                    "fallback_used": history_result.get("fallback_used", False),
                })
            else:
                prices.append({
                    "commodity": commodity_name,
                    "commodity_id": commodity_id,
                    "district_id": ids["district_id"],
                    "data": [],
                    "market": None,
                    "distance_km": None,
                    "fallback_used": False,
                })

        except Exception as exc:
            prices.append({
                "commodity": commodity_name,
                "commodity_id": commodity_id,
                "district_id": ids["district_id"],
                "data": [],
                "error": str(exc),
            })

    t_resp_ms = round((time.perf_counter() - t_start) * 1000)
    logger.info("[PRICES] response generated: %d ms", t_resp_ms)
    print(f"[PRICES] response generated: {t_resp_ms} ms", flush=True)

    return {
        "location": location,
        "state_id": ids["state_id"],
        "district_id": ids["district_id"],
        "prices": prices,
        "source": "AGMARKNET",
        "unit": "Rs./Quintal",
    }


def get_price_history(location, commodity, days=30, latitude=None, longitude=None, _from_prices=False):
    prefix = "[PRICES]" if _from_prices else "[HISTORY]"
    t_start = time.perf_counter()
    if not _from_prices:
        logger.info("[HISTORY] request started")
        print("[HISTORY] request started", flush=True)

    if days < 7 or days > 90:
        raise ValueError("days must be between 7 and 90")

    ids = resolve_location(location)
    commodity_name, commodity_id = resolve_commodity(commodity)

    if not ids["state_id"]:
        raise ValueError(f"State could not be resolved from location: {location}")
    if not commodity_id:
        raise ValueError(f"Commodity could not be resolved: {commodity}")

    end_date = date.today()
    start_date, _ = _months_for_range(end_date, days)
    allowed_markets = _market_names_for_district(ids["state_id"], ids["district_id"])

    t_ag_start = time.perf_counter()
    if not _from_prices:
        logger.info("[HISTORY] AGMARKNET request started")
        print("[HISTORY] AGMARKNET request started", flush=True)

    history = (
        _fetch_rows(ids["state_id"], commodity_id, start_date, end_date, allowed_markets)
        if ids["district_id"]
        else []
    )
    t_ag_ms = round((time.perf_counter() - t_ag_start) * 1000)
    if not _from_prices:
        logger.info("[HISTORY] AGMARKNET request completed: %d ms", t_ag_ms)
        print(f"[HISTORY] AGMARKNET request completed: {t_ag_ms} ms", flush=True)

    market = history[-1]["market"] if history else None
    fallback_used = False
    distance_km = None

    if history:
        origin = _safe_location_details(location, latitude, longitude)
        if origin.get("latitude") is not None and origin.get("longitude") is not None:
            t_coord_start = time.perf_counter()
            logger.info("%s market coordinate lookup started", prefix)
            print(f"{prefix} market coordinate lookup started", flush=True)
            distance_km = _market_distance(market, origin.get("state") or "India", origin)
            t_coord_ms = round((time.perf_counter() - t_coord_start) * 1000)
            logger.info("%s market coordinate lookup completed: %d ms", prefix, t_coord_ms)
            print(f"{prefix} market coordinate lookup completed: {t_coord_ms} ms", flush=True)
        if not _from_prices:
            logger.info("[HISTORY] filtering completed")
            print("[HISTORY] filtering completed", flush=True)
    else:
        history, market, distance_km = _nearest_market_rows(
            location, ids["state_id"], commodity_id, start_date, end_date, latitude, longitude, prefix=prefix
        )
        fallback_used = bool(history)
        if not _from_prices:
            logger.info("[HISTORY] filtering completed")
            print("[HISTORY] filtering completed", flush=True)

    history.sort(key=lambda item: item["date"])

    t_resp_ms = round((time.perf_counter() - t_start) * 1000)
    if not _from_prices:
        logger.info("[HISTORY] response generated: %d ms", t_resp_ms)
        print(f"[HISTORY] response generated: {t_resp_ms} ms", flush=True)

    return {
        "location": location,
        "requested_location": location,
        "state_id": ids["state_id"],
        "district_id": ids["district_id"],
        "commodity": commodity_name,
        "commodity_id": commodity_id,
        "days": days,
        "history": history,
        "market": market,
        "distance_km": distance_km,
        "fallback_used": fallback_used,
        "source": "AGMARKNET",
        "unit": "Rs./Quintal",
    }
