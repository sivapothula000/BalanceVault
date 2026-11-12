# BalanceVault

BalanceVault is a learning project for account management and money transfers. It
includes a React frontend and an Express API backed by PostgreSQL and Prisma.
The application demonstrates authentication, server-side authorization,
account ownership checks, transactional transfers, and a transfer ledger. It is
a prototype, not a production banking or payment service.

## Problem and objectives

Account and transfer features need to protect customer data, validate money
operations, and record movement consistently. BalanceVault was built to
practice those backend and frontend responsibilities with a small, explainable
application.

Project objectives:

- Authenticate users and authorize customer and admin operations on the server.
- Keep account access scoped to the authenticated customer.
- Use decimal database values and a transaction for balance updates.
- Record a debit and credit entry for successful transfers.
- Provide a frontend for registration, login, account viewing, transfers, and
  ledger review.

## Implemented features

- Customer registration and login with input validation, bcrypt password
  hashing, and signed JWT access tokens.
- Protected current-user, account, transfer, and ledger APIs.
- Customer account creation with a zero balance and `PENDING` status.
- Customer-only account listing; admins can list all accounts.
- Admin activation of pending accounts.
- Transfers between active accounts when the source has sufficient funds.
- Debit and credit ledger entries created with the transfer.
- Customer-scoped ledger results and admin ledger access.
- React pages for registration, login, customer overview, transfers, ledger, and
  admin account activation.
- API and database health endpoints.

Public registration always creates a `CUSTOMER`. There is no public admin
creation endpoint or admin user directory.

## Technology stack

- Node.js and JavaScript ES modules
- React and Vite
- Express 5
- PostgreSQL
- Prisma ORM 7 with the PostgreSQL adapter
- bcryptjs, Zod, and jsonwebtoken
- Helmet and CORS

The application code is JavaScript. Prisma's generated client contains
TypeScript files and is loaded by the backend through `tsx`. Local development
used Node.js 22; the Render deployment used Node.js 24.22.1. The package
manifests do not enforce either version.

## Architecture

```text
Browser
`-- React + Vite frontend (client/)
    `-- JSON requests with a bearer JWT
        `-- Express API (server/src/)
            `-- Prisma PostgreSQL adapter
                `-- PostgreSQL
```

The frontend centralizes requests in `client/src/api.js`. Its `VITE_API_URL`
value is the backend origin; the client adds `/api` to requests. The backend
loads its database connection from `DATABASE_URL` and applies Prisma migrations
from `server/prisma/migrations/`.

## Repository structure

```text
.
|-- README.md
|-- PROMPTS.md
|-- THREATS.md
|-- .env.example
|-- client/
|   |-- public/
|   |-- src/
|   |   |-- AdminDashboard.jsx
|   |   |-- App.jsx
|   |   |-- AuthPage.jsx
|   |   |-- CustomerDashboard.jsx
|   |   |-- LedgerPage.jsx
|   |   |-- api.js
|   |   `-- money.js
|   |-- test/money.test.js
|   |-- package.json
|   `-- vite.config.js
`-- server/
    |-- prisma/
    |   |-- migrations/
    |   `-- schema.prisma
    |-- src/
    |   |-- config/
    |   |-- controllers/
    |   |-- generated/prisma/
    |   |-- middleware/
    |   |-- routes/
    |   |-- app.js
    |   `-- server.js
    |-- test/
    |-- package.json
    `-- prisma7.config.ts
```

## Local setup

### Prerequisites

- Node.js 22 (used for local development) and npm
- A PostgreSQL instance and a database for this project

### Backend

1. Configure the backend environment variables described below in
   `server/.env`. Replace all placeholders with values for your own local
   PostgreSQL installation. Do not commit this file.
2. Install dependencies, generate the Prisma client, and apply the existing
   migrations:

   ```sh
   cd server
   npm install
   npx prisma generate --config prisma7.config.ts
   npx prisma migrate deploy --config prisma7.config.ts
   ```

3. Start the API:

   ```sh
   npm run dev
   ```

The backend listens on port `5000` by default. `npm start` runs the production
start command from the `server` directory.

When developing a schema change, create a new migration with
`npx prisma migrate dev --name <MIGRATION_NAME> --config prisma7.config.ts`.
Do not use a development migration command as a substitute for applying the
committed migrations in a deployed environment.

### Frontend

In another terminal:

```sh
cd client
npm install
```

The local API URL defaults to `http://localhost:5000`. To set it explicitly,
create `client/.env`:

```dotenv
VITE_API_URL=http://localhost:5000
```

Start Vite:

```sh
npm run dev
```

Vite's development server normally uses `http://localhost:5173`, which is
included in the backend's default CORS allowlist.

## Environment variables

Use placeholders only in documentation. Set real values in local, Vercel, or
Render environment settings; never commit secrets. Variables prefixed with
`VITE_` are bundled for browser use and must not contain secrets.

### Backend (`server/.env`)

```dotenv
DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?schema=public"
JWT_SECRET="<GENERATE_A_LONG_RANDOM_SECRET>"
JWT_EXPIRES_IN=1h
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,https://balance-vault-red.vercel.app
```

| Variable | Use |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. |
| `JWT_SECRET` | Required signing and verification secret for JWTs. Keep it private. |
| `JWT_EXPIRES_IN` | Optional JWT lifetime; the code defaults to `1h`. |
| `PORT` | Optional backend port; the code defaults to `5000`. |
| `CORS_ORIGIN` | Optional comma-separated allowed origins. The code defaults to localhost and the listed Vercel origin. |
| `NODE_ENV` | Present in the example environment file; application source does not currently branch on it. |

### Frontend (`client/.env` or Vercel environment)

```dotenv
VITE_API_URL=http://localhost:5000
```

For Vercel, set `VITE_API_URL` to the backend origin:
`https://balancevault-api-8fvj.onrender.com`. Do not append `/api`; the
frontend adds that path. Production environment values must be configured in
the hosting provider and are not stored in this repository.

## Database and Prisma

Create a PostgreSQL database and set `DATABASE_URL` to its connection string.
The Prisma datasource is PostgreSQL; connection configuration is in
`server/prisma7.config.ts`. Apply the committed migrations with:

```sh
cd server
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

The schema defines users, accounts, transfers, and ledger entries. Monetary
fields use PostgreSQL `DECIMAL(15, 2)`. The migrations are additive; keep
existing data and migrations when evolving the schema.

## API

The API runs on port `5000` by default. Configure `DATABASE_URL`,
`JWT_SECRET`, and optionally `JWT_EXPIRES_IN` in the server environment before
starting it. Keep `.env` files and credentials private; do not commit them.

### Authentication

#### Register

`POST /api/auth/register`

```json
{
  "name": "Test Customer",
  "email": "<TEST_EMAIL>",
  "password": "<TEST_PASSWORD>"
}
```

Example:

```sh
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","email":"<TEST_EMAIL>","password":"<TEST_PASSWORD>"}'
```

Successful registration returns `201` with the user's `id`, `name`, `email`,
`role`, and `createdAt`. It does not return the password hash.

#### Login

`POST /api/auth/login`

```json
{
  "email": "<TEST_EMAIL>",
  "password": "<TEST_PASSWORD>"
}
```

Example:

```sh
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<TEST_EMAIL>","password":"<TEST_PASSWORD>"}'
```

Successful login returns a signed JWT and the user's `id`, `name`, `email`, and
`role`. The token includes `userId` and `role`; its lifetime is configured with
`JWT_EXPIRES_IN` and defaults to one hour. Invalid credentials return the same
`401` response regardless of whether the email exists.

#### Current user

`GET /api/auth/me` requires a valid access token and returns the authenticated
user's `id`, `name`, `email`, `role`, and `createdAt`.

```sh
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

#### Admin dashboard

`GET /api/admin/dashboard` requires a valid token with the `ADMIN` role.
Authenticated users without that role receive `403 Forbidden`.

```sh
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

This endpoint confirms admin access; it does not return a user directory.

### Accounts

- `POST /api/accounts` creates a zero-balance `PENDING` account for the
  authenticated customer.
- `GET /api/accounts` lists the authenticated customer's accounts. Admins see
  all accounts.
- `PATCH /api/admin/accounts/<ACCOUNT_ID>/activate` activates a pending account
  and is restricted to admins.

All three endpoints require a bearer token. Customers cannot activate accounts
or list other customers' accounts.

### Transfers

`POST /api/transfers` requires an authenticated customer and active source and
destination accounts. The source must have sufficient funds. Send the amount
as a decimal string to preserve cents:

```sh
curl -X POST http://localhost:5000/api/transfers \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sourceAccountId":"<SOURCE_ACCOUNT_ID>","destinationAccountNo":"<DESTINATION_ACCOUNT_NO>","amount":"12.50"}'
```

Successful transfers update both account balances and create matching debit
and credit ledger entries in a database transaction. There is no deposit or
funding endpoint; the source account must already have funds.

### Ledger

`GET /api/ledger` requires a bearer token. Customers see entries only for their
own accounts; admins can see all entries.

### Health checks

- `GET /api/health` checks that the API is responding.
- `GET /api/db-health` checks the PostgreSQL connection.

## Testing and quality commands

Run backend tests from `server/`:

```sh
npm test
```

Run frontend money-formatting tests from `client/`:

```sh
node --test test/money.test.js
```

The frontend package does not define an `npm test` script. Its available
quality/build scripts are:

```sh
npm run lint
npm run build
npm run preview
```

Backend finance tests use mocked or in-memory Prisma behavior. They do not
prove concurrent transaction safety against a live PostgreSQL database. The
frontend test file covers monetary formatting and validation; it is not an
end-to-end browser test suite.

## Deployments

- Frontend: [https://balance-vault-red.vercel.app/](https://balance-vault-red.vercel.app/)
- Backend: [https://balancevault-api-8fvj.onrender.com](https://balancevault-api-8fvj.onrender.com)

The repository does not include Vercel or Render deployment manifests. Set
`VITE_API_URL` on Vercel and the backend variables, including `DATABASE_URL`,
`JWT_SECRET`, and `CORS_ORIGIN`, on Render. The URLs are documented deployment
targets; live availability and provider environment settings have not been
verified from this repository.

## Implemented security measures

- Passwords are hashed with bcrypt; request input is validated with Zod.
- JWTs are signed with a required environment secret and verified by backend
  middleware.
- Role checks and account ownership checks run on the server, not only in the
  frontend.
- Transfers use decimal values, a sufficient-balance condition, and a Prisma
  transaction with serializable isolation.
- Helmet is enabled, and CORS uses an explicit origin allowlist.
- API responses avoid returning password hashes. Local `.env` files are ignored
  by Git.

These measures do not make the application suitable for real banking use.

## Known limitations and future improvements

- **No deposit or funding workflow.** New accounts start at zero balance.
- **No transfer idempotency protection.** A retry can submit a duplicate
  transfer.
- **No login rate limiting.** Other API endpoints are not rate-limited either.
- **No server-side JWT revocation.** Removing a token in the frontend does not
  invalidate it on the backend before its expiry.
- **No immutable or tamper-proof audit mechanism.** The ledger is not a
  compliance-grade audit system.
- Backend financial tests use mocks/in-memory behavior and do not prove live
  PostgreSQL concurrency safety.
- The frontend stores its JWT in `sessionStorage`; it is accessible to
  JavaScript running in the page.
- There is no admin user directory or public admin provisioning workflow.
- Add PostgreSQL integration tests, idempotency protection, rate limiting,
  revocation, stronger audit controls, and a controlled funding workflow before
  considering broader production use.
