import { isMoneyAmount } from "./money.js";

const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function validateAccountsResponse(result) {
  const statuses = ["PENDING", "ACTIVE", "SUSPENDED"];
  if (
    !Array.isArray(result?.accounts) ||
    result.accounts.some((account) =>
      !account ||
      typeof account.id !== "string" ||
      typeof account.accountNo !== "string" ||
      !statuses.includes(account.status) ||
      !isMoneyAmount(account.balance)
    )
  ) {
    throw new Error("Account data is invalid. Refresh the dashboard or contact support.");
  }
  return result;
}

function validateLedgerResponse(result) {
  if (
    !Array.isArray(result?.entries) ||
    result.entries.some((entry) =>
      !entry ||
      typeof entry.id !== "string" ||
      typeof entry.transferId !== "string" ||
      !["DEBIT", "CREDIT"].includes(entry.type) ||
      !isMoneyAmount(entry.amount) ||
      !Number.isFinite(Date.parse(entry.createdAt)) ||
      typeof entry.account?.accountNo !== "string"
    )
  ) {
    throw new Error("Ledger data is invalid. Refresh the page or contact support.");
  }
  return result;
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && token) {
    window.dispatchEvent(new CustomEvent("balancevault:session-expired"));
  }

  if (!response.ok) {
    const error = new Error(data.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  register: (body) =>
    apiRequest("/auth/register", { method: "POST", body }),
  login: (body) => apiRequest("/auth/login", { method: "POST", body }),
  getCurrentUser: (token) => apiRequest("/auth/me", { token }),
  getAccounts: async (token) =>
    validateAccountsResponse(await apiRequest("/accounts", { token })),
  createAccount: (token) =>
    apiRequest("/accounts", { method: "POST", token, body: {} }),
  activateAccount: (token, accountId) =>
    apiRequest(`/admin/accounts/${encodeURIComponent(accountId)}/activate`, {
      method: "PATCH",
      token,
    }),
  createTransfer: (token, body) =>
    apiRequest("/transfers", { method: "POST", token, body }),
  getLedger: async (token) =>
    validateLedgerResponse(await apiRequest("/ledger", { token })),
};
