import React, { useEffect, useState } from 'react';
import {
  Activity, BarChart3, Bell, ChevronDown, CloudSun, Droplets,
  History, Leaf, LogOut, MapPin, Search, Settings, Sprout, TrendingUp, AlertTriangle, Database,
  UploadCloud, Wind, ShieldCheck, ScanLine, Menu, X, ExternalLink
} from 'lucide-react';

import { apiFetch } from "./api";
import { useAuth } from "./auth/AuthContext";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LocationSearch from "./components/LocationSearch";
import GovernmentSchemes from "./pages/GovernmentSchemes";

const crops = [
  { name: 'Tomato', health: 'Healthy', value: '82%', tone: 'dark', emoji: '🍅' },
  { name: 'Mango', health: 'Healthy', value: '91%', tone: 'light', emoji: '🥭' },
  { name: 'Potato', health: 'Monitor', value: '68%', tone: 'dark', emoji: '🥔' },
  { name: 'Chili', health: 'Healthy', value: '87%', tone: 'light', emoji: '🌶️' }
];

function Sidebar({ active, setActive, open, setOpen, onLogout }) {
  const items = [
    ['Dashboard', Activity],
    ['Disease Detection', ScanLine],
    ['Weather', CloudSun],
    ['Market Prices', TrendingUp],
    ['Government Schemes', Sprout],
    ['My Crops', Sprout],
    ['History', History],
    ['Insights', BarChart3],
    ['Settings', Settings]
  ];
  return <>
    {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={22}/></div><span>AgroVision</span><button className="close-sidebar" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <nav>
        {items.map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => {setActive(label); setOpen(false)}}><Icon size={19}/><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-promo">
        <div className="promo-leaf">🌱</div>
        <div><strong>Smart crop care</strong><p>AI-powered disease insights for your field.</p></div>
      </div>
      <button className="logout" onClick={onLogout}><LogOut size={18}/> Logout</button>
    </aside>
  </>
}

function Topbar({ setOpen, location, onLogout }) {
  return <header className="topbar">
    <button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={22}/></button>
    <div className="location-pill"><MapPin size={17}/><span>{location.replace(", India", "")}</span><ChevronDown size={15}/></div>
    <div className="search"><Search size={18}/><input placeholder="Search by crop, disease, or metric" /></div>
    <button className="notification"><Bell size={19}/><span></span></button>
    <div className="profile"><div className="avatar">P</div><div><strong>Farmer</strong><small>Field Manager</small></div><ChevronDown size={15}/></div>
    <button className="topbar-logout" onClick={onLogout} title="Log out" aria-label="Log out">
      <LogOut size={16}/>
      <span>Logout</span>
    </button>
  </header>
}

function WeatherCard({ location, locationDetails, locationInput, setLocationInput, onSelect, enabled = true }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWeather = async (signal) => {
    if (!location.trim()) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ location });
      if (locationDetails?.name) params.set("name", locationDetails.name);
      if (locationDetails?.state) params.set("state", locationDetails.state);
      if (locationDetails?.country) params.set("country", locationDetails.country);
      if (locationDetails?.latitude != null) params.set("latitude", locationDetails.latitude);
      if (locationDetails?.longitude != null) params.set("longitude", locationDetails.longitude);
      const data = await apiFetch(`/api/weather?${params.toString()}`, { signal });

      const weatherData = data.weather || data.answer_box;

      if (!weatherData) {
        throw new Error(data.message || "Weather information is currently unavailable for this location.");
      }

      setWeather(weatherData);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Weather:", err);
      setError(err.message || "Unable to fetch weather");
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetchWeather(controller.signal);
    return () => controller.abort();
  }, [enabled, location, locationDetails]);

  return (
    <div className="weather-card">
      <div className="weather-header">
        <div>
          <span className="card-label">WEATHER</span>

          <h3>
            {weather?.location || location}
          </h3>
        </div>

        <span className="weather-icon">🌤️</span>
      </div>

      <LocationSearch
        value={locationInput}
        onChange={setLocationInput}
        onSelect={onSelect}
        placeholder="Search an Indian location"
        enabled={enabled}
      />

      {loading && (
        <div className="weather-loading">
          Loading weather...
        </div>
      )}

      {error && (
        <div className="weather-error">
          {error}
        </div>
      )}

      {weather && !loading && (
        <>
          <div className="weather-main">
            <div className="temperature">
              {weather.temperature}°C
            </div>

            <div className="weather-condition">
              {weather.weather}
            </div>
          </div>

          <div className="weather-details">
            <div>
              <span>💧</span>
              <strong>{weather.humidity}</strong>
              <small>Humidity</small>
            </div>

            <div>
              <span>💨</span>
              <strong>{weather.wind}</strong>
              <small>Wind</small>
            </div>

            <div>
              <span>🌧️</span>
              <strong>{weather.precipitation}</strong>
              <small>Rain</small>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DiseaseCard() {
  return <section className="disease-card">
    <div className="card-heading"><div><span className="eyebrow">LATEST SCAN</span><h3>Plant health</h3></div><span className="status-dot">Healthy</span></div>
    <div className="disease-body"><div className="plant-icon">🍅</div><div><h4>Tomato</h4><p>No disease detected</p><div className="confidence"><span>Confidence</span><b>96.4%</b></div><div className="progress"><i style={{width:'96.4%'}} /></div></div></div>
  </section>
}

function UploadCard({ onDetect }) {
  const [file, setFile] = useState(null);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
  };

  return (
    <section className="upload-card">
      <div className="upload-copy">
        <span className="eyebrow">AI DISEASE DETECTION</span>

        <h2>Check your plant health</h2>

        <p>
          Upload a clear leaf or plant image. Our trained model will identify
          possible diseases and then fetch location-aware agricultural
          information.
        </p>
      </div>

      <label className="dropzone">
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="upload-icon">
          <UploadCloud size={26} />
        </div>

        <strong>
          {file ? file.name : "Drop your plant image here"}
        </strong>

        <span>
          {file
            ? "Image selected — ready to analyze"
            : "PNG or JPG · up to 10 MB"}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector(".dropzone input")?.click();
          }}
        >
          Browse image
        </button>
      </label>

      <button
        className="primary-btn"
        disabled={!file}
        onClick={() => onDetect(file)}
      >
        <ScanLine size={18} />

        {file ? "Analyze plant" : "Select image first"}
      </button>
    </section>
  );
}

function CropPrices({ location, locationCoordinates, enabled = true }) {
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPrices = async (signal) => {
    if (!location.trim()) return;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ location });
      if (locationCoordinates?.latitude != null) params.set("latitude", locationCoordinates.latitude);
      if (locationCoordinates?.longitude != null) params.set("longitude", locationCoordinates.longitude);
      const data = await apiFetch(`/api/prices?${params.toString()}`, { signal });

      setPrices(data.prices || []);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Crop prices:", err);
      if (err.isNetworkError) {
        setError("Unable to connect to AgroVision AI backend.");
      } else if (err.status >= 500 || err.message?.includes("temporarily unavailable")) {
        setError("Market data is temporarily unavailable. Please try again.");
      } else {
        setError(err.message || "Market data is temporarily unavailable. Please try again.");
      }
      setPrices(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetchPrices(controller.signal);
    return () => controller.abort();
  }, [enabled, location, locationCoordinates]);

  const emojiFor = (commodity) => {
    if (commodity === "Tomato") return "🍅";
    if (commodity === "Potato") return "🥔";
    return "🌶️";
  };

  return (
    <section className="market-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">CROP MARKET</span>
          <h3>Current crop prices</h3>
        </div>
        <span className="select-chip">Rs./Quintal</span>
      </div>

      {loading && <div className="market-loading">Loading market prices...</div>}
      {error && !loading && <div className="market-error">{error}</div>}

      {!loading && !error && prices && prices.length === 0 && (
        <div className="market-empty">No market data available for this location.</div>
      )}

      {!loading && !error && prices && prices.length > 0 && (
        <div className="price-grid">
          {prices.map((item) => {
            const latest = item.data?.[0];

            return (
              <div className="price-card" key={item.commodity}>
                <div className="price-card-top">
                  <span className="price-emoji">{emojiFor(item.commodity)}</span>
                  <div>
                    <strong>{item.commodity}</strong>
                    <small>{latest?.market || "No recent market data"}</small>
                  </div>
                </div>

                {latest ? (
                  <>
                    <div className="market-location-note">
                      {item.fallback_used ? "Nearest available mandi" : "Market near your location"}
                      {item.market && <> · {item.market}</>}
                      {item.distance_km != null && <> · {item.distance_km} km</>}
                    </div>
                    <div className="price-value">
                      ₹{Number(latest.modal_price || 0).toLocaleString("en-IN")}
                      <small>/ quintal</small>
                    </div>

                    <div className="price-range">
                      <span>Min ₹{Number(latest.min_price || 0).toLocaleString("en-IN")}</span>
                      <span>Max ₹{Number(latest.max_price || 0).toLocaleString("en-IN")}</span>
                    </div>

                    <small className="price-date">Latest: {latest.date}</small>
                  </>
                ) : (
                  <div className="no-price">No nearby market data is currently available for this crop.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PriceHistory({ location, locationCoordinates, enabled = true }) {
  const [commodity, setCommodity] = useState("Tomato");
  const [history, setHistory] = useState([]);
  const [marketInfo, setMarketInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const fetchHistory = async () => {
      if (!location.trim()) return;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          location,
          commodity,
          days: "30",
        });
        if (locationCoordinates?.latitude != null) params.set("latitude", locationCoordinates.latitude);
        if (locationCoordinates?.longitude != null) params.set("longitude", locationCoordinates.longitude);

        const data = await apiFetch(
          `/api/prices/history?${params.toString()}`,
          { signal: controller.signal }
        );

        setHistory(data.history || []);
        setMarketInfo(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Price history:", err);
        if (err.isNetworkError) {
          setError("Unable to connect to AgroVision AI backend.");
        } else if (err.status >= 500 || err.message?.includes("temporarily unavailable")) {
          setError("Market data is temporarily unavailable. Please try again.");
        } else {
          setError(err.message || "Market data is temporarily unavailable. Please try again.");
        }
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    return () => controller.abort();
  }, [enabled, location, commodity, locationCoordinates]);

  const values = history
    .map((item) => Number(item.modal_price))
    .filter(Number.isFinite);

  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  const latest = history.length ? history[history.length - 1] : null;

  const chartWidth = 640;
  const chartHeight = 220;
  const padding = 20;

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? chartWidth / 2
        : padding +
          (index * (chartWidth - padding * 2)) / (values.length - 1);

    const range = Math.max(max - min, 1);
    const y =
      chartHeight -
      padding -
      ((value - min) / range) * (chartHeight - padding * 2);

    return `${x},${y}`;
  }).join(" ");

  return (
    <section className="price-history-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">MARKET TREND</span>
          <h3>Crop price history</h3>
        </div>

        <select
          className="crop-select"
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
        >
          <option>Tomato</option>
          <option>Potato</option>
          <option>Green Chilli</option>
        </select>
      </div>

      {marketInfo?.market && (
        <div className="history-market-note">
          <strong>{marketInfo.fallback_used ? "Nearest available mandi" : "Market near your location"}:</strong> {marketInfo.market}
          {marketInfo.distance_km != null && <> · {marketInfo.distance_km} km from {marketInfo.requested_location || location}</>}
          {marketInfo.fallback_used && <small>No mandi data was available for your exact location. Showing the nearest market with available data.</small>}
        </div>
      )}

      {loading && <div className="market-loading">Loading price history...</div>}
      {error && !loading && <div className="market-error">{error}</div>}

      {!loading && !error && history.length > 0 && (
        <>
          <div className="history-summary">
            <div>
              <span>Latest</span>
              <strong>₹{Number(latest.modal_price).toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <span>30-day low</span>
              <strong>₹{Number(min).toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <span>30-day high</span>
              <strong>₹{Number(max).toLocaleString("en-IN")}</strong>
            </div>
          </div>

          <div className="price-chart">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
              {[1, 2, 3, 4].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2={chartWidth}
                  y1={(line * chartHeight) / 5}
                  y2={(line * chartHeight) / 5}
                  className="chart-grid-line"
                />
              ))}

              <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="history-labels">
              <span>{history[0]?.date}</span>
              <span>{history[history.length - 1]?.date}</span>
            </div>
          </div>

          <div className="market-source">
            <span>{latest.market || "Local APMC"}</span>
            <span>Source: AGMARKNET</span>
          </div>
        </>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="market-empty">
          No market data available for this location.
        </div>
      )}
    </section>
  );
}

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
  try {
    setLoading(true);
    setError("");

    const data = await apiFetch("/api/history?limit=200");

    setHistory(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("History:", err);
    setError(err.message || "Unable to load prediction history");
    setHistory([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <main className="content">
      <div className="welcome">
        <div>
          <span className="eyebrow">SCAN HISTORY</span>
          <h1>Prediction history 📋</h1>
          <p>Review your previous AgroVision AI plant health scans.</p>
        </div>

        <button className="location-button" onClick={fetchHistory}>
          ↻ Refresh
        </button>
      </div>

      <section className="history-page-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">AI SCANS</span>
            <h3>Previous predictions</h3>
          </div>
          <span className="select-chip">{history.length} scans</span>
        </div>

        {loading && (
          <div className="history-page-state">
            <div className="small-loader"></div>
            <p>Loading prediction history...</p>
          </div>
        )}

        {!loading && error && (
          <div className="history-page-error">
            <strong>Unable to load history</strong>
            <p>{error}</p>
            <button className="primary-btn" onClick={fetchHistory}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="history-page-state">
            <History size={42} />
            <h3>No scans yet</h3>
            <p>Your completed plant analyses will appear here.</p>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plant</th>
                  <th>Diagnosis</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                      <small>
                        {new Date(item.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </td>

                    <td>
                      <strong>{item.plant}</strong>
                      <small>{item.filename || "Plant image"}</small>
                    </td>

                    <td>{item.disease}</td>

                    <td>
                      <strong>{Number(item.confidence).toFixed(2)}%</strong>
                    </td>

                    <td>
                      <span
                        className={`history-status ${
                          item.is_healthy ? "healthy" : "disease"
                        }`}
                      >
                        {item.is_healthy ? "Healthy" : "Disease Detected"}
                      </span>
                    </td>

                    <td>{item.location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}



function Insights({ location }) {
  const [history, setHistory] = useState([]);
  const [crops, setCrops] = useState([]);
  const [prices, setPrices] = useState([]);

  const [commodity, setCommodity] = useState("Tomato");

  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);

  const [error, setError] = useState("");
  const [marketError, setMarketError] = useState("");

  const safeLocation = (
    location || "Bangalore, Karnataka, India"
  ).trim();

  /*
   * ==========================================
   * LOAD CORE INSIGHTS
   * History + Crops ONLY
   * ==========================================
   */
  const loadCoreInsights = async () => {
  setLoading(true);
  setError("");

  try {
  const [historyData, cropsData] = await Promise.all([
  apiFetch("/api/history?limit=200"),
  apiFetch("/api/crops"),
]);

      console.log(
        "========== INSIGHTS CORE =========="
      );

      console.log(
        "History:",
        historyData
      );

      console.log(
        "History count:",
        Array.isArray(historyData)
          ? historyData.length
          : "NOT ARRAY"
      );

      console.log(
        "Crops:",
        cropsData
      );

      console.log(
        "Crops count:",
        Array.isArray(cropsData)
          ? cropsData.length
          : "NOT ARRAY"
      );

      console.log(
        "==================================="
      );

      setHistory(
        Array.isArray(historyData)
          ? historyData
          : []
      );

      setCrops(
        Array.isArray(cropsData)
          ? cropsData
          : []
      );

    } catch (err) {
      console.error(
        "Insights core data:",
        err
      );

      setError(
        "Unable to load crop and scan data."
      );

      setHistory([]);
      setCrops([]);

    } finally {
      /*
       * IMPORTANT:
       * Core loading ends here.
       * Market API cannot keep this loading.
       */
      setLoading(false);
    }
  };


  /*
   * ==========================================
   * LOAD MARKET DATA SEPARATELY
   * ==========================================
   */
  const loadMarketData = async () => {
    setMarketLoading(true);
    setMarketError("");

    try {
      const controller =
        new AbortController();

      /*
       * AGMARKNET can be slow.
       * Give it 8 seconds only.
       */
      const timeout = setTimeout(() => {
        controller.abort();
      }, 20000);

      const url =
  `/api/prices/history` +
  `?location=${encodeURIComponent(safeLocation)}` +
  `&commodity=${encodeURIComponent(commodity)}` +
  `&days=30`;

      console.log(
        "AGMARKNET request:",
        url
      );

      const data = await apiFetch(
  url,
  {
    signal: controller.signal,
  }
);

clearTimeout(timeout);

      console.log(
        "AGMARKNET Insights history:",
        data
      );

      const marketHistory =
        Array.isArray(data?.history)
          ? data.history
          : [];

      setPrices(marketHistory);

    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error(
        "Market history:",
        err
      );

      /*
       * IMPORTANT:
       * Market failure should NOT break Insights.
       */
      setPrices([]);

      if (err?.isNetworkError) {
        setMarketError(
          "Unable to connect to AgroVision AI backend."
        );
      } else {
        setMarketError(
          "Market data is temporarily unavailable. Please try again."
        );
      }

    } finally {
      setMarketLoading(false);
    }
  };


  /*
   * ==========================================
   * INITIAL CORE LOAD
   * ==========================================
   */
  useEffect(() => {
    loadCoreInsights();
  }, [location]);


  /*
   * ==========================================
   * MARKET LOAD
   * ==========================================
   */
  useEffect(() => {
    loadMarketData();
  }, [location, commodity]);


  /*
   * ==========================================
   * INSIGHT CALCULATIONS
   * ==========================================
   */

  const totalScans =
    history.length;

  const healthyScans =
    history.filter(
      (item) => item.is_healthy
    ).length;

  const diseaseScans =
    history.filter(
      (item) => !item.is_healthy
    ).length;

  const healthyRate =
    totalScans > 0
      ? Math.round(
          (healthyScans / totalScans) * 100
        )
      : 0;


  /*
   * Disease distribution
   */
  const diseaseCounts =
    history.reduce(
      (acc, item) => {

        const name =
          item.disease || "Unknown";

        acc[name] =
          (acc[name] || 0) + 1;

        return acc;
      },
      {}
    );


  const diseaseEntries =
    Object.entries(diseaseCounts)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 5);


  const maxDiseaseCount =
    diseaseEntries.length > 0
      ? diseaseEntries[0][1]
      : 1;


  /*
   * Market calculations
   */
  const priceValues =
    prices
      .map(
        (item) =>
          Number(item.modal_price)
      )
      .filter(
        Number.isFinite
      );


  const latestPrice =
    priceValues.length
      ? priceValues[
          priceValues.length - 1
        ]
      : null;


  const lowestPrice =
    priceValues.length
      ? Math.min(...priceValues)
      : null;


  const highestPrice =
    priceValues.length
      ? Math.max(...priceValues)
      : null;


  const firstPrice =
    priceValues.length
      ? priceValues[0]
      : null;


  const priceChange =
    firstPrice &&
    latestPrice
      ? Math.round(
          ((latestPrice - firstPrice) /
            firstPrice) *
            100
        )
      : null;


  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <main className="content insights-page">

      {/* HEADER */}

      <div className="welcome">

        <div>

          <span className="eyebrow">
            FARM INTELLIGENCE
          </span>

          <h1>
            Insights & analytics 📊
          </h1>

          <p>
            Understand your crop health,
            AI scan activity, and local
            market trends using your
            AgroVision data.
          </p>

        </div>


        <button
          className="location-button"
          onClick={() => {
            loadCoreInsights();
            loadMarketData();
          }}
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : "↻ Refresh insights"}
        </button>

      </div>


      {/* CORE ERROR */}

      {error && (
        <div className="insights-error">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

          <button
            className="text-btn"
            onClick={loadCoreInsights}
          >
            Try again
          </button>

        </div>
      )}


      {/* CORE LOADING */}

      {loading ? (

        <section className="insights-loading">

          <div className="small-loader"></div>

          <h3>
            Building your farm insights...
          </h3>

          <p>
            Loading crop and scan data.
          </p>

        </section>

      ) : (

        <>

          {/* =================================
              STAT CARDS
          ================================= */}

          <div className="insights-stat-grid">

            <article className="insight-stat-card">

              <div className="insight-stat-icon">
                <Sprout size={20} />
              </div>

              <span>
                REGISTERED CROPS
              </span>

              <strong>
                {crops.length}
              </strong>

              <small>
                Tracked in My Crops
              </small>

            </article>


            <article className="insight-stat-card">

              <div className="insight-stat-icon">
                <ScanLine size={20} />
              </div>

              <span>
                AI SCANS
              </span>

              <strong>
                {totalScans}
              </strong>

              <small>
                Completed predictions
              </small>

            </article>


            <article className="insight-stat-card">

              <div className="insight-stat-icon healthy-icon">
                <ShieldCheck size={20} />
              </div>

              <span>
                HEALTHY SCANS
              </span>

              <strong>
                {healthyScans}
              </strong>

              <small>
                {totalScans
                  ? `${healthyRate}% of scans`
                  : "No scans yet"}
              </small>

            </article>


            <article className="insight-stat-card attention-card">

              <div className="insight-stat-icon attention-icon">
                <AlertTriangle size={20} />
              </div>

              <span>
                DISEASE SCANS
              </span>

              <strong>
                {diseaseScans}
              </strong>

              <small>
                Scans requiring attention
              </small>

            </article>

          </div>


          {/* =================================
              INSIGHTS GRID
          ================================= */}

          <div className="insights-grid">


            {/* DISEASE */}

            <section className="insight-card disease-breakdown">

              <div className="card-heading">

                <div>

                  <span className="eyebrow">
                    AI DIAGNOSTICS
                  </span>

                  <h3>
                    Disease distribution
                  </h3>

                </div>

                <span className="select-chip">
                  {totalScans} scans
                </span>

              </div>


              {diseaseEntries.length === 0 ? (

                <div className="insight-empty">

                  <BarChart3 size={34} />

                  <p>
                    Complete a plant scan
                    to see disease distribution.
                  </p>

                </div>

              ) : (

                <div className="disease-bars">

                  {diseaseEntries.map(
                    ([name, count]) => (

                      <div
                        className="disease-bar-row"
                        key={name}
                      >

                        <div className="disease-bar-label">

                          <span>
                            {name}
                          </span>

                          <strong>
                            {count}
                          </strong>

                        </div>


                        <div className="disease-bar-track">

                          <div
                            className="disease-bar-fill"
                            style={{
                              width:
                                `${Math.max(
                                  8,
                                  (count /
                                    maxDiseaseCount) *
                                    100
                                )}%`,
                            }}
                          />

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>


            {/* CROP HEALTH */}

            <section className="insight-card crop-health-card">

              <div className="card-heading">

                <div>

                  <span className="eyebrow">
                    MY CROPS
                  </span>

                  <h3>
                    Crop health overview
                  </h3>

                </div>

                <Sprout size={20} />

              </div>


              {crops.length === 0 ? (

                <div className="insight-empty">

                  <Sprout size={34} />

                  <p>
                    Add crops in My Crops
                    to track their status here.
                  </p>

                </div>

              ) : (

                <div className="crop-health-list">

                  {crops
                    .slice(0, 6)
                    .map((crop) => (

                      <div
                        className="crop-health-row"
                        key={crop.id}
                      >

                        <div>

                          <strong>
                            {crop.name}
                          </strong>

                          <span>
                            {crop.crop_type}
                          </span>

                        </div>

                        <b>
                          {crop.health_status ||
                            "Healthy"}
                        </b>

                      </div>

                    ))}

                </div>

              )}

            </section>


            {/* =================================
                MARKET INTELLIGENCE
            ================================= */}

            <section className="insight-card insight-wide">

              <div className="card-heading">

                <div>

                  <span className="eyebrow">
                    AGMARKNET
                  </span>

                  <h3>
                    Market intelligence
                  </h3>

                </div>


                <select
                  className="crop-select"
                  value={commodity}
                  onChange={(e) =>
                    setCommodity(
                      e.target.value
                    )
                  }
                >

                  <option>
                    Tomato
                  </option>

                  <option>
                    Potato
                  </option>

                  <option>
                    Green Chilli
                  </option>

                </select>

              </div>


              {marketLoading ? (

                <div className="insight-empty">

                  <div className="small-loader"></div>

                  <p>
                    Loading {commodity}
                    market prices...
                  </p>

                </div>

              ) : marketError ? (

                <div className="insight-empty">

                  <Database size={34} />

                  <p>
                    {marketError}
                  </p>

                  <button
                    className="text-btn"
                    onClick={loadMarketData}
                  >
                    Retry market data
                  </button>

                </div>

              ) : prices.length === 0 ? (

                <div className="insight-empty">

                  <Database size={34} />

                  <p>
                    No market history is
                    available for {commodity}.
                  </p>

                </div>

              ) : (

                <>

                  <div className="market-insight-stats">

                    <div>

                      <span>
                        Latest
                      </span>

                      <strong>
                        ₹
                        {Number(
                          latestPrice
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        30-day low
                      </span>

                      <strong>
                        ₹
                        {Number(
                          lowestPrice
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        30-day high
                      </span>

                      <strong>
                        ₹
                        {Number(
                          highestPrice
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Change
                      </span>

                      <strong>
                        {priceChange === null
                          ? "—"
                          : `${priceChange > 0 ? "+" : ""}${priceChange}%`}
                      </strong>

                    </div>

                  </div>


                  <div className="market-insight-chart">

                    {prices
                      .slice(-10)
                      .map(
                        (item, index) => {

                          const value =
                            Number(
                              item.modal_price
                            );

                          const max =
                            highestPrice ||
                            1;

                          const height =
                            Math.max(
                              10,
                              (value / max) *
                                100
                            );

                          return (

                            <div
                              className="market-bar"
                              key={`${item.date}-${index}`}
                            >

                              <div
                                className="market-bar-fill"
                                style={{
                                  height:
                                    `${height}%`,
                                }}
                                title={`₹${value}`}
                              />

                              <span>
                                {item.date
                                  ?.slice(5)}
                              </span>

                            </div>

                          );

                        }
                      )}

                  </div>


                  <div className="market-source">

                    <span>
                      Local APMC
                    </span>

                    <span>
                      Source: AGMARKNET
                    </span>

                  </div>

                </>

              )}

            </section>


            {/* =================================
                RECENT ACTIVITY
            ================================= */}

            <section className="insight-card insight-wide">

              <div className="card-heading">

                <div>

                  <span className="eyebrow">
                    ACTIVITY
                  </span>

                  <h3>
                    Recent activity
                  </h3>

                </div>

                <History size={20} />

              </div>


              {history.length === 0 ? (

                <div className="insight-empty">

                  <History size={34} />

                  <p>
                    No scan activity yet.
                  </p>

                </div>

              ) : (

                <div className="activity-list">

                  {history
                    .slice(0, 6)
                    .map((item) => (

                      <div
                        className="activity-item"
                        key={item.id}
                      >

                        <div className="activity-icon">

                          {item.is_healthy
                            ? <ShieldCheck size={18} />
                            : <AlertTriangle size={18} />}

                        </div>


                        <div>

                          <strong>
                            {item.plant}
                          </strong>

                          <span>
                            {item.disease}
                          </span>

                        </div>


                        <b>
                          {Number(
                            item.confidence
                          ).toFixed(1)}
                          %
                        </b>

                      </div>

                    ))}

                </div>

              )}

            </section>

          </div>

        </>

      )}

    </main>
  );
}
function MyCrops({ onFindSchemes }) {
  const emptyForm = {
    name: "",
    crop_type: "",
    location: "",
    planting_date: "",
    health_status: "Healthy",
    notes: "",
  };

  const [crops, setCrops] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCrops = async () => {
  try {
    setLoading(true);
    setError("");

    const data = await apiFetch("/api/crops");

    setCrops(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Fetch crops:", err);
    setError(err.message || "Unable to load crops");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchCrops();
}, []);

const updateField = (field, value) => {
  setForm((current) => ({ ...current, [field]: value }));
};

const addCrop = async (event) => {
  event.preventDefault();

  if (!form.name.trim() || !form.crop_type.trim() || !form.location.trim()) {
    return;
  }

  try {
    setSaving(true);
    setError("");

    const data = await apiFetch("/api/crops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setCrops((current) => [data, ...current]);
    setForm(emptyForm);
    setShowForm(false);
  } catch (err) {
    console.error("Add crop:", err);
    setError(err.message || "Unable to add crop");
  } finally {
    setSaving(false);
  }
};

const removeCrop = async (id) => {
  try {
    await apiFetch(`/api/crops/${id}`, {
      method: "DELETE",
    });

    setCrops((current) => current.filter((crop) => crop.id !== id));
  } catch (err) {
    console.error("Delete crop:", err);
    setError(err.message || "Unable to delete crop");
  }
};

  const emojiFor = (type) => {
    const value = type.toLowerCase();
    if (value.includes("tomato")) return "🍅";
    if (value.includes("potato")) return "🥔";
    if (value.includes("chilli") || value.includes("pepper")) return "🌶️";
    if (value.includes("rice")) return "🌾";
    if (value.includes("mango")) return "🥭";
    return "🌱";
  };

  return (
    <main className="content">
      <div className="welcome">
        <div>
          <span className="eyebrow">CROP MANAGEMENT</span>
          <h1>My crops 🌱</h1>
          <p>Add your fields and keep a simple record of crop health and planting details.</p>
        </div>
        <button className="primary-btn crop-add-btn" onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Close form" : "+ Add crop"}
        </button>
      </div>

      {error && <div className="crop-api-error"><strong>Something went wrong</strong><p>{error}</p></div>}

      {showForm && (
        <section className="crop-form-card">
          <div className="card-heading">
            <div><span className="eyebrow">NEW CROP</span><h3>Add crop</h3></div>
          </div>
          <form className="crop-form" onSubmit={addCrop}>
            <label>Crop name<input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="My Tomato Field" required /></label>
            <label>Crop type<input value={form.crop_type} onChange={(e) => updateField("crop_type", e.target.value)} placeholder="Tomato" required /></label>
            <label>Location<input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Bangalore, Karnataka" required /></label>
            <label>Planting date<input type="date" value={form.planting_date} onChange={(e) => updateField("planting_date", e.target.value)} /></label>
            <label>Health status<select value={form.health_status} onChange={(e) => updateField("health_status", e.target.value)}><option>Healthy</option><option>Monitoring</option><option>Needs Attention</option></select></label>
            <label className="crop-notes">Notes<textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Optional field notes" rows="3" /></label>
            <div className="crop-form-actions"><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving..." : "Save crop"}</button></div>
          </form>
        </section>
      )}

      {loading ? (
        <section className="crop-empty"><div className="small-loader"></div><h3>Loading your crops...</h3></section>
      ) : crops.length === 0 ? (
        <section className="crop-empty"><Sprout size={46}/><h3>No crops added yet</h3><p>Add your first crop to start tracking it here.</p><button className="primary-btn" onClick={() => setShowForm(true)}>Add your first crop</button></section>
      ) : (
        <section className="my-crops-grid">
          {crops.map((crop) => (
            <article className="my-crop-card" key={crop.id}>
              <div className="my-crop-top"><div className="my-crop-emoji">{emojiFor(crop.crop_type)}</div><button className="crop-delete" title="Delete crop" onClick={() => removeCrop(crop.id)}>×</button></div>
              <div className="my-crop-title"><div><span className="eyebrow">{crop.crop_type}</span><h3>{crop.name}</h3></div><span className={`crop-health ${crop.health_status.toLowerCase().replaceAll(" ", "-")}`}>{crop.health_status}</span></div>
              <div className="my-crop-meta"><span><MapPin size={15}/>{crop.location}</span>{crop.planting_date && <span>🌱 Planted {crop.planting_date}</span>}</div>
              {crop.notes && <p className="my-crop-notes">{crop.notes}</p>}
              <button className="text-btn crop-scheme-btn" onClick={() => onFindSchemes(crop)}>Find Government Schemes <ExternalLink size={14} /></button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function DashboardStats({ enabled = true }) {
  const [history, setHistory] = useState([]);
  const [cropCount, setCropCount] = useState(0);
  const [loading, setLoading] = useState(enabled);

  const fetchStats = async () => {
    try {
      const [historyData, cropsData] = await Promise.all([
        apiFetch("/api/history?limit=200"),
        apiFetch("/api/crops"),
      ]);

      setHistory(Array.isArray(historyData) ? historyData : []);
      setCropCount(Array.isArray(cropsData) ? cropsData.length : 0);
    } catch (error) {
      console.error("Dashboard stats:", error);
      setHistory([]);
      setCropCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    fetchStats();

    // Refresh when the dashboard becomes active again.
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [enabled]);

  const uniquePlants = cropCount;

  const healthyCount = history.filter(
    (item) => item.is_healthy
  ).length;

  const attentionCount = history.filter(
    (item) => !item.is_healthy
  ).length;

  const lastScan = history.length > 0 ? history[0] : null;

  return (
    <div className="stat-grid">
      <div className="stat-card">
        <span>MY CROPS</span>
        <strong>{loading ? "—" : String(uniquePlants).padStart(2, "0")}</strong>
        <small>
          <Sprout size={14}/>
          {loading
            ? "Loading crops..."
            : `${cropCount} registered crop${cropCount === 1 ? "" : "s"}`}
        </small>
      </div>

      <div className="stat-card">
        <span>HEALTHY</span>
        <strong>{loading ? "—" : String(healthyCount).padStart(2, "0")}</strong>
        <small className="positive">
          <ShieldCheck size={14}/>
          {history.length
            ? `${Math.round((healthyCount / history.length) * 100)}% of scans`
            : "No scans yet"}
        </small>
      </div>

      <div className="stat-card">
        <span>NEEDS ATTENTION</span>
        <strong>{loading ? "—" : String(attentionCount).padStart(2, "0")}</strong>
        <small>
          <ShieldCheck size={14}/>
          {attentionCount
            ? `${attentionCount} disease scan${attentionCount === 1 ? "" : "s"}`
            : "No disease scans"}
        </small>
      </div>

      <div className="stat-card highlight">
        <span>LAST SCAN</span>
        <strong>
          {loading
            ? "—"
            : lastScan
              ? `${Number(lastScan.confidence).toFixed(1)}%`
              : "—"}
        </strong>
        <small>
          {lastScan
            ? `${lastScan.plant} · ${lastScan.is_healthy ? "Healthy" : "Disease"}`
            : "No scans yet"}
        </small>
      </div>
    </div>
  );
}

function Dashboard({ location, locationDetails, locationInput, setLocationInput, setLocation, locationCoordinates, onSelectLocation, onDetect }) {
  return (
    <main className="content">

      <div className="welcome">
        <div>
          <span className="eyebrow">FARM OVERVIEW</span>
          <h1>Good morning, Farmer <span>🌱</span></h1>
          <p>
            Monitor your crops, detect diseases, and get local agricultural insights.
          </p>
        </div>

        <button className="location-button">
          <MapPin size={17}/>
          {location.replace(", India", "")}
        </button>
      </div>

      <DashboardStats enabled={false} />

      <div className="top-grid">
        <UploadCard onDetect={onDetect}/>

        <div className="side-stack">
          <WeatherCard
            location={location}
            locationDetails={locationDetails}
            locationInput={locationInput}
            setLocationInput={setLocationInput}
            onSelect={onSelectLocation}
            enabled={false}
          />

          <DiseaseCard/>
        </div>
      </div>

      <div className="crop-row">
        {crops.map(c => (
          <div
            key={c.name}
            className={`crop-card ${c.tone}`}
          >
            <div className="crop-emoji">{c.emoji}</div>

            <div>
              <strong>{c.name}</strong>
              <small>{c.health}</small>
            </div>

            <b>{c.value}</b>
          </div>
        ))}
      </div>

      <div className="market-section">
        <CropPrices location={location} locationCoordinates={locationCoordinates} enabled={false} />
        <PriceHistory location={location} locationCoordinates={locationCoordinates} enabled={false} />
      </div>

    </main>
  );
}

function WeatherPage({ location, locationDetails, locationInput, setLocationInput, onSelectLocation }) {
  return (
    <main className="content">
      <div className="welcome"><div><span className="eyebrow">LOCAL CONDITIONS</span><h1>Weather</h1><p>View weather information for your selected location.</p></div></div>
      <WeatherCard
        location={location}
        locationDetails={locationDetails}
        locationInput={locationInput}
        setLocationInput={setLocationInput}
        onSelect={onSelectLocation}
        enabled
      />
    </main>
  );
}

function MarketPricesPage({ location, locationCoordinates, locationInput, setLocationInput, onSelectLocation }) {
  return (
    <main className="content">
      <div className="welcome">
        <div>
          <span className="eyebrow">MARKET INTELLIGENCE</span>
          <h1>Market Prices</h1>
          <p>Review current prices and historical trends for your active location.</p>
        </div>
        <div style={{ maxWidth: 360, width: "100%" }}>
          <LocationSearch
            value={locationInput}
            onChange={setLocationInput}
            onSelect={onSelectLocation}
            placeholder="Change market location"
          />
        </div>
      </div>
      <div className="market-section">
        <CropPrices location={location} locationCoordinates={locationCoordinates} enabled />
        <PriceHistory location={location} locationCoordinates={locationCoordinates} enabled />
      </div>
    </main>
  );
}

function Detection({ file, onBack, location }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [agriLoading, setAgriLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [agriculture, setAgriculture] = useState(null);

  const [error, setError] = useState("");
  const [agriError, setAgriError] = useState("");


  React.useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);

    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const analyzePlant = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setAgriError("");
    setResult(null);
    setAgriculture(null);

    let prediction = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("location", location);

      prediction = await apiFetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      console.log("ML Prediction:", prediction);
      setResult(prediction);
    } catch (predictionError) {
      console.error(predictionError);
      setError(
        predictionError.message ||
          "Something went wrong while analyzing the plant."
      );
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }

    if (!prediction) return;

    // Load agricultural information separately so diagnosis remains fully visible
    setAgriLoading(true);
    try {
      const diseaseName = prediction.disease;
      const params = new URLSearchParams({
        disease: `${prediction.plant} ${diseaseName}`,
        location,
      });

      const agricultureData = await apiFetch(
        `/api/agriculture?${params.toString()}`
      );

      console.log("Agricultural Information:", agricultureData);
      setAgriculture(agricultureData);

      if (agricultureData?.available === false) {
        setAgriError(
          agricultureData.message ||
            "Agricultural information is temporarily unavailable."
        );
      }
    } catch (agriErr) {
      console.error("Agriculture loading error:", agriErr);
      setAgriError(
        "Agricultural information is temporarily unavailable. Please try again."
      );
    } finally {
      setAgriLoading(false);
    }
  };

  return (
    <main className="content">

      {/* =========================================
          HEADER
      ========================================== */}

      <div className="welcome">

        <div>

          <span className="eyebrow">
            DISEASE DETECTION
          </span>

          <h1>
            Analyze your plant
          </h1>

          <p>
            AI-powered plant disease detection with
            location-aware agricultural information.
          </p>

        </div>

        <button
          className="location-button"
          onClick={onBack}
        >
          ← Dashboard
        </button>

      </div>


      {/* =========================================
          MAIN GRID
      ========================================== */}

      <div className="detection-grid">

        {/* =====================================
            IMAGE
        ====================================== */}

        <section className="detection-image-card">

          <div className="card-heading">

            <div>

              <span className="eyebrow">
                PLANT IMAGE
              </span>

              <h3>
                Uploaded image
              </h3>

            </div>

          </div>


          {preview ? (

            <img
              src={preview}
              alt="Uploaded plant"
              className="detection-image"
            />

          ) : (

            <div className="no-image">

              <UploadCloud size={42} />

              <p>
                No image selected
              </p>

            </div>

          )}


          {file && (

            <div className="file-name">

              <strong>
                {file.name}
              </strong>

            </div>

          )}


          <button
            className="primary-btn detection-btn"
            onClick={analyzePlant}
            disabled={loading || !file}
          >

            <ScanLine size={18} />

            {loading
              ? "Analyzing..."
              : "Analyze with AI"}

          </button>

        </section>


        {/* =====================================
            RESULTS
        ====================================== */}

        <section className="result-card">

          <div className="card-heading">

            <div>

              <span className="eyebrow">
                AI DIAGNOSIS
              </span>

              <h3>
                Prediction result
              </h3>

            </div>

          </div>


          {/* EMPTY STATE */}

          {!result &&
            !loading &&
            !error && (

              <div className="result-empty">

                <ScanLine size={48} />

                <h3>
                  Waiting for analysis
                </h3>

                <p>
                  Upload a plant image and click
                  "Analyze with AI".
                </p>

              </div>

            )}


          {/* LOADING */}

          {loading && (

            <div className="result-empty">

              <div className="loader"></div>

              <h3>
                Analyzing plant...
              </h3>

              <p>
                Your image is being processed by
                the AgroVision AI model.
              </p>

            </div>

          )}


          {/* ERROR */}

          {error && (

            <div className="error-box">

              <strong>
                Something went wrong
              </strong>

              <p>
                {error}
              </p>

            </div>

          )}


          {/* RESULT */}

          {result && (

            <div className="prediction-result">

              {/* =================================
                  PLANT + STATUS
              ================================== */}

              <div className="prediction-header">

                <div>

                  <span className="result-label">
                    PLANT
                  </span>

                  <h2>
                    {result.plant}
                  </h2>

                </div>


                <div
                  className={`result-status ${
                    result.is_healthy
                      ? "healthy"
                      : "disease"
                  }`}
                >

                  {result.is_healthy
                    ? "Healthy"
                    : "Disease Detected"}

                </div>

              </div>


              {/* =================================
                  DIAGNOSIS
              ================================== */}

              <div className="diagnosis-box">

                <span className="result-label">
                  DIAGNOSIS
                </span>

                <h2>
                  {result.disease}
                </h2>

              </div>


              {/* =================================
                  CONFIDENCE
              ================================== */}

              <div className="confidence-box">

                <div className="confidence-heading">

                  <span>
                    Model confidence
                  </span>

                  <strong>
                    {Number(
                      result.confidence
                    ).toFixed(2)}
                    %
                  </strong>

                </div>


                <div className="confidence-bar">

                  <div
                    style={{
                      width: `${Math.min(
                        Number(result.confidence),
                        100
                      )}%`,
                    }}
                  />

                </div>

              </div>


              {/* =================================
                  LOCATION
              ================================== */}

              <div className="location-result">
                <MapPin size={20} />
                <div>
                  <span>ANALYSIS LOCATION</span>
                  <strong>{location}</strong>
                </div>
              </div>

              {/* =================================
                  AGRICULTURAL INFORMATION
              ================================== */}

              <div className="agri-section">

                <div className="agri-section-header">

                  <div>

                    <span className="eyebrow">
                      AGRICULTURAL INSIGHTS
                    </span>

                    <h3>
                      Local information
                    </h3>

                  </div>

                  <span className="serp-badge">
                    SerpApi
                  </span>

                </div>


                {agriLoading && (

                  <div className="agri-loading">

                    <div className="small-loader"></div>

                    <span>
                      Finding agricultural
                      information for {location}...
                    </span>

                  </div>

                )}


                {!agriLoading && agriError && (
                  <div className="agri-empty">
                    <Leaf size={24} />
                    <p>{agriError}</p>
                  </div>
                )}

                {!agriLoading &&
                  !agriError &&
                  agriculture &&
                  agriculture.sources &&
                  agriculture.sources.length > 0 && (

                    <div className="source-list">

                      {agriculture.sources.map(
                        (source, index) => (

                          <a
                            key={`${source.link}-${index}`}
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-card"
                          >

                            <div className="source-number">
                              {index + 1}
                            </div>

                            <div className="source-content">

                              <strong>
                                {source.title}
                              </strong>

                              <p>
                                {source.snippet}
                              </p>

                              <small>
                                {source.source ||
                                  "Web source"}
                              </small>

                            </div>

                            <span className="source-arrow">
                              ↗
                            </span>

                          </a>

                        )
                      )}

                    </div>

                  )}


                {!agriLoading &&
                  !agriError &&
                  agriculture &&
                  (!agriculture.sources ||
                    agriculture.sources.length === 0) && (

                    <div className="agri-empty">

                      <Leaf size={24} />

                      <p>
                        No agricultural sources were
                        found for this disease and
                        location.
                      </p>

                    </div>

                  )}

              </div>


              {/* =================================
                  SAFETY NOTE
              ================================== */}

              {!result.is_healthy && (

                <div className="treatment-note">

                  <ShieldCheck size={20} />

                  <div>

                    <strong>
                      Treatment information
                    </strong>

                    <p>
                      Agricultural search results are
                      provided as reference information.
                      Always follow the current product
                      label and locally applicable
                      agricultural guidance before
                      applying any chemical treatment.
                    </p>

                  </div>

                </div>

              )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}



function SettingsPage({ location, setLocation, locationInput, setLocationInput, onSelectLocation }) {
  const [farmerName, setFarmerName] = useState(
    () => localStorage.getItem("agrovision_farmer_name") || "Farmer"
  );
  const [email, setEmail] = useState(
    () => localStorage.getItem("agrovision_email") || ""
  );
  const [defaultCrop, setDefaultCrop] = useState(
    () => localStorage.getItem("agrovision_default_crop") || "Tomato"
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("agrovision_notifications") !== "false"
  );
  const [marketAlerts, setMarketAlerts] = useState(
    () => localStorage.getItem("agrovision_market_alerts") === "true"
  );
  const [weatherAlerts, setWeatherAlerts] = useState(
    () => localStorage.getItem("agrovision_weather_alerts") === "true"
  );
  const [saved, setSaved] = useState(false);

  const saveSettings = () => {
    localStorage.setItem("agrovision_farmer_name", farmerName.trim() || "Farmer");
    localStorage.setItem("agrovision_email", email.trim());
    localStorage.setItem("agrovision_default_crop", defaultCrop);
    localStorage.setItem("agrovision_notifications", String(notifications));
    localStorage.setItem("agrovision_market_alerts", String(marketAlerts));
    localStorage.setItem("agrovision_weather_alerts", String(weatherAlerts));

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <main className="content settings-page">
      <div className="welcome">
        <div>
          <span className="eyebrow">PREFERENCES</span>
          <h1>Settings ⚙️</h1>
          <p>Manage your AgroVision profile, farm preferences, and alerts.</p>
        </div>

        <button className="primary-btn settings-save-top" onClick={saveSettings}>
          {saved ? "✓ Saved" : "Save changes"}
        </button>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon"><Sprout size={19} /></div>
            <div>
              <span className="eyebrow">PROFILE</span>
              <h3>Farmer profile</h3>
              <p>Basic information used across the dashboard.</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <label className="settings-field">
              <span>Farmer name</span>
              <input
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                placeholder="Enter your name"
              />
            </label>

            <label className="settings-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@example.com"
              />
            </label>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon"><MapPin size={19} /></div>
            <div>
              <span className="eyebrow">FARM PREFERENCES</span>
              <h3>Location & crop</h3>
              <p>Used for weather, market prices, and agricultural information.</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <label className="settings-field">
              <span>Default location</span>
              <LocationSearch
                value={locationInput}
                onChange={setLocationInput}
                onSelect={onSelectLocation}
                placeholder="Search an Indian location"
              />
              <small>Example: Bangalore, Karnataka, India</small>
            </label>

            <label className="settings-field">
              <span>Default crop</span>
              <select
                value={defaultCrop}
                onChange={(e) => setDefaultCrop(e.target.value)}
              >
                <option>Tomato</option>
                <option>Potato</option>
                <option>Green Chilli</option>
                <option>Other</option>
              </select>
            </label>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon"><Bell size={19} /></div>
            <div>
              <span className="eyebrow">NOTIFICATIONS</span>
              <h3>Alerts & updates</h3>
              <p>Choose which notifications you want to receive.</p>
            </div>
          </div>

          <div className="settings-options">
            <label className="settings-toggle-row">
              <div>
                <strong>Enable notifications</strong>
                <small>Allow AgroVision to show useful farm alerts.</small>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="toggle-ui" />
            </label>

            <label className="settings-toggle-row">
              <div>
                <strong>Market price alerts</strong>
                <small>Keep market-price notifications enabled for your crops.</small>
              </div>
              <input
                type="checkbox"
                checked={marketAlerts}
                onChange={(e) => setMarketAlerts(e.target.checked)}
              />
              <span className="toggle-ui" />
            </label>

            <label className="settings-toggle-row">
              <div>
                <strong>Weather alerts</strong>
                <small>Receive weather-related reminders for your selected location.</small>
              </div>
              <input
                type="checkbox"
                checked={weatherAlerts}
                onChange={(e) => setWeatherAlerts(e.target.checked)}
              />
              <span className="toggle-ui" />
            </label>
          </div>
        </section>

        <section className="settings-card settings-info-card">
          <div className="settings-card-heading">
            <div className="settings-icon"><ShieldCheck size={19} /></div>
            <div>
              <span className="eyebrow">DATA & PRIVACY</span>
              <h3>Your preferences</h3>
              <p>
                These settings are stored locally in your browser. Your existing
                crop and prediction data remains in the AgroVision backend database.
              </p>
            </div>
          </div>

          <div className="settings-info-list">
            <div>
              <span>Application</span>
              <strong>AgroVision AI</strong>
            </div>
            <div>
              <span>Default market</span>
              <strong>AGMARKNET</strong>
            </div>
            <div>
              <span>AI diagnosis</span>
              <strong>Plant disease model</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <span>{saved ? "Your settings have been saved." : "Changes are saved only when you click Save changes."}</span>
        <button className="primary-btn" onClick={saveSettings}>
          {saved ? "✓ Saved" : "Save changes"}
        </button>
      </div>
    </main>
  );
}


export default function App() {
  const { isAuthenticated, logout } = useAuth();
  const [path, setPath] = useState(() => window.location.pathname);
  const [active, setActive] = useState(() => window.location.pathname === "/government-schemes" ? "Government Schemes" : "Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedSchemeCrop, setSelectedSchemeCrop] = useState("");

  const [locationInput, setLocationInput] = useState(
    "Bangalore, Karnataka, India"
  );
  const [location, setLocation] = useState(
    "Bangalore, Karnataka, India"
  );
  const [locationCoordinates, setLocationCoordinates] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);

  const navigate = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isAuthenticated && (path === "/login" || path === "/register")) navigate("/dashboard");
    if (!isAuthenticated && path !== "/" && path !== "/login" && path !== "/register") navigate("/login");
  }, [isAuthenticated, path]);

  useEffect(() => {
    setLocationInput(location);
  }, [location]);

  if (path === "/") return <LandingPage navigate={navigate} />;
  if (path === "/login" && !isAuthenticated) return <Login navigate={navigate} />;
  if (path === "/register" && !isAuthenticated) return <Register navigate={navigate} />;
  if (!isAuthenticated) return <Login navigate={navigate} />;

  const handleLocationSelect = (selectedLocation) => {
    if (!selectedLocation?.formatted) return;
    setLocationInput(selectedLocation.formatted);
    setLocation(selectedLocation.formatted);
    setLocationDetails(selectedLocation);
    setLocationCoordinates({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
  };

  const onDetect = (file) => {
    if (!file) return;

    setSelectedFile(file);
    setActive("Disease Detection");
  };

  return (
    <div className="app">

      <Sidebar
        active={active}
        setActive={setActive}
        open={mobileOpen}
        setOpen={setMobileOpen}
        onLogout={() => { logout(); navigate("/login"); }}
      />

      <div className="main">

        <Topbar
          setOpen={setMobileOpen}
          location={location}
          onLogout={() => { logout(); navigate("/login"); }}
        />

        {active === "Dashboard" && (
          <Dashboard
            onDetect={onDetect}
            location={location}
            locationDetails={locationDetails}
            locationInput={locationInput}
            setLocationInput={setLocationInput}
            setLocation={setLocation}
            locationCoordinates={locationCoordinates}
            onSelectLocation={handleLocationSelect}
          />
        )}

        {active === "Disease Detection" && (
          <Detection
            file={selectedFile}
            location={location}
            onBack={() => setActive("Dashboard")}
          />
        )}

        {active === "Weather" && (
          <WeatherPage
            location={location}
            locationDetails={locationDetails}
            locationInput={locationInput}
            setLocationInput={setLocationInput}
            onSelectLocation={handleLocationSelect}
          />
        )}

        {active === "Market Prices" && (
          <MarketPricesPage
            location={location}
            locationCoordinates={locationCoordinates}
            locationInput={locationInput}
            setLocationInput={setLocationInput}
            onSelectLocation={handleLocationSelect}
          />
        )}

        {active === "Government Schemes" && (
          <GovernmentSchemes
            location={location}
            initialCrop={selectedSchemeCrop}
            navigate={(nextPath) => {
              setActive("Dashboard");
              navigate(nextPath);
            }}
          />
        )}

        {active === "History" && <HistoryPage />}

        {active === "My Crops" && <MyCrops onFindSchemes={(crop) => {
          setLocationInput(crop.location);
          setLocation(crop.location);
          setSelectedSchemeCrop(crop.crop_type);
          setActive("Government Schemes");
          navigate("/government-schemes");
        }} />}

        {active === "Insights" && <Insights location={location} />}

        {active === "Settings" && (
          <SettingsPage
            location={location}
            setLocation={setLocation}
            locationInput={locationInput}
            setLocationInput={setLocationInput}
            onSelectLocation={handleLocationSelect}
          />
        )}

        {active !== "Dashboard" &&
          active !== "Disease Detection" &&
          active !== "Weather" &&
          active !== "Market Prices" &&
          active !== "Government Schemes" &&
          active !== "History" &&
          active !== "My Crops" &&
          active !== "Insights" &&
          active !== "Settings" && (
            <main className="content">
              <div className="detection-placeholder">

                <Leaf size={48} />

                <h2>{active}</h2>

                <p>
                  This module will be implemented in the next build step.
                </p>

                <button
                  className="primary-btn"
                  onClick={() => setActive("Dashboard")}
                >
                  Back to dashboard
                </button>

              </div>
            </main>
          )}

      </div>

    </div>
  );
}