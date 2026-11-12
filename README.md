# user-service

User identity service for public users and backoffice operators. It uses NestJS, PostgreSQL, Prisma, and Better Auth. The project is API-only; a separate backoffice client can use the permission-protected API.

## Features

- Better Auth email/password with verification and password reset email.
- Optional Google OAuth and LINE Login through Better Auth. LINE requires the channel email permission; accounts without an email are rejected.
- Better Auth plugin integrations live under `src/lib/plugin`, following the reference service layout.
- Backoffice user profile management, account suspension, soft deletion, session revocation, groups, permissions, and audit logs.
- Permission keys follow the core permission example, such as `core_user:list` and `core_group:assign_permissions`.
- Internal read/search routes require the `x-api-key` header and fail closed when `INTERNAL_API_KEY` is missing.
- Soft-deleted users cannot start sessions, existing sessions are revoked, and protected API requests reject them.

## Local setup

1. Copy `.env.example` to `.env` and set a random Better Auth secret and internal API key.
2. Start PostgreSQL with `docker compose up -d`.
3. Install dependencies with `npm install`.
4. Generate the Prisma client with `npm run prisma:generate`.
5. Apply the initial migration with `npm run db:deploy`.
6. Start the API with `npm run start:dev`.

The API listens on port 3001 by default. Health check: `GET /api/health`.

### API documentation

Set `ENABLE_API_DOCS=true` to enable the Scalar documentation pages. The local `.env.example` enables them by default:

- `http://localhost:3001/api/docs` — NestJS service endpoints.
- `http://localhost:3001/api/docs/json` — NestJS OpenAPI JSON for client generation.
- `http://localhost:3001/api/auth/docs` — Better Auth endpoints.
- `http://localhost:3001/api/auth/docs/json` — Better Auth OpenAPI schema as JSON.

Leave `API_DOCS_BASE_PATH` empty for a root deployment. If a reverse proxy publishes the service under a path such as `/user-service`, set `API_DOCS_BASE_PATH=/user-service` so Scalar's “Try it out” targets the correct public URLs. Keep `ENABLE_API_DOCS` disabled in production unless the documentation pages are intended to be public.

For frontend client generation, run `npm run build`, start the built service with `ENABLE_API_DOCS=true npm run start:prod`, and fetch `curl http://localhost:3001/api/docs/json -o user-service.openapi.json`. Use this JSON as the input to your OpenAPI TypeScript generator. The NestJS schema covers service routes; Better Auth has its own schema at `/api/auth/docs/json`.

Run `npm run test:contract` to build and check the generated contract against HTTP responses with mocked database and session dependencies. A live PostgreSQL integration is not covered. Group update `name` and `active` should be omitted when unchanged: the current validator accepts `null`, but the database rejects it.

In development without SMTP, verification and reset links are written to the local server console. Configure SMTP before production use. Google and LINE login are enabled only when their client ID and secret are configured. Set the OAuth callback URLs in their provider consoles to `/api/auth/callback/google` and `/api/auth/oauth2/callback/line` on the configured Better Auth URL. For LINE, enable email address permission in the LINE Login channel.

## First backoffice administrator

1. Sign up through Better Auth at `POST /api/auth/sign-up/email` and verify the account.
2. Set `BOOTSTRAP_ADMIN_EMAIL` to that verified email in `.env`.
3. Run `npm run db:seed`.

The seed creates the permission catalog, a default customer group, a read-only backoffice staff group, and a root administrator group. It grants the root group all catalog permissions. The seed only assigns root access to an existing verified account. Do not set this environment variable to an untrusted address.

New public signups are assigned to the customer group after the seed has run. Backoffice accounts can be assigned to groups using the group membership endpoints.

## Auth endpoints

Better Auth is mounted below `/api/auth`, including email signup/sign-in, email verification, password reset, sign-out, and social sign-in. Social sign-in uses `POST /api/auth/sign-in/social` with provider `google` or `line`. Sessions use secure HTTP-only cookies in production; configure `TRUSTED_ORIGINS` for the front-end origins.

The authenticated user profile is available at `GET /api/me` and can be updated at `PATCH /api/me`.

## Backoffice API

Every route below requires a valid Better Auth session plus the listed permission. Permission checks use the union of permissions from all active groups.

| Method | Route | Permission |
| --- | --- | --- |
| GET, POST | `/api/backoffice/users` | `core_user:list`, `core_user:create` |
| GET, PATCH, DELETE | `/api/backoffice/users/:id` | `core_user:get`, `core_user:update`, `core_user:delete` |
| PATCH | `/api/backoffice/users/:id/role` | `core_user:set-role` |
| POST, DELETE | `/api/backoffice/users/:id/ban` | `core_user:ban` |
| GET, DELETE | `/api/backoffice/users/:id/sessions` | `core_session:list`, `core_session:revoke` |
| GET, POST | `/api/backoffice/groups` | `core_group:list`, `core_group:create` |
| GET, PATCH, DELETE | `/api/backoffice/groups/:id` | `core_group:view`, `core_group:edit`, `core_group:delete` |
| GET | `/api/backoffice/groups/:id/users` | `core_group:view` |
| PUT | `/api/backoffice/groups/:id/permissions` | `core_group:assign_permissions` |
| PUT, DELETE | `/api/backoffice/groups/:id/users/:userId` | `core_group:assign_users`, `core_group:remove_user` |
| GET | `/api/backoffice/permissions` | `core_permission:list` |
| GET | `/api/backoffice/audit-logs` | `core_audit_log:list` |

`GET /api/backoffice/users` accepts optional `q`, `page`, `limit`, and `scope` query parameters. `scope=customer` lists customer accounts; `scope=backoffice` lists all other roles, including bootstrap roles.

`GET /api/backoffice/groups/:id/users` returns paginated member profiles as `{ items, page, limit, total }`. `page` defaults to 1, `limit` defaults to 20 (maximum 100), and soft-deleted users are excluded.

`GET /api/backoffice/permissions` returns each permission's internal `key`, display `label`, and `appName`.

The catalog separates `core_*` permissions from `customer_profile:get` and `customer_profile:update`. Filter the catalog with `?appName=core` or `?appName=customer`. The protected system group `customer-profile-access` grants authenticated users their own profile permissions. Existing users are enrolled by the migration; new users are enrolled at signup. Apply migrations before starting the updated application.

User creation requires a password of at least 12 characters. Better Auth's generic admin plugin is not exposed; account changes go through the permission-checked backoffice API. The public role endpoint cannot grant `root`, and root group membership is reserved for the bootstrap seed.

Changing a user's email resets its verified status and sends a verification email. The update response includes `emailVerificationSent`; if delivery fails, resend through Better Auth at `POST /api/auth/send-verification-email` with the updated address. Password resets revoke the user's existing sessions.

## Internal API

Internal routes are read-only and require `x-api-key: <INTERNAL_API_KEY>` on every request:

- `GET /api/internal/users?q=...`
- `GET /api/internal/users?email=...`
- `GET /api/internal/users?phoneNumber=...`
- `GET /api/internal/users/by-email/:email`
- `GET /api/internal/users/:id`

Search results are capped at 100 records and exclude soft-deleted users. Never commit `.env` or send the API key in URLs or logs.
