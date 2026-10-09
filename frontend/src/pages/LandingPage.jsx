import {
  ArrowRight, BarChart3, CheckCircle2, CloudSun, Leaf, LineChart, ScanLine, Sprout,
} from "lucide-react";

const features = [
  [ScanLine, "AI Plant Disease Detection", "Upload a plant image and identify potential diseases using the trained AI model."],
  [CloudSun, "Weather Intelligence", "Get location-aware weather information through SerpApi."],
  [LineChart, "Market Intelligence", "View crop prices and historical market trends using AGMARKNET data."],
  [Sprout, "Agricultural Insights", "Search for disease treatment, prevention, symptoms, and agricultural information."],
  [BarChart3, "Prediction History", "Keep track of previous plant disease predictions."],
  [Leaf, "My Crops", "Manage and monitor crops associated with the farmer's locations."],
];

function go(navigate, path) {
  navigate(path);
}

export default function LandingPage({ navigate }) {
  return (
    <div className="public-site">
      <nav className="public-nav" aria-label="Main navigation">
        <button className="public-brand" onClick={() => go(navigate, "/")}><span className="brand-mark"><Leaf size={20} /></span><span>AgroVision <b>AI</b></span></button>
        <div className="nav-links"><a href="#features">Features</a><a href="#how-it-works">How It Works</a><a href="#intelligence">About</a></div>
        <div className="nav-actions"><button className="link-button" onClick={() => go(navigate, "/login")}>Login</button><button className="public-button small" onClick={() => go(navigate, "/register")}>Get Started <ArrowRight size={15} /></button></div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="public-eyebrow"><span className="eyebrow-dot" /> AGRICULTURAL INTELLIGENCE, REIMAGINED</span>
            <h1>AI-Powered Intelligence for <em>Smarter Farming</em></h1>
            <p>Detect plant diseases, understand local weather, monitor crop prices, and access agricultural insights, all in one intelligent platform.</p>
            <div className="hero-actions"><button className="public-button" onClick={() => go(navigate, "/register")}>Get Started <ArrowRight size={17} /></button><button className="outline-button" onClick={() => go(navigate, "/login")}>Login</button></div>
            <div className="hero-proof"><div className="proof-avatars"><span>R</span><span>M</span><span>S</span></div><span>Built for confident decisions in every growing season</span></div>
          </div>
          <div className="hero-visual" aria-label="Agricultural intelligence overview">
            <div className="hero-sun" /><div className="hero-grid" />
            <div className="field-line line-one" /><div className="field-line line-two" /><div className="field-line line-three" />
            <div className="hero-plant"><span className="stem" /><span className="leaf-shape leaf-left" /><span className="leaf-shape leaf-right" /><span className="leaf-shape leaf-top" /></div>
            <div className="insight-float float-top"><span className="float-icon"><ScanLine size={17} /></span><span><b>Plant health</b><small>96.4% confidence</small></span><CheckCircle2 size={18} /></div>
            <div className="insight-float float-bottom"><span className="float-icon blue"><CloudSun size={17} /></span><span><b>Local conditions</b><small>Good for planting today</small></span></div>
            <div className="visual-label">AGROVISION / FIELD VIEW <span>● LIVE</span></div>
          </div>
        </section>

        <section className="feature-section" id="features"><div className="section-heading"><span className="public-eyebrow">ONE PLATFORM, MANY ANSWERS</span><h2>Everything your farm needs to move forward.</h2><p>Turn scattered signals into a clearer picture of your crops, conditions, and next best action.</p></div><div className="feature-grid">{features.map(([Icon, title, text]) => <article className="feature-card" key={title}><div className="feature-icon"><Icon size={21} /></div><h3>{title}</h3><p>{text}</p><ArrowRight size={17} /></article>)}</div></section>

        <section className="steps-section" id="how-it-works"><div className="section-heading"><span className="public-eyebrow">A SIMPLE FIELD ROUTINE</span><h2>From image to insight in four steps.</h2></div><div className="steps-grid">{[["01", "Upload Plant Image", "Start with a clear photo from your field."], ["02", "AI Detects Disease", "The trained model classifies plant health."], ["03", "Get Agricultural Insights", "Explore practical treatment and prevention information."], ["04", "Check Weather & Market Prices", "Make your next decision with local context."]].map(([number, title, text]) => <div className="step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></section>

        <section className="intelligence-section" id="intelligence"><div><span className="public-eyebrow">THE INTELLIGENCE LAYER</span><h2>One view of what is happening in your field.</h2><p>AgroVision AI combines a trained plant-disease model with real-time agricultural intelligence. Disease classification is performed by the trained model, while SerpApi powers agricultural information and weather/search intelligence.</p><button className="text-action" onClick={() => go(navigate, "/register")}>Explore the platform <ArrowRight size={17} /></button></div><div className="tech-list"><div><b>AI / Keras</b><span>Trained disease classification</span></div><div><b>FastAPI</b><span>Reliable agricultural services</span></div><div><b>SerpApi</b><span>Weather and search intelligence</span></div><div><b>AGMARKNET</b><span>Market price context</span></div></div></section>

        <section className="final-cta"><div><span className="public-eyebrow">YOUR NEXT SEASON STARTS HERE</span><h2>Make Every Farming Decision Smarter</h2></div><button className="public-button" onClick={() => go(navigate, "/register")}>Start Using AgroVision AI <ArrowRight size={17} /></button></section>
      </main>

      <footer className="public-footer"><div><button className="public-brand" onClick={() => go(navigate, "/")}><span className="brand-mark"><Leaf size={18} /></span><span>AgroVision <b>AI</b></span></button><p>Practical intelligence for healthier crops and more confident farming.</p></div><div className="footer-links"><a href="#features">Features</a><button onClick={() => go(navigate, "/login")}>Login</button><button onClick={() => go(navigate, "/register")}>Register</button></div><small>© 2026 AgroVision AI</small></footer>
    </div>
  );
}
