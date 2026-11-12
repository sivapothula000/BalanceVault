import { useEffect, useState } from "react";
import { api } from "./api.js";
import { formatMoney } from "./money.js";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminDashboard({ session }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activatingId, setActivatingId] = useState("");

  async function loadAccounts() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAccounts(session.token);
      setAccounts(result.accounts);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.getAccounts(session.token)
      .then((result) => {
        if (active) setAccounts(result.accounts);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.token]);

  async function handleActivate(accountId) {
    setActivatingId(accountId);
    setError("");
    setNotice("");
    try {
      await api.activateAccount(session.token, accountId);
      setNotice("Account activated.");
      await loadAccounts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActivatingId("");
    }
  }

  const pendingCount = accounts.filter((account) => account.status === "PENDING").length;

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Accounts overview</h1>
          <p className="muted">Review account activity and activation requests.</p>
        </div>
        <button className="button button-secondary" disabled={loading} onClick={loadAccounts} type="button">
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </div>

      <div className="alert alert-info admin-info">
        <span className="info-symbol" aria-hidden="true">i</span>
        <span>
          User directory is unavailable: the backend does not currently expose an admin users-list API.
          This page uses the existing all-accounts endpoint.
        </span>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <section className="admin-summary-grid">
        <article className="summary-card">
          <span className="summary-icon summary-icon-violet" aria-hidden="true">▤</span>
          <div><span>Total accounts</span><strong>{loading ? "—" : accounts.length}</strong></div>
        </article>
        <article className="summary-card">
          <span className="summary-icon summary-icon-amber" aria-hidden="true">◷</span>
          <div><span>Awaiting activation</span><strong>{loading ? "—" : pendingCount}</strong></div>
        </article>
        <article className="summary-card">
          <span className="summary-icon summary-icon-green" aria-hidden="true">✓</span>
          <div><span>Active accounts</span><strong>{loading ? "—" : accounts.filter((account) => account.status === "ACTIVE").length}</strong></div>
        </article>
      </section>

      <section className="panel ledger-panel">
        <div className="panel-heading admin-table-heading">
          <div>
            <span className="eyebrow">ACCOUNT DIRECTORY</span>
            <h2>Customer accounts</h2>
          </div>
        </div>
        {loading ? (
          <div className="loading-state" role="status"><span className="spinner" />Loading accounts…</div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">○</span>
            <h3>No accounts found</h3>
            <p>New customer accounts will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="ledger-table admin-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Customer ID</th>
                  <th>Opened</th>
                  <th>Status</th>
                  <th className="align-right">Balance</th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td><span className="mono">•••• {account.accountNo.slice(-4)}</span></td>
                    <td><span className="reference">{account.userId}</span></td>
                    <td>{formatDate(account.createdAt)}</td>
                    <td><span className={`status-badge status-${account.status.toLowerCase()}`}>{account.status}</span></td>
                    <td className="align-right ledger-amount">{formatMoney(account.balance)}</td>
                    <td className="align-right">
                      {account.status === "PENDING" ? (
                        <button
                          className="button button-primary button-small"
                          disabled={activatingId === account.id}
                          onClick={() => handleActivate(account.id)}
                          type="button"
                        >
                          {activatingId === account.id ? "Activating…" : "Activate"}
                        </button>
                      ) : <span className="muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
