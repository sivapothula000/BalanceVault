import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/balancevault";

const [{ default: bcrypt }, { default: jwt }, { default: prisma }, controller] =
  await Promise.all([
    import("bcryptjs"),
    import("jsonwebtoken"),
    import("../src/config/database.js"),
    import("../src/controllers/auth.controller.js"),
  ]);

const testPassword = "TestPass123!";
const passwordHash = await bcrypt.hash(testPassword, 4);
const testUser = {
  id: "test-user-id",
  name: "Test Customer",
  email: "customer@example.com",
  role: "CUSTOMER",
  passwordHash,
};

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function restoreEnvironment(t, name) {
  const originalValue = process.env[name];
  t.after(() => {
    if (originalValue === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = originalValue;
    }
  });
}

function stubUserMethod(t, name, implementation) {
  const original = prisma.user[name];
  prisma.user[name] = implementation;
  t.after(() => {
    prisma.user[name] = original;
  });
  return prisma.user[name];
}

test("login returns a signed token and a user without the password hash", async (t) => {
  const secret = randomBytes(32).toString("hex");
  restoreEnvironment(t, "JWT_SECRET");
  restoreEnvironment(t, "JWT_EXPIRES_IN");
  process.env.JWT_SECRET = secret;
  delete process.env.JWT_EXPIRES_IN;
  stubUserMethod(t, "findUnique", async () => testUser);

  const res = createResponse();
  await controller.loginUser(
    { body: { email: "  CUSTOMER@EXAMPLE.COM ", password: testPassword } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.user, {
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    role: testUser.role,
  });
  assert.equal("passwordHash" in res.body.user, false);

  const payload = jwt.verify(res.body.token, secret);
  assert.equal(payload.userId, testUser.id);
  assert.equal(payload.role, testUser.role);
  assert.ok(payload.exp - payload.iat >= 3599);
});

test("login rejects an incorrect password with a generic unauthorized response", async (t) => {
  restoreEnvironment(t, "JWT_SECRET");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  stubUserMethod(t, "findUnique", async () => testUser);

  const res = createResponse();
  await controller.loginUser(
    { body: { email: testUser.email, password: "WrongPass123!" } },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    message: "Invalid email or password",
  });
});

test("login rejects an unknown email with the same generic unauthorized response", async (t) => {
  restoreEnvironment(t, "JWT_SECRET");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  stubUserMethod(t, "findUnique", async () => null);

  const res = createResponse();
  await controller.loginUser(
    { body: { email: "unknown@example.com", password: testPassword } },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    message: "Invalid email or password",
  });
});

test("login rejects an invalid email before looking up a user", async (t) => {
  let lookupCount = 0;
  stubUserMethod(t, "findUnique", async () => {
    lookupCount += 1;
    return testUser;
  });

  const res = createResponse();
  await controller.loginUser(
    { body: { email: "not-an-email", password: testPassword } },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(lookupCount, 0);
});

test("login rejects a missing password before looking up a user", async (t) => {
  let lookupCount = 0;
  stubUserMethod(t, "findUnique", async () => {
    lookupCount += 1;
    return testUser;
  });

  const res = createResponse();
  await controller.loginUser({ body: { email: testUser.email } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(lookupCount, 0);
});

test("login returns a generic server error when JWT_SECRET is missing", async (t) => {
  restoreEnvironment(t, "JWT_SECRET");
  delete process.env.JWT_SECRET;
  stubUserMethod(t, "findUnique", async () => testUser);
  t.mock.method(console, "error", () => {});

  const res = createResponse();
  await controller.loginUser(
    { body: { email: testUser.email, password: testPassword } },
    res
  );

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: "Internal server error",
  });
});

test("registration creates a user and does not return the password hash", async (t) => {
  let lookupCount = 0;
  stubUserMethod(t, "findUnique", async () => {
    lookupCount += 1;
    return null;
  });
  const createdUser = {
    id: "registered-user-id",
    name: "New Customer",
    email: "new-customer@example.com",
    role: "CUSTOMER",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  let createCount = 0;
  let createArguments;
  stubUserMethod(t, "create", async (args) => {
    createCount += 1;
    createArguments = args;
    return createdUser;
  });

  const res = createResponse();
  await controller.registerUser(
    {
      body: {
        name: "New Customer",
        email: " NEW-CUSTOMER@EXAMPLE.COM ",
        password: testPassword,
      },
    },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(lookupCount, 1);
  assert.equal(createCount, 1);
  assert.equal(createArguments.data.email, createdUser.email);
  assert.equal("passwordHash" in res.body.user, false);
});
