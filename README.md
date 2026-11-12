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

## Continuous integration

GitHub Actions runs **Checkout**, **Build**, **Linter**, **Unit test**, and **Notify Discord** jobs on every push and pull request. Build validates the Prisma schema and compiles the application; Linter runs ESLint; Unit test runs all tests, including HTTP contract tests, using the build output. If a job fails, later checks are skipped and Notify Discord reports the results. View each job in the repository's **Actions** tab or in the commit or pull request checks. Open the run for logs. The tests use mocked external dependencies and do not verify a live PostgreSQL connection or deployment. Git push completes before CI finishes.

To receive CI results in Discord, create a webhook for the desired Discord channel, then add its URL as a repository secret named `DISCORD_WEBHOOK_URL` under GitHub **Settings → Secrets and variables → Actions**. After CI succeeds or fails, Discord receives the overall status. View details and logs in GitHub Actions. Notifications are skipped when the secret is unavailable (including pull requests from forks); cancelled runs are not reported. Keep the webhook URL secret.

In development without SMTP, verification and reset links are written to the local server console. Configure SMTP before production use. Google and LINE login are enabled only when their client ID and secret are configured. Set the OAuth callback URLs in their provider consoles to `/api/auth/callback/google` and `/api/auth/oauth2/callback/line` on the configured Better Auth URL. For LINE, enable email address permission in the LINE Login channel.

## Backoffice permissions

Run `npm run db:seed` to create the permission catalog, a read-only backoffice staff group, and a root administrator group. The seed grants the root group all catalog permissions but does not assign any user to it. Root account provisioning is managed separately.

Public signups have the customer role and do not receive permissions or group memberships. Assign the staff role before adding a backoffice account to a group. Changing a user to customer removes their group memberships.

## Auth endpoints

Better Auth is mounted below `/api/auth`, including email signup/sign-in, email verification, password reset, sign-out, and social sign-in. Social sign-in uses `POST /api/auth/sign-in/social` with provider `google` or `line`. Sessions use secure HTTP-only cookies in production; configure `TRUSTED_ORIGINS` for the front-end origins.

`GET /api/auth/get-session` includes a `user.permissions` array for an authenticated session, alongside `session`. Permissions and role are read from the database on each request; customers and unavailable accounts receive an empty array. The response is marked `Cache-Control: no-store`. Unauthenticated sessions still return `null`.

The authenticated user profile is available at `GET /api/me` and can be updated at `PATCH /api/me`. `GET /api/me/permissions` returns `{ "permissions": ["core_user:list"] }` for the current session: the deduplicated keys from active, undeleted groups. Customers receive an empty array. Refresh this endpoint when access may have changed; the server still checks permissions on every protected request.

Upload an avatar with `POST /api/me/avatar` using the session cookie and `multipart/form-data` field `file`. JPEG, PNG, and WebP files up to 5 MiB are accepted. The response is the updated user; its `image` contains the public URL. Configure `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PRIVATE_BUCKET`, `S3_PUBLIC_BUCKET`, and `S3_PUBLIC_BASE_URL` in `.env`. The defaults match the local Garage setup: `user-service` is private and `user-service-public` stores avatars. Grant the key appropriate bucket access, enable website access on the public bucket, and set the public base URL to a reachable Garage website or reverse proxy URL. Never expose the private bucket publicly. Existing avatar objects are retained when replacing an image; configure a suitable storage lifecycle or cleanup process if needed. If saving the profile fails after upload, the service attempts to delete the newly uploaded object.

## Backoffice API

Every route below requires a valid Better Auth session plus the listed permission. Controllers declare required keys with `@RequirePermission("core_user:list")`. For multiple keys, `@RequirePermission(["core_user:list", "core_user:get"])` requires any one by default; pass `"all"` as the second argument to require every key. Permission checks use the union of permissions from all active groups. Define new keys and labels in `src/lib/permissions/app/core-permission.ts`; the catalog and key type are derived from this metadata.

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

`GET /api/backoffice/users` accepts optional `q`, `page`, `limit`, and `scope` query parameters. `scope=customer` lists customer accounts; `scope=backoffice` lists all other roles, including root.

`GET /api/backoffice/groups/:id/users` returns paginated member profiles as `{ items, page, limit, total }`. `page` defaults to 1, `limit` defaults to 20 (maximum 100), and soft-deleted users are excluded.

`GET /api/backoffice/permissions` returns each permission's internal `key`, display `label`, and `appName`.

The catalog contains `core_*` backoffice permissions and can be filtered with `?appName=core`. Customers can access their own profile using a valid session without permissions. The initial migration targets a fresh database; the seed creates no customer group or permissions.

User creation requires a password of at least 12 characters. Better Auth's generic admin plugin is not exposed; account changes go through the permission-checked backoffice API. The public role endpoint cannot grant `root`, and root group membership is managed separately.

Changing a user's email resets its verified status and sends a verification email. The update response includes `emailVerificationSent`; if delivery fails, resend through Better Auth at `POST /api/auth/send-verification-email` with the updated address. Password resets revoke the user's existing sessions.

## Internal API

Internal routes are read-only and require `x-api-key: <INTERNAL_API_KEY>` on every request:

- `GET /api/internal/users?q=...`
- `GET /api/internal/users?email=...`
- `GET /api/internal/users?phoneNumber=...`
- `GET /api/internal/users/by-email/:email`
- `GET /api/internal/users/:id`

Search results are capped at 100 records and exclude soft-deleted users. Never commit `.env` or send the API key in URLs or logs.
