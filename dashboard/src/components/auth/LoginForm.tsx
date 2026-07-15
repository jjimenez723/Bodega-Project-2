"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError("Sign-in failed. Check your email, password, and account status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="About this dashboard">
        <div className="brand-mark brand-mark--light" aria-hidden="true">
          BP
        </div>
        <p className="eyebrow eyebrow--light">The Bodega Project</p>
        <h1>Grow more good from every harvest.</h1>
        <p>
          Track the true cost of soil and hydroponic growing, reduce avoidable
          waste, and understand what each pound contributes to the community.
        </p>
        <div className="auth-story__metric">
          <span>One shared view</span>
          <strong>Yield · Waste · Profit</strong>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">Secure team access</p>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your Firebase-enabled account.</p>
          <form onSubmit={handleSubmit} className="stack-lg">
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@organization.org"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>
            {error ? <p className="form-message form-message--error">{error}</p> : null}
            <button className="button button--primary button--wide" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in to dashboard"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
