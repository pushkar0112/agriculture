import { ArrowLeft, ArrowRight, Leaf, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function Login({ navigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email address.");
    if (!form.password) return setError("Enter your password.");
    setLoading(true);
    try { await login(form.email, form.password, form.remember); navigate("/dashboard"); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return <AuthLayout navigate={navigate}><form className="auth-form" onSubmit={submit}><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" /></label><div className="form-row"><label className="check-label"><input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} /> Remember me</label><button className="forgot-link" type="button">Forgot password?</button></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="public-button auth-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={18} /> Logging in...</> : <>Login <ArrowRight size={17} /></>}</button><p className="auth-switch">Don&apos;t have an account? <button type="button" onClick={() => navigate("/register")}>Create account</button></p></form></AuthLayout>;
}

export function AuthLayout({ children, navigate, eyebrow = "WELCOME BACK", title = "Login to AgroVision AI", description = "Login to continue to your agricultural intelligence dashboard." }) {
  return <div className="auth-page"><div className="auth-aside"><button className="public-brand" onClick={() => navigate("/")}><span className="brand-mark"><Leaf size={20} /></span><span>AgroVision <b>AI</b></span></button><div><span className="public-eyebrow">AGRICULTURAL INTELLIGENCE</span><h1>More clarity for every crop.</h1><p>Bring plant health, weather, markets, and agricultural insight into one calm, practical workspace.</p></div><span className="auth-quote">“Better information makes room for better decisions.”</span></div><div className="auth-panel"><button className="back-home" onClick={() => navigate("/")}><ArrowLeft size={16} /> Back to home</button><div className="auth-card"><span className="public-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p>{children}</div></div></div>;
}
