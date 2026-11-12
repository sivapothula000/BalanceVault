import { useEffect, useState } from "react";
import { api } from "./api.js";
import { formatMoney } from "./money.js";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function LedgerPage({ session }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLedger() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getLedger(session.token);
      setEntries(result.entries);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.getLedger(session.token)
      .then((result) => {
        if (active) setEntries(result.entries);
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

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT ACTIVITY</span>
          <h1>Ledger</h1>
          <p className="muted">A clear record of every debit and credit.</p>
        </div>
        <button className="button button-secondary" disabled={loading} onClick={loadLedger} type="button">
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <section className="panel ledger-panel">
        {loading ? (
          <div className="loading-state" role="status"><span className="spinner" />Loading ledger…</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">○</span>
            <h3>No ledger entries yet</h3>
            <p>Completed transfers will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Transfer reference</th>
                  <th>Date</th>
                  <th className="align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className={`ledger-type ${entry.type.toLowerCase()}`}>
                        <span aria-hidden="true">{entry.type === "CREDIT" ? "↓" : "↑"}</span>
                        {entry.type}
                      </span>
                    </td>
                    <td><span className="mono">•••• {entry.account.accountNo.slice(-4)}</span></td>
                    <td><span className="reference">{entry.transferId}</span></td>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td className={`align-right ledger-amount ${entry.type.toLowerCase()}`}>
                      {entry.type === "CREDIT" ? "+" : "−"}{formatMoney(entry.amount)}
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
