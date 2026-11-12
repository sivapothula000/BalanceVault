# BalanceVault API

The Express API runs on port `5000` by default. Configure `DATABASE_URL`,
`JWT_SECRET`, and optionally `JWT_EXPIRES_IN` in the server environment before
starting it. Keep `.env` files and credentials private; do not commit them.

## Authentication

### Register

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

### Login

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

### Current user

`GET /api/auth/me` requires a valid access token and returns the authenticated
user's `id`, `name`, `email`, `role`, and `createdAt`.

```sh
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Admin dashboard

`GET /api/admin/dashboard` requires a valid token with the `ADMIN` role.
Authenticated users without that role receive `403 Forbidden`.

```sh
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

## Accounts

- `POST /api/accounts` creates a zero-balance `PENDING` account for the
  authenticated customer.
- `GET /api/accounts` lists the authenticated customer's accounts. Admins see
  all accounts.
- `PATCH /api/admin/accounts/<ACCOUNT_ID>/activate` activates a pending account
  and is restricted to admins.

All three endpoints require a bearer token. Customers cannot activate accounts
or list other customers' accounts.

## Transfers

`POST /api/transfers` requires an authenticated customer and active source and
destination accounts. Send the amount as a decimal string to preserve cents:

```sh
curl -X POST http://localhost:5000/api/transfers \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sourceAccountId":"<SOURCE_ACCOUNT_ID>","destinationAccountNo":"<DESTINATION_ACCOUNT_NO>","amount":"12.50"}'
```

Successful transfers update both account balances and create matching debit
and credit ledger entries atomically.

## Ledger

`GET /api/ledger` requires a bearer token. Customers see entries only for their
own accounts; admins can see all entries.

## Health checks

- `GET /api/health` checks that the API is responding.
- `GET /api/db-health` checks the PostgreSQL connection.
