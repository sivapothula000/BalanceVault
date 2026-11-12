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

## Health checks

- `GET /api/health` checks that the API is responding.
- `GET /api/db-health` checks the PostgreSQL connection.
