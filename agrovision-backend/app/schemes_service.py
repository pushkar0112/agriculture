import os
from functools import lru_cache
from urllib.parse import urlparse

import serpapi

from app.location_service import resolve_location_details

OFFICIAL_HOSTS = {
    "myscheme.gov.in",
    "india.gov.in",
}


def _state_from_location(location):
    details = resolve_location_details(location)
    if details.get("state"):
        return details["state"]

    parts = [part.strip() for part in location.split(",") if part.strip()]
    if parts and parts[-1].lower() == "india":
        parts.pop()
    return parts[-1] if parts else None


def _official_source(url):
    hostname = (urlparse(url).hostname or "").lower().removeprefix("www.")
    if hostname in OFFICIAL_HOSTS or hostname.endswith(".gov.in"):
        if hostname == "myscheme.gov.in" or hostname.endswith(".myscheme.gov.in"):
            return "myScheme"
        return hostname
    return None


def _level_for_result(result, state):
    searchable = " ".join(
        str(result.get(key) or "")
        for key in ("title", "snippet", "link")
    ).lower()
    return "State" if state and state.lower() in searchable else "Central Government"


def _is_relevant_result(result, crop):
    searchable = " ".join(
        str(result.get(key) or "")
        for key in ("title", "snippet", "link")
    ).lower()
    relevance_terms = (
        "scheme", "yojana", "mission", "subsid", "agricultur", "horticultur",
        "farmer", "rkvy", "atma", "pm-kisan",
    )
    if not any(term in searchable for term in relevance_terms):
        return False
    title = str(result.get("title") or "").lower()
    known_scheme_terms = (
        "pm-kisan", "pmfby", "rashtriya krishi vikas", "rkvy", "nfsm", "midh",
        "nmsa", "pkvy", "atma", "agri infrastructure", "micro irrigation",
        "per drop more crop", "ami scheme",
    )
    title_scheme_terms = known_scheme_terms + (
        "scheme", "yojana", "mission", "subsid", "farmer", "agriculture", "horticulture",
    )
    if not any(term in title for term in title_scheme_terms):
        return False
    if any(term in title for term in ("homepage", "home |", "e-governance portal")):
        return False
    if "truth about" in searchable and "scheme" not in searchable and "yojana" not in searchable:
        return False
    return crop.lower() in searchable or any(
        term in searchable for term in ("agricultur", "horticultur", "scheme", "yojana", "subsid")
    )


def _scheme_from_result(result, state):
    url = result.get("link") or ""
    source = _official_source(url)
    if not source or not result.get("title"):
        return None

    return {
        "name": result["title"].strip(),
        "level": _level_for_result(result, state),
        "state": state if _level_for_result(result, state) == "State" else None,
        "description": result.get("snippet") or None,
        "benefits": None,
        "eligibility": None,
        "application_process": None,
        "official_url": url,
        "source": source,
    }


def _search(client, query):
    response = client.search({
        "engine": "google",
        "q": query,
        "gl": "in",
        "hl": "en",
        "num": 10,
    })
    return response.get("organic_results", [])


@lru_cache(maxsize=128)
def search_schemes(crop, location):
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        raise RuntimeError("SERPAPI_KEY is not configured")

    crop = crop.strip()
    location = location.strip()
    state = _state_from_location(location)
    if not crop or not location:
        return {
            "crop": crop,
            "location": location,
            "state": state,
            "schemes": [],
            "source": "Government sources",
        }

    client = serpapi.Client(api_key=api_key)
    state_query = f'"{crop}" agriculture scheme subsidy farmer {state or location} India site:gov.in'
    central_query = f'"{crop}" farmer agriculture scheme India (site:myscheme.gov.in OR site:gov.in)'

    results = []
    seen = set()
    for query in (state_query, central_query):
        for raw_result in _search(client, query):
            if not _is_relevant_result(raw_result, crop):
                continue
            scheme = _scheme_from_result(raw_result, state)
            if not scheme or scheme["official_url"] in seen:
                continue
            seen.add(scheme["official_url"])
            results.append(scheme)
            if len(results) >= 8:
                break
        if len(results) >= 8:
            break

    return {
        "crop": crop,
        "location": location,
        "state": state,
        "schemes": results,
        "source": "Government sources",
    }
