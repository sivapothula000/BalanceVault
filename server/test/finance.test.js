import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/balancevault";
const previousSecret = process.env.JWT_SECRET;
const testSecret = randomBytes(32).toString("hex");
process.env.JWT_SECRET = testSecret;

const [{ default: jwt }, { default: prisma }, { Prisma }, { default: app }] =
  await Promise.all([
    import("jsonwebtoken"),
    import("../src/config/database.js"),
    import("../src/generated/prisma/client.ts"),
    import("../src/app.js"),
  ]);

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});

const baseUrl = `http://127.0.0.1:${server.address().port}`;
const customerId = "customer-user-id";
const otherCustomerId = "other-customer-id";

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (previousSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousSecret;
  }
});

function createToken(role = "CUSTOMER", userId = customerId) {
  return jwt.sign({ userId, role }, testSecret);
}

function stubMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function account({
  id,
  accountNo,
  userId = customerId,
  status = "ACTIVE",
  balance = "100.00",
}) {
  return {
    id,
    accountNo,
    userId,
    status,
    balance: new Prisma.Decimal(balance),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function copyState(state) {
  return {
    accounts: state.accounts.map((item) => ({
      ...item,
      balance: new Prisma.Decimal(item.balance),
    })),
    transfers: state.transfers.map((item) => ({ ...item })),
    ledgerEntries: state.ledgerEntries.map((item) => ({ ...item })),
  };
}

function createMemoryTransactions(t, initialAccounts) {
  let state = {
    accounts: initialAccounts.map((item) => ({ ...item })),
    transfers: [],
    ledgerEntries: [],
  };
  let nextTransferId = 1;
  let queue = Promise.resolve();

  function createTransactionClient(draft) {
    return {
      account: {
        findFirst: async ({ where }) => {
          const item = draft.accounts.find(
            (candidate) =>
              candidate.id === where.id && candidate.userId === where.userId
          );
          return item ? { id: item.id, status: item.status } : null;
        },
        findUnique: async ({ where }) => {
          const item = draft.accounts.find((candidate) =>
            where.accountNo
              ? candidate.accountNo === where.accountNo
              : candidate.id === where.id
          );
          return item ? { id: item.id, status: item.status } : null;
        },
        updateMany: async ({ where, data }) => {
          const item = draft.accounts.find(
            (candidate) =>
              candidate.id === where.id &&
              (where.userId === undefined ||
                candidate.userId === where.userId) &&
              (where.status === undefined ||
                candidate.status === where.status)
          );
          if (
            !item ||
            (where.balance?.gte &&
              item.balance.lessThan(where.balance.gte))
          ) {
            return { count: 0 };
          }

          if (data.balance?.decrement) {
            item.balance = item.balance.minus(data.balance.decrement);
          }
          if (data.balance?.increment) {
            item.balance = item.balance.plus(data.balance.increment);
          }
          return { count: 1 };
        },
      },
      transfer: {
        create: async ({ data }) => {
          const item = {
            id: `transfer-${nextTransferId++}`,
            ...data,
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
          };
          draft.transfers.push(item);
          return { id: item.id };
        },
        update: async ({ where, data }) => {
          const item = draft.transfers.find(
            (candidate) => candidate.id === where.id
          );
          Object.assign(item, data);
          return {
            id: item.id,
            amount: item.amount,
            status: item.status,
            createdAt: item.createdAt,
          };
        },
      },
      ledgerEntry: {
        createMany: async ({ data }) => {
          draft.ledgerEntries.push(
            ...data.map((entry, index) => ({
              id: `ledger-${draft.ledgerEntries.length + index + 1}`,
              ...entry,
              createdAt: new Date("2026-02-01T00:00:00.000Z"),
            }))
          );
          return { count: data.length };
        },
      },
    };
  }

  stubMethod(t, prisma, "$transaction", async (callback, options) => {
    assert.equal(
      options.isolationLevel,
      Prisma.TransactionIsolationLevel.Serializable
    );

    const previous = queue;
    let release;
    queue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;

    const draft = copyState(state);
    try {
      const result = await callback(createTransactionClient(draft));
      state = draft;
      return result;
    } finally {
      release();
    }
  });

  return {
    get state() {
      return state;
    },
  };
}

test("a customer creates a zero-balance pending account owned by their token", async (t) => {
  let createArgs;
  stubMethod(t, prisma.account, "create", async (args) => {
    createArgs = args;
    return {
      id: "new-account-id",
      ...args.data,
      balance: new Prisma.Decimal(args.data.balance),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
  });

  const response = await request("/api/accounts", {
    method: "POST",
    token: createToken(),
    body: {
      userId: otherCustomerId,
      balance: "999999.99",
      status: "ACTIVE",
    },
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(createArgs.data.userId, customerId);
  assert.equal(createArgs.data.status, "PENDING");
  assert.equal(new Prisma.Decimal(createArgs.data.balance).isZero(), true);
  assert.match(createArgs.data.accountNo, /^\d{12}$/);
  assert.equal(body.account.userId, customerId);
  assert.equal(body.account.balance, "0.00");
});

test("a customer cannot activate an account", async (t) => {
  let updateCalled = false;
  stubMethod(t, prisma.account, "updateMany", async () => {
    updateCalled = true;
    return { count: 1 };
  });

  const response = await request(
    "/api/admin/accounts/account-id/activate",
    {
      method: "PATCH",
      token: createToken(),
    }
  );

  assert.equal(response.status, 403);
  assert.equal(updateCalled, false);
});

test("an admin can activate a pending account", async (t) => {
  let updateArgs;
  stubMethod(t, prisma.account, "updateMany", async (args) => {
    updateArgs = args;
    return { count: 1 };
  });
  stubMethod(t, prisma.account, "findUnique", async () => ({
    id: "account-id",
    accountNo: "123456789012",
    balance: new Prisma.Decimal("0.00"),
    status: "ACTIVE",
    userId: customerId,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  }));

  const response = await request(
    "/api/admin/accounts/account-id/activate",
    {
      method: "PATCH",
      token: createToken("ADMIN", "admin-user-id"),
    }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(updateArgs.where, {
    id: "account-id",
    status: "PENDING",
  });
  assert.equal(body.account.status, "ACTIVE");
  assert.equal(body.account.balance, "0.00");
});

test("a customer only sees their own accounts", async (t) => {
  let query;
  stubMethod(t, prisma.account, "findMany", async (args) => {
    query = args;
    return [
      {
        id: "customer-account",
        accountNo: "123456789012",
        userId: customerId,
        status: "ACTIVE",
        balance: new Prisma.Decimal("12.34"),
      },
    ];
  });

  const response = await request("/api/accounts", { token: createToken() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(query.where, { userId: customerId });
  assert.deepEqual(body.accounts.map((item) => item.id), ["customer-account"]);
  assert.equal(body.accounts[0].balance, "12.34");
});

test("an admin can list accounts across customers", async (t) => {
  let query;
  stubMethod(t, prisma.account, "findMany", async (args) => {
    query = args;
    return [];
  });

  const response = await request("/api/accounts", {
    token: createToken("ADMIN", "admin-user-id"),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(query.where, {});
});

test("a successful transfer updates balances and creates exactly two ledger entries", async (t) => {
  const store = createMemoryTransactions(t, [
    account({ id: "source", accountNo: "111111111111" }),
    account({
      id: "destination",
      accountNo: "222222222222",
      userId: otherCustomerId,
      balance: "10.00",
    }),
  ]);

  const response = await request("/api/transfers", {
    method: "POST",
    token: createToken(),
    body: {
      sourceAccountId: "source",
      destinationAccountNo: "222222222222",
      amount: "25.50",
      userId: otherCustomerId,
      balance: "999999.99",
    },
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.transfer.amount, "25.50");
  assert.equal(body.transfer.status, "COMPLETED");
  assert.equal(store.state.accounts[0].balance.toFixed(2), "74.50");
  assert.equal(store.state.accounts[1].balance.toFixed(2), "35.50");
  assert.equal(store.state.transfers.length, 1);
  assert.equal(store.state.ledgerEntries.length, 2);
  assert.deepEqual(
    store.state.ledgerEntries.map((entry) => entry.type),
    ["DEBIT", "CREDIT"]
  );
  assert.ok(
    store.state.ledgerEntries.every(
      (entry) => entry.transferId === body.transfer.id
    )
  );
});

test("insufficient funds leave balances and ledger unchanged", async (t) => {
  const store = createMemoryTransactions(t, [
    account({ id: "source", accountNo: "111111111111", balance: "10.00" }),
    account({
      id: "destination",
      accountNo: "222222222222",
      userId: otherCustomerId,
      balance: "5.00",
    }),
  ]);

  const response = await request("/api/transfers", {
    method: "POST",
    token: createToken(),
    body: {
      sourceAccountId: "source",
      destinationAccountNo: "222222222222",
      amount: "10.01",
    },
  });

  assert.equal(response.status, 409);
  assert.deepEqual(
    store.state.accounts.map((item) => item.balance.toFixed(2)),
    ["10.00", "5.00"]
  );
  assert.equal(store.state.transfers.length, 0);
  assert.equal(store.state.ledgerEntries.length, 0);
});

test("same-account transfers are rejected without ledger entries", async (t) => {
  const store = createMemoryTransactions(t, [
    account({ id: "source", accountNo: "111111111111" }),
  ]);

  const response = await request("/api/transfers", {
    method: "POST",
    token: createToken(),
    body: {
      sourceAccountId: "source",
      destinationAccountNo: "111111111111",
      amount: "1.00",
    },
  });

  assert.equal(response.status, 400);
  assert.equal(store.state.accounts[0].balance.toFixed(2), "100.00");
  assert.equal(store.state.ledgerEntries.length, 0);
});

test("transfers from inactive source accounts are rejected", async (t) => {
  const store = createMemoryTransactions(t, [
    account({
      id: "source",
      accountNo: "111111111111",
      status: "PENDING",
    }),
    account({
      id: "destination",
      accountNo: "222222222222",
      userId: otherCustomerId,
    }),
  ]);

  const response = await request("/api/transfers", {
    method: "POST",
    token: createToken(),
    body: {
      sourceAccountId: "source",
      destinationAccountNo: "222222222222",
      amount: "1.00",
    },
  });

  assert.equal(response.status, 409);
  assert.equal(store.state.ledgerEntries.length, 0);
});

test("a customer cannot transfer from another customer's account", async (t) => {
  const store = createMemoryTransactions(t, [
    account({
      id: "source",
      accountNo: "111111111111",
      userId: otherCustomerId,
    }),
    account({
      id: "destination",
      accountNo: "222222222222",
      userId: customerId,
    }),
  ]);

  const response = await request("/api/transfers", {
    method: "POST",
    token: createToken(),
    body: {
      sourceAccountId: "source",
      destinationAccountNo: "222222222222",
      amount: "1.00",
    },
  });

  assert.equal(response.status, 404);
  assert.equal(store.state.accounts[0].balance.toFixed(2), "100.00");
  assert.equal(store.state.ledgerEntries.length, 0);
});

test("transfers to inactive destination accounts are rejected", async (t) => {
  const store = createMemoryTransactions(t, [
    account({ id: "source", accountNo: "111111111111" }),
    account({
      id: "destination",
      accountNo: "222222222222",
      userId: otherCustomerId,
      status: "SUSPENDED",
    }),
  ]);

  const response = await request("/api/transfers", {
    method: "POST",
    token: createToken(),
    body: {
      sourceAccountId: "source",
      destinationAccountNo: "222222222222",
      amount: "1.00",
    },
  });

  assert.equal(response.status, 409);
  assert.equal(store.state.accounts[0].balance.toFixed(2), "100.00");
  assert.equal(store.state.ledgerEntries.length, 0);
});

test("concurrent transfers cannot overspend the source account", async (t) => {
  const store = createMemoryTransactions(t, [
    account({ id: "source", accountNo: "111111111111", balance: "100.00" }),
    account({
      id: "destination-one",
      accountNo: "222222222222",
      userId: otherCustomerId,
      balance: "0.00",
    }),
    account({
      id: "destination-two",
      accountNo: "333333333333",
      userId: otherCustomerId,
      balance: "0.00",
    }),
  ]);

  const token = createToken();
  const responses = await Promise.all([
    request("/api/transfers", {
      method: "POST",
      token,
      body: {
        sourceAccountId: "source",
        destinationAccountNo: "222222222222",
        amount: "80.00",
      },
    }),
    request("/api/transfers", {
      method: "POST",
      token,
      body: {
        sourceAccountId: "source",
        destinationAccountNo: "333333333333",
        amount: "80.00",
      },
    }),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409]
  );
  assert.equal(store.state.accounts[0].balance.toFixed(2), "20.00");
  assert.equal(store.state.transfers.length, 1);
  assert.equal(store.state.ledgerEntries.length, 2);
});

test("customers only see ledger entries for their own accounts", async (t) => {
  let query;
  stubMethod(t, prisma.ledgerEntry, "findMany", async (args) => {
    query = args;
    return [
      {
        id: "ledger-entry",
        type: "DEBIT",
        amount: new Prisma.Decimal("2.50"),
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        accountId: "customer-account",
        transferId: "transfer-id",
        account: {
          id: "customer-account",
          accountNo: "111111111111",
        },
      },
    ];
  });

  const response = await request("/api/ledger", { token: createToken() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(query.where, {
    account: { is: { userId: customerId } },
  });
  assert.deepEqual(body.entries.map((entry) => entry.accountId), [
    "customer-account",
  ]);
  assert.equal("userId" in body.entries[0], false);
  assert.equal(body.entries[0].amount, "2.50");
});

test("admins can see ledger entries across all accounts", async (t) => {
  let query;
  stubMethod(t, prisma.ledgerEntry, "findMany", async (args) => {
    query = args;
    return [];
  });

  const response = await request("/api/ledger", {
    token: createToken("ADMIN", "admin-user-id"),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(query.where, {});
});
