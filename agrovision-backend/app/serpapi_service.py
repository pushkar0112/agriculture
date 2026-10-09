import os
import serpapi 
import logging
import re

logger = logging.getLogger(__name__)


def normalize_weather_location(location, name=None, state=None, country=None):
    """Reduce detailed OSM labels to a stable weather-search location."""
    if isinstance(location, dict):
        name = location.get("name") or name
        state = location.get("state") or state
        country = location.get("country") or country
        location = location.get("formatted") or ""

    location = re.sub(r"\s+", " ", str(location or "").strip())
    parts = [part.strip() for part in location.split(",") if part.strip()]
    country = (country or "India").strip()

    if not name and parts:
        name = parts[0]
    if not state and len(parts) >= 2:
        state = parts[-2] if parts[-1].lower() == "india" else parts[-1]

    normalized = [value.strip() for value in (name, state, country) if value and value.strip()]
    return ", ".join(dict.fromkeys(normalized)) or location


def normalize_agriculture_location(location: str) -> str:
    """Reduce detailed OSM/administrative location labels to a concise provider location.

    Examples:
        Nargund, Naragunda taluk, Karnataka, India -> Nargund, Karnataka, India
        Rabakavi, Bilagi, Karnataka, India -> Rabakavi, Karnataka, India
        Belagavi, Belagavi taluk, Karnataka, India -> Belagavi, Karnataka, India
        Jaipur, Jaipur Tehsil, Rajasthan, India -> Jaipur, Rajasthan, India
    """
    if not location:
        return "India"

    cleaned = re.sub(r"\s+", " ", str(location).strip())
    parts = [p.strip() for p in cleaned.split(",") if p.strip()]
    if not parts:
        return "India"

    # Remove trailing administrative descriptor from the primary locality if attached
    primary = re.sub(
        r"(?i)\s+(taluk|taluka|tehsil|mandal|block|subdistrict)$", "", parts[0]
    ).strip()
    primary = primary or parts[0]

    country = "India"
    state = None

    if len(parts) == 1:
        if parts[0].lower() in ("india", "bharat"):
            return "India"
        return f"{primary}, India"

    if parts[-1].lower() in ("india", "bharat", "in", "ind"):
        if len(parts) >= 3:
            state = parts[-2]
        elif len(parts) == 2:
            state = None
    else:
        state = parts[-1]

    tokens = [primary]
    if (
        state
        and state.lower() != primary.lower()
        and state.lower() not in ("india", "bharat")
    ):
        tokens.append(state)
    tokens.append(country)

    return ", ".join(dict.fromkeys(tokens))


def search_agricultural_information(disease: str, location: str):
    api_key = os.getenv("SERPAPI_KEY")
    disease = str(disease or "").strip()
    raw_location = str(location or "").strip()
    normalized_loc = normalize_agriculture_location(raw_location)

    if not api_key:
        logger.warning("SERPAPI_KEY is not configured")
        return {
            "available": False,
            "message": "Agricultural information is temporarily unavailable.",
            "sources": [],
            "location": raw_location,
            "normalized_location": normalized_loc,
            "disease": disease,
        }

    client = serpapi.Client(api_key=api_key)
    query = (
        f"{disease} treatment symptoms prevention agriculture "
        f"{normalized_loc}"
    )

    request_params = {
        "engine": "google",
        "q": query,
        "location": normalized_loc,
        "gl": "in",
        "hl": "en",
        "num": 10,
    }

    results = None

    # Step 1: Search with normalized location
    try:
        results = client.search(request_params)
    except Exception as exc:
        logger.warning(
            "Agricultural search failed with location %r: %s. Retrying without location parameter.",
            normalized_loc,
            type(exc).__name__,
        )
        # Step 2: Retry ONCE with the normalized location in query but WITHOUT the location parameter
        try:
            retry_params = {
                "engine": "google",
                "q": query,
                "gl": "in",
                "hl": "en",
                "num": 10,
            }
            results = client.search(retry_params)
            logger.info("Agricultural search retry succeeded without location parameter for %r", query)
        except Exception as retry_exc:
            logger.warning(
                "Agricultural search retry also failed for query %r: %s",
                query,
                type(retry_exc).__name__,
            )
            return {
                "available": False,
                "message": "Agricultural information is temporarily unavailable.",
                "sources": [],
                "location": raw_location,
                "normalized_location": normalized_loc,
                "disease": disease,
            }

    res_dict = (
        results.as_dict()
        if hasattr(results, "as_dict")
        else (dict(results) if hasattr(results, "items") else {})
    )
    organic_results = res_dict.get("organic_results", [])
    sources = []

    for item in organic_results[:8]:
        if not hasattr(item, "get"):
            continue
        sources.append({
            "title": item.get("title") or "Agricultural Guidance",
            "link": item.get("link") or "#",
            "snippet": item.get("snippet") or "",
            "source": item.get("source") or "Agricultural Source",
        })

    return {
        "available": True,
        "message": None,
        "query": query,
        "location": raw_location,
        "normalized_location": normalized_loc,
        "sources": sources,
    }


import os
import serpapi


def search_weather(location: str, name=None, state=None, country=None, latitude=None, longitude=None):
    api_key = os.getenv("SERPAPI_KEY")

    if not api_key:
        raise RuntimeError("SERPAPI_KEY is not configured")

    normalized_location = normalize_weather_location(
        location,
        name=name,
        state=state,
        country=country,
    )

    client = serpapi.Client(api_key=api_key)

    request = {
            "engine": "google",
            "q": f"What's the weather in {normalized_location}?",
            "location": normalized_location,
            "gl": "in",
            "hl": "en",
        }
    try:
        results = client.search(request)
    except Exception as exc:
        logger.warning("Weather provider failed for %r with location parameter: %s", normalized_location, exc)
        try:
            retry_request = {key: value for key, value in request.items() if key != "location"}
            results = client.search(retry_request)
            logger.info("Weather provider retry succeeded without location parameter for %r", normalized_location)
        except Exception as retry_exc:
            logger.warning("Weather provider retry failed for %r: %s", normalized_location, retry_exc)
            return {
                "location": normalized_location,
                "weather": None,
                "forecast": [],
                "message": "Weather information is currently unavailable for this location.",
            }

    answer_box = results.get("answer_box")

    # Google weather result
    if answer_box and answer_box.get("type") == "weather_result":
        return {
            "location": normalized_location,
            "weather": answer_box,
            "answer_box": answer_box,
            "forecast": answer_box.get("forecast", []),
        }

    # Fallback if Google returns the weather answer under another structure
    return {
        "location": normalized_location,
        "weather": None,
        "answer_box": answer_box,
        "forecast": [],
        "search_results": results.get("organic_results", [])[:5],
        "message": "Weather information is currently unavailable for this location." if not answer_box else None,
    }