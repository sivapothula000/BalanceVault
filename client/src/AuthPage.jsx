import { useState } from "react";
import { api } from "./api.js";

export default function AuthPage({
  mode,
  navigate,
  onLogin,
  onRegisterSuccess,
  notice,
}) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isRegister) {
        await api.register({ name, email, password });
        setPassword("");
        onRegisterSuccess();
        navigate("/login");
      } else {
        const result = await api.login({ email, password });
        setPassword("");
        onLogin({
          token: result.token,
          user: result.user,
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand brand-light" href="/" onClick={(event) => {
          event.preventDefault();
          navigate("/login");
        }}>
          <span className="brand-mark">B</span>
          <span>BalanceVault</span>
        </a>
        <div className="story-copy">
          <span className="eyebrow eyebrow-light">BANKING, IN BALANCE</span>
          <h1>Money management that moves with you.</h1>
          <p>
            A clearer view of your accounts, transfers, and everyday financial
            activity.
          </p>
          <div className="story-note">
            <span className="story-note-icon">✓</span>
            <span>Designed for calm, confident money management.</span>
          </div>
        </div>
        <div className="story-footer">Your money. Your pace. Your balance.</div>
        <div className="story-orb story-orb-one" />
        <div className="story-orb story-orb-two" />
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand brand">
          <span className="brand-mark">B</span>
          <span>BalanceVault</span>
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">{isRegister ? "GET STARTED" : "WELCOME BACK"}</span>
          <h2>{isRegister ? "Create your account" : "Sign in to BalanceVault"}</h2>
          <p className="muted">
            {isRegister
              ? "A few details are all you need to get started."
              : "Your accounts are right where you left them."}
          </p>

          {notice && <div className="alert alert-info" role="status">{notice}</div>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label className="field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  maxLength="100"
                  minLength="2"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  value={name}
                />
              </label>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? "8" : undefined}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
                required
                type="password"
                value={password}
              />
            </label>
            <button className="button button-primary button-wide" disabled={busy} type="submit">
              {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to BalanceVault?"}{" "}
            <a
              href={isRegister ? "/login" : "/register"}
              onClick={(event) => {
                event.preventDefault();
                navigate(isRegister ? "/login" : "/register");
              }}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </a>
          </p>
          <p className="auth-privacy">Your password is used only to sign in and is never saved in this browser.</p>
        </div>
      </section>
    </main>
  );
}
