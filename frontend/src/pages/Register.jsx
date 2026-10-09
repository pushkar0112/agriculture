import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "./Login";

export default function Register({ navigate }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email address.");
    if (!form.password) return setError("Create a password.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setLoading(true);
    try { await register(form); navigate("/dashboard"); } catch (err) { setError(err.message || "Unable to create your account."); } finally { setLoading(false); }
  };

  return <AuthLayout navigate={navigate} eyebrow="GET STARTED" title="Create your account" description="Set up your AgroVision AI workspace and start making clearer farming decisions."><form className="auth-form" onSubmit={submit}><label>Full name<input type="text" value={form.name} onChange={update("name")} autoComplete="name" /></label><label>Email<input type="email" value={form.email} onChange={update("email")} autoComplete="email" /></label><label>Password<input type="password" value={form.password} onChange={update("password")} autoComplete="new-password" /></label><label>Confirm password<input type="password" value={form.confirm} onChange={update("confirm")} autoComplete="new-password" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="public-button auth-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={18} /> Creating account...</> : <>Create Account <ArrowRight size={17} /></>}</button><p className="auth-switch">Already have an account? <button type="button" onClick={() => navigate("/login")}>Login</button></p></form></AuthLayout>;
}
