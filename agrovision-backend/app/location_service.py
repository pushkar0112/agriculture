import os
import re
import time
import logging
from difflib import SequenceMatcher
from functools import lru_cache

from pathlib import Path
from dotenv import load_dotenv

import requests

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SERPAPI_LOCATIONS_URL = "https://serpapi.com/locations.json"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
LOCATIONIQ_URL = "https://us1.locationiq.com/v1/search"
PHOTON_URL = "https://photon.komoot.io/api/"
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Rate-limiting / Circuit breaker for Nominatim (strict 1 req/s, 429 backoff)
_nominatim_rate_limited_until = 0.0


class ProviderUnavailableError(Exception):
    """Raised when all location providers fail or are unavailable."""
    pass


def is_nominatim_rate_limited():
    return time.time() < _nominatim_rate_limited_until


def mark_nominatim_rate_limited(cooldown_seconds=60):
    global _nominatim_rate_limited_until
    _nominatim_rate_limited_until = time.time() + cooldown_seconds
    logger.warning(
        "Nominatim rate-limited (HTTP 429). Pausing Nominatim requests for %ds.",
        cooldown_seconds,
    )


def _clean(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def _coordinates(item):
    gps = item.get("gps") or {}
    if isinstance(gps, (list, tuple)) and len(gps) >= 2:
        longitude, latitude = gps[0], gps[1]
    else:
        latitude = item.get("latitude") or gps.get("latitude")
        longitude = item.get("longitude") or gps.get("longitude")
    try:
        return float(latitude), float(longitude)
    except (TypeError, ValueError):
        return None, None


def _india_location(item):
    address = item.get("address") or {}
    country_code = str(item.get("country_code") or address.get("country_code") or "").lower()
    country = str(item.get("country") or address.get("country") or "").lower()
    canonical = str(item.get("canonical_name") or "").lower()
    return (
        country_code in {"in", "ind"}
        or "india" in country
        or "bharat" in country
        or "india" in canonical
    )


def _format_location(item, source="SerpApi Locations"):
    name = _clean(item.get("name"))
    canonical_parts = [
        _clean(part)
        for part in re.split(r"\s*(?:>|,)\s*", str(item.get("canonical_name") or ""))
        if _clean(part)
    ]
    canonical_parts = [part for part in canonical_parts if part.lower() != "india"]

    state = _clean(item.get("state"))
    district = _clean(item.get("district"))
    if not state and canonical_parts:
        state = canonical_parts[-1]
    if not district and len(canonical_parts) > 2:
        district = canonical_parts[-2]

    parts = [name]
    if district and district.lower() != name.lower():
        parts.append(district)
    if state and state.lower() not in {part.lower() for part in parts}:
        parts.append(state)
    parts.append("India")

    latitude, longitude = _coordinates(item)
    formatted = ", ".join(dict.fromkeys(parts))
    return {
        "name": name,
        "display_name": formatted,
        "district": district or None,
        "state": state or None,
        "country": "India",
        "formatted": formatted,
        "latitude": latitude,
        "longitude": longitude,
        "source": source,
    }


def _query_variants(query):
    query = _clean(query)
    variants = [query]
    if len(query) >= 3 and not re.search(r"\bindia\b", query, re.IGNORECASE):
        variants.append(f"{query}, India")
    return list(dict.fromkeys(variants))


def _format_nominatim(item):
    address = item.get("address") or {}
    name = _clean(item.get("name"))
    if not name:
        for key in (
            "city", "town", "village", "hamlet", "suburb", "neighbourhood",
            "municipality", "locality", "county", "district", "state_district",
        ):
            name = _clean(address.get(key))
            if name:
                break
    district = _clean(
        address.get("district")
        or address.get("state_district")
        or address.get("county")
    )
    state = _clean(address.get("state") or address.get("state_district") or district)
    country = _clean(address.get("country")) or "India"
    if not name or not _india_location(item):
        return None
    try:
        latitude = float(item.get("lat"))
        longitude = float(item.get("lon"))
    except (TypeError, ValueError):
        latitude = longitude = None
    formatted = ", ".join(dict.fromkeys(part for part in (name, district, state, "India") if part))
    return {
        "name": name,
        "display_name": formatted,
        "district": district or None,
        "state": state or None,
        "country": "India",
        "formatted": formatted,
        "latitude": latitude,
        "longitude": longitude,
        "source": "OpenStreetMap Nominatim",
    }


def _search_nominatim(query):
    if is_nominatim_rate_limited():
        logger.info("Location provider Nominatim skipped: currently rate-limited (cooldown active)")
        return []

    try:
        response = requests.get(
            NOMINATIM_URL,
            params={
                "q": query,
                "format": "jsonv2",
                "addressdetails": 1,
                "countrycodes": "in",
                "limit": 10,
            },
            headers={"User-Agent": "AgroVision-AI/1.0 (agricultural-location-search; contact@agrovision.ai)"},
            timeout=(3.0, 4.0),
        )
        if response.status_code == 429:
            mark_nominatim_rate_limited(60)
            return []
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            return []

        results = []
        seen = set()
        for item in payload:
            location = _format_nominatim(item)
            if not location:
                continue
            key = location["formatted"].lower()
            if key not in seen:
                results.append(location)
                seen.add(key)

        if results:
            logger.info("Location provider Nominatim success for %r: %d results", query, len(results))
        return results
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 429:
            mark_nominatim_rate_limited(60)
        return []
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Location provider Nominatim failure for %r: %s", query, exc)
        return []


def _search_locationiq(query):
    api_key = os.getenv("LOCATIONIQ_API_KEY")
    if not api_key:
        return []

    for variant in _query_variants(query):
        try:
            response = requests.get(
                LOCATIONIQ_URL,
                params={
                    "key": api_key,
                    "q": variant,
                    "format": "json",
                    "addressdetails": 1,
                    "countrycodes": "in",
                    "limit": 10,
                },
                headers={"User-Agent": "AgroVision-AI/1.0 (agricultural-location-search; contact@agrovision.ai)"},
                timeout=(3.0, 5.0),
            )
            response.raise_for_status()
            payload = response.json()
            locations = [_format_nominatim(item) for item in payload if isinstance(item, dict)]
            locations = [item for item in locations if item]
            if locations:
                logger.info("Location provider LocationIQ success for %r: %d results", query, len(locations))
                return locations
        except (requests.RequestException, ValueError) as exc:
            logger.warning("Location provider LocationIQ failure for %r: %s", variant, exc)
    return []


def _format_photon(item):
    properties = item.get("properties") or {}
    geometry = item.get("geometry") or {}
    coordinates = geometry.get("coordinates") or []
    if len(coordinates) < 2:
        return None
    name = _clean(properties.get("name"))
    district = _clean(properties.get("district") or properties.get("county"))
    state = _clean(properties.get("state") or district)
    country = _clean(properties.get("country")) or "India"
    countrycode = _clean(properties.get("countrycode")).lower()

    is_india = (
        countrycode in {"in", "ind"}
        or "india" in country.lower()
        or "bharat" in country.lower()
    )
    if not name or not is_india:
        return None

    formatted = ", ".join(dict.fromkeys(part for part in (name, district, state, "India") if part))
    return {
        "name": name,
        "display_name": formatted,
        "district": district or None,
        "state": state or None,
        "country": "India",
        "formatted": formatted,
        "latitude": float(coordinates[1]),
        "longitude": float(coordinates[0]),
        "source": "Photon OpenStreetMap",
    }


def _search_photon(query):
    try:
        response = requests.get(
            PHOTON_URL,
            params={"q": query, "limit": 10, "lang": "en"},
            headers={"User-Agent": "AgroVision-AI/1.0 (agricultural-location-search; contact@agrovision.ai)"},
            timeout=(3.0, 5.0),
        )
        response.raise_for_status()
        payload = response.json()
        locations = [_format_photon(item) for item in payload.get("features", [])]
        locations = [item for item in locations if item]
        if locations:
            logger.info("Location provider Photon success for %r: %d results", query, len(locations))
        return locations
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Location provider Photon failure for %r: %s", query, exc)
        return []


def _search_secondary(query):
    locations = _search_locationiq(query)
    ranked = _rank_locations(query, locations)
    if ranked:
        return ranked

    locations = _search_photon(query)
    ranked = _rank_locations(query, locations)
    if ranked:
        return ranked

    if len(query) >= 3 and not re.search(r"\bindia\b", query, re.IGNORECASE):
        locations = _search_photon(f"{query}, India")
        ranked = _rank_locations(query, locations)
        if ranked:
            return ranked
    return []


def _rank_locations(query, locations):
    if not locations:
        return []
    terms = [term for term in re.split(r"[\s,]+", query.lower()) if term and term != "india"]
    primary_term = terms[0] if terms else query.lower()

    def score(item):
        name = item["name"].lower()
        formatted = item["formatted"].lower()
        exact = int(name == query.lower())
        starts = int(name.startswith(primary_term))
        primary_name_hit = int(primary_term in name)
        name_similarity = SequenceMatcher(None, primary_term, name).ratio()
        name_hits = sum(term in name for term in terms)
        formatted_hits = sum(term in formatted for term in terms)
        return exact, starts, primary_name_hit, name_similarity, name_hits, formatted_hits

    relevant = [
        item for item in locations
        if primary_term in item["formatted"].lower()
        or SequenceMatcher(None, primary_term, item["name"].lower()).ratio() >= 0.4
        or item["name"].lower().startswith(primary_term)
    ]
    candidates = relevant if relevant else locations
    return sorted(candidates, key=score, reverse=True)[:8]


def _search_serpapi(query):
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        return []
    try:
        response = requests.get(
            SERPAPI_LOCATIONS_URL,
            params={"q": query, "limit": 10, "api_key": api_key},
            timeout=(3.0, 5.0),
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Location provider SerpApi failure for %r: %s", query, exc)
        return []
    raw_locations = payload if isinstance(payload, list) else payload.get("locations", [])
    results = []
    seen = set()
    for item in raw_locations:
        if not isinstance(item, dict) or not _india_location(item):
            continue
        location = _format_location(item)
        key = location["formatted"].lower()
        if location["name"] and key not in seen:
            results.append(location)
            seen.add(key)
    if results:
        logger.info("Location provider SerpApi success for %r: %d results", query, len(results))
    else:
        logger.warning("Location provider SerpApi returned no results for %r", query)
    return results


@lru_cache(maxsize=512)
def search_locations(query):
    query = _clean(query)
    if len(query) < 2:
        return []

    providers_attempted = 0
    providers_failed = 0

    # 1. Primary: Photon / LocationIQ (fast OSM geocoding, autocomplete-optimized, no 1 req/s bottleneck)
    providers_attempted += 1
    try:
        sec_results = _search_secondary(query)
        ranked = _rank_locations(query, sec_results)
        if ranked:
            return ranked
    except Exception as exc:
        logger.warning("Primary geocoding search failed for %r: %s", query, exc)
        providers_failed += 1

    # 2. Fallback: Nominatim (unless rate-limited)
    if not is_nominatim_rate_limited():
        providers_attempted += 1
        try:
            nom_results = _search_nominatim(query)
            ranked = _rank_locations(query, nom_results)
            if ranked:
                return ranked
        except Exception as exc:
            logger.warning("Nominatim search failed for %r: %s", query, exc)
            providers_failed += 1

    # 3. SerpApi (fallback)
    if os.getenv("SERPAPI_KEY"):
        providers_attempted += 1
        try:
            serp_results = _search_serpapi(query)
            ranked = _rank_locations(query, serp_results)
            if ranked:
                return ranked
        except Exception as exc:
            logger.warning("SerpApi search failed for %r: %s", query, exc)
            providers_failed += 1

    # If all attempted providers failed (network error, timeout, etc.)
    if providers_attempted > 0 and providers_failed >= providers_attempted:
        raise ProviderUnavailableError("Location search temporarily unavailable")

    # Providers succeeded and found 0 matching Indian locations
    return []


def resolve_location_details(location):
    location = _clean(location)
    if not location:
        return {"formatted": location, "latitude": None, "longitude": None}

    try:
        results = search_locations(location)
    except Exception:
        results = []

    exact = next(
        (item for item in results if item["formatted"].lower() == location.lower()),
        None,
    )
    selected = exact or (results[0] if results else None)

    selected_matches_query = selected and (
        selected is exact
        or _clean(selected.get("name")).lower() in location.lower()
    )
    if selected_matches_query and selected.get("latitude") is not None and selected.get("longitude") is not None:
        return selected

    if selected and selected.get("latitude") is not None and selected.get("longitude") is not None:
        return selected

    for item in results:
        if item.get("latitude") is not None and item.get("longitude") is not None:
            return item

    if selected:
        return selected
    return {"formatted": location, "latitude": None, "longitude": None}
