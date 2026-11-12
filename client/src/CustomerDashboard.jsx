import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { formatMinorUnits, formatMoney, sumMoney } from "./money.js";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>;
}

function LoadingState({ label = "Loading your accounts…" }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">○</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export default function CustomerDashboard({ session, onNavigate }) {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountNo, setDestinationAccountNo] = useState("");
  const [amount, setAmount] = useState("");
  const [reviewTransfer, setReviewTransfer] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferMessage, setTransferMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [accountResult, ledgerResult] = await Promise.all([
        api.getAccounts(session.token),
        api.getLedger(session.token),
      ]);
      setAccounts(accountResult.accounts);
      setEntries(ledgerResult.entries);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getAccounts(session.token),
      api.getLedger(session.token),
    ])
      .then(([accountResult, ledgerResult]) => {
        if (!active) return;
        setAccounts(accountResult.accounts);
        setEntries(ledgerResult.entries);
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

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === "ACTIVE"),
    [accounts]
  );
  const fundedAccounts = useMemo(
    () => activeAccounts.filter((account) => sumMoney([account.balance]) > 0n),
    [activeAccounts]
  );
  const totalBalance = sumMoney(activeAccounts.map((account) => account.balance));
  const selectedSource = fundedAccounts.find((account) => account.id === sourceAccountId);

  async function handleCreateAccount() {
    setAccountBusy(true);
    setAccountError("");
    setAccountMessage("");
    try {
      await api.createAccount(session.token);
      setAccountMessage("Account created. It will be available for transfers after activation.");
      await loadDashboard();
    } catch (requestError) {
      setAccountError(requestError.message);
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleTransfer(event) {
    event.preventDefault();
    setTransferError("");
    setTransferMessage("");
    setReviewTransfer(false);
    setTransferBusy(true);

    try {
      const result = await api.createTransfer(session.token, {
        sourceAccountId,
        destinationAccountNo: destinationAccountNo.trim(),
        amount,
      });
      setTransferMessage(`Transfer ${result.transfer.id} was sent successfully.`);
      setDestinationAccountNo("");
      setAmount("");
      await loadDashboard();
    } catch (requestError) {
      setTransferError(requestError.message);
    } finally {
      setTransferBusy(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">OVERVIEW</span>
          <h1>Good to see you, {session.user.name.split(" ")[0]}</h1>
          <p className="muted">Here’s what’s happening with your money.</p>
        </div>
        <button className="button button-secondary" disabled={loading} onClick={loadDashboard} type="button">
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button className="text-button" onClick={loadDashboard} type="button">Try again</button>
        </div>
      )}

      <section className="balance-banner">
        <div className="balance-copy">
          <span className="balance-label">TOTAL ACTIVE BALANCE</span>
          {loading ? (
            <div className="balance-loading" aria-label="Loading balance" />
          ) : error ? (
            <strong>Unavailable</strong>
          ) : (
            <strong>{formatMinorUnits(totalBalance)}</strong>
          )}
          <span className="balance-caption">
            Across {activeAccounts.length} active {activeAccounts.length === 1 ? "account" : "accounts"}
          </span>
        </div>
        <div className="balance-decoration" aria-hidden="true">
          <span className="decoration-circle circle-one" />
          <span className="decoration-circle circle-two" />
          <span className="decoration-line" />
          <span className="decoration-dot" />
        </div>
        <div className="balance-chip"><span /> BALANCEVAULT</div>
      </section>

      <section className="dashboard-grid">
        <div className="panel accounts-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">YOUR ACCOUNTS</span>
              <h2>Accounts</h2>
            </div>
            <button
              className="button button-primary button-small"
              disabled={accountBusy}
              onClick={handleCreateAccount}
              type="button"
            >
              {accountBusy ? "Creating…" : <><span aria-hidden="true">＋</span> New account</>}
            </button>
          </div>

          {accountMessage && <div className="alert alert-success compact-alert" role="status">{accountMessage}</div>}
          {accountError && <div className="alert alert-error compact-alert" role="alert">{accountError}</div>}
          {loading ? <LoadingState /> : accounts.length === 0 ? (
            <EmptyState title="Your first account starts here">
              Create an account to see it in your BalanceVault dashboard.
            </EmptyState>
          ) : (
            <div className="account-list">
              {accounts.map((account) => (
                <article className="account-row" key={account.id}>
                  <span className="account-avatar" aria-hidden="true">B</span>
                  <div className="account-main">
                    <strong>BalanceVault account</strong>
                    <span>•••• {account.accountNo.slice(-4)}</span>
                  </div>
                  <StatusBadge status={account.status} />
                  <strong className="account-balance">{formatMoney(account.balance)}</strong>
                </article>
              ))}
            </div>
          )}
          {accounts.length > 0 && !loading && (
            <p className="panel-footnote">Pending accounts become available once activated by an administrator.</p>
          )}
        </div>

        <div className="panel transfer-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MOVE MONEY</span>
              <h2>Make a transfer</h2>
            </div>
            <span className="panel-heading-icon" aria-hidden="true">↗</span>
          </div>
          <p className="muted panel-description">Send money to another active BalanceVault account.</p>

          {transferError && <div className="alert alert-error compact-alert" role="alert">{transferError}</div>}
          {transferMessage && <div className="alert alert-success compact-alert" role="status">{transferMessage}</div>}

          {activeAccounts.length === 0 ? (
            <EmptyState title="No active accounts yet">
              You can start a transfer after your account has been activated.
            </EmptyState>
          ) : fundedAccounts.length === 0 ? (
            <EmptyState title="No funds available">
              Transfers require an active account with a positive balance. New accounts start at zero.
            </EmptyState>
          ) : (
            <form className="transfer-form" onSubmit={(event) => {
              event.preventDefault();
              setTransferError("");
              setTransferMessage("");
              setReviewTransfer(true);
            }}>
              <label className="field">
                <span>From account</span>
                <select
                  onChange={(event) => setSourceAccountId(event.target.value)}
                  required
                  value={sourceAccountId}
                >
                  <option value="">Choose an account</option>
                  {fundedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      •••• {account.accountNo.slice(-4)} · {formatMoney(account.balance)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Recipient account number</span>
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength="32"
                  onChange={(event) => setDestinationAccountNo(event.target.value)}
                  placeholder="Enter account number"
                  required
                  value={destinationAccountNo}
                />
              </label>
              <label className="field">
                <span>Amount</span>
                <div className="amount-input">
                  <span>¤</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => setAmount(event.target.value)}
                    pattern="(?=.*[1-9])(?:0|[1-9][0-9]{0,12})(?:\.[0-9]{1,2})?"
                    placeholder="0.00"
                    required
                    value={amount}
                  />
                </div>
                <small>Enter a positive amount with up to two decimal places.</small>
              </label>
              <button
                className="button button-primary button-wide"
                disabled={!selectedSource || !destinationAccountNo || !amount || transferBusy}
                type="submit"
              >
                Review transfer <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">YOUR ACTIVITY</span>
            <h2>Recent transactions</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate("/ledger")} type="button">
            View ledger <span aria-hidden="true">→</span>
          </button>
        </div>
        {loading ? <LoadingState label="Loading transactions…" /> : entries.length === 0 ? (
          <EmptyState title="Nothing to show yet">
            Your account activity will appear here after your first transfer.
          </EmptyState>
        ) : (
          <div className="transaction-list">
            {entries.slice(0, 5).map((entry) => (
              <article className="transaction-row" key={entry.id}>
                <span className={`transaction-icon ${entry.type.toLowerCase()}`} aria-hidden="true">
                  {entry.type === "CREDIT" ? "↓" : "↑"}
                </span>
                <div className="transaction-main">
                  <strong>{entry.type === "CREDIT" ? "Money received" : "Money sent"}</strong>
                  <span>•••• {entry.account.accountNo.slice(-4)} · {formatDate(entry.createdAt)}</span>
                </div>
                <strong className={`transaction-amount ${entry.type.toLowerCase()}`}>
                  {entry.type === "CREDIT" ? "+" : "−"}{formatMoney(entry.amount)}
                </strong>
              </article>
            ))}
          </div>
        )}
      </section>

      {reviewTransfer && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setReviewTransfer(false);
        }}>
          <section aria-labelledby="review-title" aria-modal="true" className="confirm-modal" role="dialog">
            <span className="confirm-mark" aria-hidden="true">↗</span>
            <span className="eyebrow">PLEASE REVIEW</span>
            <h2 id="review-title">Confirm this transfer</h2>
            <p className="muted">Check the details before sending. Transfers cannot be reversed here.</p>
            <dl className="confirm-details">
              <div><dt>From</dt><dd>•••• {selectedSource?.accountNo.slice(-4)}</dd></div>
              <div><dt>To account</dt><dd>{destinationAccountNo}</dd></div>
              <div><dt>Amount</dt><dd>{formatMoney(amount)}</dd></div>
            </dl>
            <div className="confirm-actions">
              <button className="button button-secondary" disabled={transferBusy} onClick={() => setReviewTransfer(false)} type="button">Go back</button>
              <button className="button button-primary" disabled={transferBusy} onClick={handleTransfer} type="button">
                {transferBusy ? "Sending…" : "Confirm and send"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
