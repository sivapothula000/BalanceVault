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

## Health checks

- `GET /api/health` checks that the API is responding.
- `GET /api/db-health` checks the PostgreSQL connection.
