import { ArrowLeft, ExternalLink, Leaf, LoaderCircle, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../api";

const cropSuggestions = ["Tomato", "Potato", "Rice", "Wheat", "Cotton", "Maize", "Sugarcane", "Onion", "Chilli", "Groundnut"];

function SchemeCard({ scheme }) {
  return (
    <article className="scheme-card">
      <div className="scheme-card-top">
        <div className="scheme-icon"><Leaf size={20} /></div>
        <div>
          <span className={`scheme-badge ${scheme.level === "State" ? "state" : "central"}`}>
            {scheme.level === "State" ? `${scheme.state || "State"} Government` : "Central Government"}
          </span>
          <h3>{scheme.name}</h3>
        </div>
      </div>
      {scheme.description && <div className="scheme-detail"><strong>Official result summary</strong><p>{scheme.description}</p></div>}
      {scheme.benefits && <div className="scheme-detail"><strong>Benefits</strong><p>{scheme.benefits}</p></div>}
      {scheme.eligibility && <div className="scheme-detail"><strong>Eligibility</strong><p>{scheme.eligibility}</p></div>}
      {scheme.application_process && <div className="scheme-detail"><strong>Application</strong><p>{scheme.application_process}</p></div>}
      <div className="scheme-card-footer"><span>Source: {scheme.source}</span><a href={scheme.official_url} target="_blank" rel="noopener noreferrer">View Official Details <ExternalLink size={14} /></a></div>
    </article>
  );
}

export default function GovernmentSchemes({ location, navigate, initialCrop = "" }) {
  const [crop, setCrop] = useState(initialCrop);
  const [schemes, setSchemes] = useState([]);
  const [resultMeta, setResultMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSchemes([]);
    setResultMeta(null);
    setError("");
  }, [location]);

  const findSchemes = async (event) => {
    event.preventDefault();
    if (!crop.trim() || !location.trim()) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ crop: crop.trim(), location });
      const data = await apiFetch(`/api/schemes?${params.toString()}`);
      setResultMeta(data);
      setSchemes(data.schemes || []);
    } catch (err) {
      console.error("Government schemes:", err);
      setSchemes([]);
      setError("Unable to retrieve government scheme information right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="content schemes-page">
      <div className="welcome schemes-welcome">
        <div><span className="eyebrow">FARM SUPPORT</span><h1>Government Schemes</h1><p>Find government support programs related to your crops and location.</p></div>
        <button className="location-button" onClick={() => navigate("/dashboard")}><ArrowLeft size={16} /> Dashboard</button>
      </div>

      <section className="scheme-search-card">
        <form onSubmit={findSchemes}>
          <label>Crop
            <div className="scheme-input"><Search size={17} /><input list="crop-options" value={crop} onChange={(event) => setCrop(event.target.value)} placeholder="Search or enter a crop" required /><datalist id="crop-options">{cropSuggestions.map((item) => <option value={item} key={item} />)}</datalist></div>
          </label>
          <label>Location
            <div className="scheme-location"><MapPin size={17} /><span>{location || "No active location selected"}</span></div>
          </label>
          <button className="primary-btn" type="submit" disabled={loading || !crop.trim() || !location.trim()}>{loading ? <><LoaderCircle className="spin" size={17} /> Finding schemes...</> : "Find Schemes"}</button>
        </form>
        {!location && <p className="scheme-helper">Select your location to find location-specific schemes.</p>}
        <p className="scheme-disclaimer">Potentially relevant schemes are shown from official government sources. Eligibility depends on each scheme&apos;s official criteria.</p>
      </section>

      {loading && <section className="scheme-state"><div className="small-loader" /><h3>Finding relevant government schemes...</h3></section>}
      {!loading && error && <section className="scheme-state scheme-error"><h3>{error}</h3></section>}
      {!loading && !error && resultMeta && schemes.length === 0 && <section className="scheme-state"><h3>No matching government schemes were found for this crop and location.</h3><p>Try another crop or location.</p></section>}
      {!loading && !error && schemes.length > 0 && <section className="scheme-results"><div className="scheme-results-heading"><div><span className="eyebrow">OFFICIAL SOURCES</span><h2>Support for {resultMeta.crop}</h2></div><span>{schemes.length} results</span></div><div className="scheme-grid">{schemes.map((scheme) => <SchemeCard scheme={scheme} key={scheme.official_url} />)}</div></section>}
    </main>
  );
}
