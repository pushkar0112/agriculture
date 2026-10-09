import { MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";

export default function LocationSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Search an Indian location",
  enabled = true,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const latestRequest = useRef(0);
  const lastQuery = useRef("");

  // Close suggestions when user clicks outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const query = value.trim();
    setActiveIndex(-1);

    if (query.length < 2 || query === lastQuery.current) {
      if (query.length < 2) {
        setSuggestions([]);
        setError("");
        setOpen(false);
      }
      return undefined;
    }

    const controller = new AbortController();
    const requestId = ++latestRequest.current;

    const timer = window.setTimeout(async () => {
      lastQuery.current = query;
      setLoading(true);
      setError("");
      setOpen(true);

      try {
        const data = await apiFetch(
          `/api/locations/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (requestId !== latestRequest.current) return;
        setSuggestions(data?.locations || []);
        setError("");
      } catch (err) {
        // Cancelled or superseded request: ignore cleanly, preserve current state
        if (err.name === "AbortError" || requestId !== latestRequest.current) {
          return;
        }
        setSuggestions([]);
        if (
          err.status === 503 ||
          err.status === 502 ||
          err.isNetworkError ||
          err.message?.includes("temporarily unavailable")
        ) {
          setError("Location search temporarily unavailable");
        } else {
          setError(err.message || "Location search temporarily unavailable");
        }
      } finally {
        if (requestId === latestRequest.current) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, value]);

  const choose = (suggestion) => {
    lastQuery.current = suggestion.formatted;
    setSuggestions([]);
    setOpen(false);
    setError("");
    onSelect(suggestion);
  };

  const handleKeyDown = (event) => {
    if (!open || (!suggestions.length && !error)) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="location-search" ref={containerRef}>
      <div className="location-search-input">
        <Search size={17} />
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            if (event.target.value.trim().length >= 2) {
              setOpen(true);
            }
          }}
          onFocus={() => {
            if (value.trim().length >= 2) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search location"
          aria-expanded={open}
          aria-controls="location-suggestions"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="location-clear"
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setError("");
              setOpen(false);
            }}
            aria-label="Clear location"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open && (
        <div className="location-suggestions" id="location-suggestions" role="listbox">
          {loading && (
            <div className="location-state">Searching locations...</div>
          )}

          {!loading && error && (
            <div className="location-state location-error">{error}</div>
          )}

          {!loading && !error && !suggestions.length && value.trim().length >= 2 && (
            <div className="location-state">No matching Indian locations found</div>
          )}

          {!loading &&
            !error &&
            suggestions.map((suggestion, index) => {
              const subtitle = [
                suggestion.district,
                suggestion.state,
                suggestion.country,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`location-suggestion ${index === activeIndex ? "selected" : ""}`}
                  key={`${suggestion.formatted}-${index}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(suggestion)}
                >
                  <MapPin size={16} />
                  <span>
                    <strong>{suggestion.name || suggestion.formatted}</strong>
                    {subtitle && <small>{subtitle}</small>}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
