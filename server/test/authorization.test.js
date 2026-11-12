import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/balancevault";
const previousSecret = process.env.JWT_SECRET;
const testSecret = randomBytes(32).toString("hex");
process.env.JWT_SECRET = testSecret;

const [{ default: jwt }, { default: prisma }, { default: app }] =
  await Promise.all([
    import("jsonwebtoken"),
    import("../src/config/database.js"),
    import("../src/app.js"),
  ]);

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});

const baseUrl = `http://127.0.0.1:${server.address().port}`;

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

function createToken(role, userId = "test-user-id", options = {}) {
  return jwt.sign({ userId, role }, testSecret, options);
}

function stubFindUnique(t, implementation) {
  const original = prisma.user.findUnique;
  prisma.user.findUnique = implementation;
  t.after(() => {
    prisma.user.findUnique = original;
  });
}

test("protected routes reject a missing token", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);

  assert.equal(response.status, 401);
});

test("protected routes reject an invalid token", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: "Bearer not-a-valid-token" },
  });

  assert.equal(response.status, 401);
});

test("protected routes reject a malformed bearer header", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: "Bearer token extra" },
  });

  assert.equal(response.status, 401);
});

test("protected routes reject an expired token", async () => {
  const token = createToken("CUSTOMER", "test-user-id", { expiresIn: -1 });
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 401);
});

test("a CUSTOMER token accesses /me and returns only safe user fields", async (t) => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const user = {
    id: "customer-user-id",
    name: "Test Customer",
    email: "customer@example.com",
    role: "CUSTOMER",
    createdAt,
  };
  let query;
  stubFindUnique(t, async (args) => {
    query = args;
    return user;
  });

  const token = createToken("CUSTOMER", user.id);
  const response = await fetch(
    `${baseUrl}/api/auth/me?userId=attacker-id&role=ADMIN`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.user, {
    ...user,
    createdAt: createdAt.toISOString(),
  });
  assert.equal("passwordHash" in body.user, false);
  assert.deepEqual(query.where, { id: user.id });
  assert.deepEqual(query.select, {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
  });
});

test("a CUSTOMER token is forbidden from the admin dashboard", async () => {
  const token = createToken("CUSTOMER");
  const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 403);
});

test("an ADMIN token can access the admin dashboard", async () => {
  const token = createToken("ADMIN");
  const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    success: true,
    message: "Admin access granted",
  });
});
