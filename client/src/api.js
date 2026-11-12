const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

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
  getAccounts: (token) => apiRequest("/accounts", { token }),
  createAccount: (token) =>
    apiRequest("/accounts", { method: "POST", token, body: {} }),
  activateAccount: (token, accountId) =>
    apiRequest(`/admin/accounts/${encodeURIComponent(accountId)}/activate`, {
      method: "PATCH",
      token,
    }),
  createTransfer: (token, body) =>
    apiRequest("/transfers", { method: "POST", token, body }),
  getLedger: (token) => apiRequest("/ledger", { token }),
};
