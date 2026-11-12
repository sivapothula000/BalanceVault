import { useCallback, useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard.jsx";
import AuthPage from "./AuthPage.jsx";
import CustomerDashboard from "./CustomerDashboard.jsx";
import { api } from "./api.js";
import LedgerPage from "./LedgerPage.jsx";
import "./App.css";

function readSession() {
  try {
    const stored = sessionStorage.getItem("balancevault.session");
    const session = stored ? JSON.parse(stored) : null;
    return session?.token && session?.user ? session : null;
  } catch {
    sessionStorage.removeItem("balancevault.session");
    return null;
  }
}

function AppLink({ children, className, navigate, to, ...props }) {
  return (
    <a
      {...props}
      className={className}
      href={to}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function pageName(path, role) {
  if (path === "/ledger") return "Ledger";
  if (path === "/admin" || role === "ADMIN") return "Accounts overview";
  return "Overview";
}

function AppShell({ children, navigate, onLogout, path, session }) {
  const isAdmin = session.user.role === "ADMIN";
  const navItems = [
    { to: isAdmin ? "/admin" : "/dashboard", label: isAdmin ? "Accounts" : "Overview", glyph: "◫" },
    { to: "/ledger", label: "Ledger", glyph: "▤" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <AppLink className="brand sidebar-brand" navigate={navigate} to={isAdmin ? "/admin" : "/dashboard"}>
          <span className="brand-mark">B</span>
          <span>BalanceVault</span>
        </AppLink>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="side-nav">
          {navItems.map((item) => (
            <AppLink
              aria-current={path === item.to ? "page" : undefined}
              className={`side-nav-link ${path === item.to ? "active" : ""}`}
              key={item.to}
              navigate={navigate}
              to={item.to}
            >
              <span className="nav-glyph" aria-hidden="true">{item.glyph}</span>
              {item.label}
              {path === item.to && <span className="nav-active-mark" />}
            </AppLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-security"><span>✓</span> Secure session</div>
          <button className="sidebar-logout" onClick={onLogout} type="button">
            <span aria-hidden="true">↪</span> Sign out
          </button>
          <div className="sidebar-version">BALANCEVAULT · PERSONAL FINANCE</div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand brand">
            <span className="brand-mark">B</span>
            <span>BalanceVault</span>
          </div>
          <div className="topbar-title">{pageName(path, session.user.role)}</div>
          <div className="topbar-user">
            <div className="user-copy">
              <strong>{session.user.name}</strong>
              <span>{isAdmin ? "Administrator" : "Customer"}</span>
            </div>
            <span className="user-avatar" aria-hidden="true">
              {session.user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
            </span>
            <button aria-label="Sign out" className="topbar-logout" onClick={onLogout} type="button">↪</button>
          </div>
        </header>
        <main className="workspace-main">{children}</main>
        <footer className="app-footer">
          <span>BalanceVault</span>
          <span>Thoughtful banking, made simple.</span>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [path, setPath] = useState(window.location.pathname.replace(/\/+$/, "") || "/");
  const [ready, setReady] = useState(() => !session?.token);
  const [notice, setNotice] = useState("");

  const navigate = useCallback((nextPath, replace = false) => {
    if (window.location.pathname !== nextPath) {
      if (replace) window.history.replaceState({}, "", nextPath);
      else window.history.pushState({}, "", nextPath);
    }
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const saveSession = useCallback((nextSession) => {
    sessionStorage.setItem("balancevault.session", JSON.stringify(nextSession));
    setSession(nextSession);
    setNotice("");
    navigate(nextSession.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }, [navigate]);

  const logout = useCallback((message = "") => {
    sessionStorage.removeItem("balancevault.session");
    setSession(null);
    setNotice(message);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname.replace(/\/+$/, "") || "/");
    };
    const handleSessionExpired = () => {
      logout("Your session has expired. Please sign in again.");
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("balancevault:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("balancevault:session-expired", handleSessionExpired);
    };
  }, [logout]);

  useEffect(() => {
    if (!session?.token) return undefined;

    let active = true;
    api.getCurrentUser(session.token)
      .then(({ user }) => {
        if (!active) return;
        const verifiedSession = { token: session.token, user };
        sessionStorage.setItem("balancevault.session", JSON.stringify(verifiedSession));
        setSession(verifiedSession);
      })
      .catch((error) => {
        if (active && error.status !== 401) {
          setNotice("We could not verify your session. Check your connection and refresh.");
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [session?.token]);

  useEffect(() => {
    if (!ready) return;
    const isAuthPath = path === "/login" || path === "/register";
    let destination;

    if (!session && !isAuthPath) {
      destination = "/login";
    } else if (session && isAuthPath) {
      destination = session.user.role === "ADMIN" ? "/admin" : "/dashboard";
    } else if (session?.user.role !== "ADMIN" && path === "/admin") {
      destination = "/dashboard";
    } else if (session?.user.role === "ADMIN" && path === "/dashboard") {
      destination = "/admin";
    } else if (session && path === "/") {
      destination = session.user.role === "ADMIN" ? "/admin" : "/dashboard";
    }

    if (!destination || destination === path) return undefined;
    const timer = window.setTimeout(() => navigate(destination, true), 0);
    return () => window.clearTimeout(timer);
  }, [navigate, path, ready, session]);

  if (!ready) {
    return <div className="startup-loading"><span className="spinner" />Verifying secure session…</div>;
  }

  if (!session) {
    return (
      <AuthPage
        mode={path === "/register" ? "register" : "login"}
        navigate={navigate}
        notice={notice}
        onLogin={saveSession}
        onRegisterSuccess={() => setNotice("Registration successful. Sign in with your new account.")}
      />
    );
  }

  let page;
  if (path === "/ledger") {
    page = <LedgerPage session={session} />;
  } else if (path === "/admin" && session.user.role === "ADMIN") {
    page = <AdminDashboard session={session} />;
  } else if (session.user.role === "CUSTOMER") {
    page = <CustomerDashboard onNavigate={navigate} session={session} />;
  } else {
    page = <AdminDashboard session={session} />;
  }

  return (
    <AppShell
      navigate={navigate}
      onLogout={() => logout()}
      path={path}
      session={session}
    >
      {notice && <div className="session-notice" role="status">{notice}</div>}
      {page}
    </AppShell>
  );
}
