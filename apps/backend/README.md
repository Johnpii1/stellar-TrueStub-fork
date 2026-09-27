# TrueStub — Backend (scaffold)

This is the `@truestub/backend` workspace. **It's a scaffold, not a running
part of the product yet** — a health check and a project skeleton, nothing
more. The frontend (`apps/frontend`) does not call this service today; it
talks directly to Firebase and to a remote Hasura GraphQL endpoint (see the
[frontend README](../frontend/README.md#architecture)).

## Why this exists

`apps/frontend` has a handful of Next.js API routes that need a real
server-side home eventually, because they touch secrets that must never
ship to the browser. Today most of them are thin proxies to external URLs;
this workspace is where their actual implementation lands.

## Current scope

- `GET /health` → `{ "status": "ok", "service": "truestub-backend" }`
- `POST /api/auth/sync-user` → verifies the Firebase ID token in the
  `Authorization: Bearer <token>` header via the Firebase Admin SDK, then
  upserts a row into Hasura's `users` table (keyed on `email`) using the
  Hasura admin secret. `apps/frontend`'s `src/app/api/auth/sync-user/route.ts`
  proxies to this route.
  - The upsert's `on_conflict` constraint name (`users_email_key`) is a
    guess — this repo has no Hasura metadata or SQL migrations to confirm
    real constraint names against. `email`, `first_name`, and `last_name`
    are the only `users` columns proven to exist anywhere in the codebase
    (see `apps/frontend/src/graphql/mutations/test-user.ts`). If Hasura
    rejects the constraint at runtime, the route returns a 502 rather than
    silently failing — fix the constraint name in
    `src/routes/sync-user.ts` once someone with real schema access confirms
    it.
- `POST /webhooks/escrow-status` → the **single authoritative write path**
  for escrow status (`escrow_transactions.status`). Requires a valid
  HMAC-SHA256 signature of the raw body keyed with
  `TRUSTLESS_WORK_WEBHOOK_SECRET` (`x-trustless-work-signature`,
  `x-webhook-signature` or `x-signature`), maps the Trustless Work status via
  `STATUS_MAP` (unknown statuses → 400), updates the row by `contractId`
  through `HasuraService.updateEscrowStatus`, then sends notifications via
  `NotificationService`. A failed write answers 500 so Trustless Work retries.
  `apps/frontend`'s `src/app/webhooks/escrow-status/route.ts` is a pass-through
  that forwards the signed payload here unchanged.
- Express + TypeScript, `tsx` for the dev watcher, plain `tsc` build.
- Tests are Jest, named `*.test.ts` next to the code they cover
  (`yarn workspace @truestub/backend test`).
- `src/config/env.ts` — the one place environment variables get read.

## Running it

```bash
cp .env.example .env       # fill in the Firebase + Hasura values below
yarn install                # from the repo root
yarn workspace @truestub/backend dev
curl http://localhost:4000/health
```

`sync-user` requires all of `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`, `HASURA_GRAPHQL_URL`, and
`HASURA_GRAPHQL_ADMIN_SECRET` to be set — the server now fails to start
without them (see `src/config/env.ts`). Get the Firebase values from
Firebase console → Project settings → Service accounts → Generate new
private key. The Hasura admin secret must **only** ever live here, never in
`apps/frontend` — see the security note in
[`apps/frontend/README.md`](../frontend/README.md#-3-hasura-graphql).

## Database migrations

SQL migrations live in `src/db/migrations/` and are applied with
[node-pg-migrate](https://salsita.github.io/node-pg-migrate/), which records
what has run in a `pgmigrations` table in the target database. It connects
using `DATABASE_URL` (read from the environment or `apps/backend/.env`).

```bash
docker-compose up -d postgres                   # from the repo root, or point at any Postgres
export DATABASE_URL=postgres://postgres:postgrespassword@localhost:5432/safetrust
yarn workspace @truestub/backend migrate:up     # apply all pending migrations
```

| Command                 | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `migrate:up`            | Apply every pending migration, in filename order          |
| `migrate:down`          | Roll back the most recently applied migration             |
| `migrate:create <name>` | Scaffold a new `src/db/migrations/<timestamp>_<name>.sql` |
| `migrate up --dry-run`  | Print the SQL without running it                          |

Each `.sql` file holds a `-- Up Migration` section and an optional
`-- Down Migration` section. Filenames must sort in the order they should
run (`--check-order` rejects out-of-order files), so continue the existing
numeric prefix (e.g. `002_rename_hotels_to_events.sql`) or use
`migrate:create`. `001_create_ratings_reviews.sql` uses `IF NOT EXISTS`, so
it's safe to run against a database where it was already applied by hand.
The Docker image ships the migrations directory too, so a deployed container
can run `yarn workspace @truestub/backend migrate:up` with `DATABASE_URL` set.

## Refunds

`POST /api/refunds/claim` executes a refund on-chain: it resolves the
escrow's dispute through Trustless Work, paying 100% of `amount` to
`refundTo`. The backend signs as the platform's dispute resolver and submits
the transaction to Stellar. The response returns `claim.status: "submitted"`
and the Stellar `claim.txHash`. `refundId` is an idempotency key: a second
call returns 409, unless the first on-chain attempt failed, in which case the
call retries it.

Requires `TRUSTLESS_WORK_API_KEY` and `TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET`
(see `.env.example`); without them the route returns 503. The escrow must
already be in dispute, the resolver key must match the escrow's
`disputeResolver` role, and `amount` must equal the disputed balance.
Trustless Work and the contract reject the transaction otherwise, and the
route returns 502 with the reason.

## Observability

- **Error tracking**: `src/lib/sentry.ts` initializes Sentry when the
  `SENTRY_DSN` env var is set (see `.env.example`); it's a no-op otherwise,
  so local dev and CI don't need a Sentry project. Once set, unhandled
  exceptions in any route are reported to Sentry in addition to the
  structured logs from `src/lib/logger.ts`.
- **Uptime monitoring**: `.github/workflows/backend-uptime.yml` pings
  `/health` on a schedule and fails the run (triggering GitHub's workflow
  failure notification) if it doesn't respond `200` with
  `{ "status": "ok" }`. It's skipped until this service is deployed
  somewhere and a `BACKEND_HEALTH_URL` repository variable
  (Settings → Secrets and variables → Actions → Variables) is set to that
  deployment's `/health` URL.

### Escrow-status webhook delivery failures

Trustless Work retries a delivery when this service returns a 5xx response.
The current integration does **not** receive a documented terminal
"retries exhausted" callback, API event, or dashboard event that it can
consume. Therefore the safety mechanism is deliberately proactive rather
than waiting for exhaustion:

1. Every retryable `POST /webhooks/escrow-status` failure (missing webhook
   configuration or failed Hasura status write) is captured in Sentry with
   `alert=webhook.delivery_failure`, `webhook=escrow-status`, and
   `retryable=true`. The raw webhook payload is intentionally not reported,
   because it can contain recipient PII.
2. In production, create a Sentry **Issue Alert** for events whose
   `alert` tag equals `webhook.delivery_failure`; send it to the on-call
   paging channel. Configure no rate-limit that could hide distinct escrow
   failures. This is a required production setup whenever `SENTRY_DSN` is
   configured.
3. The responder should repair the Hasura/configuration failure, verify a
   subsequent delivery succeeds, and reconcile the affected `contractId`
   against Trustless Work before resolving the alert. If Trustless Work later
   adds a durable terminal-delivery event, wire that event to the same alert
   and record its delivery id here.

This produces a human notification on the **first** retryable failure, well
before retry exhaustion can silently leave an escrow stale. A reconciliation
job remains the backstop for failures missed during an outage; it is not the
primary signal.

### Pending dispute/refund PII access-control audit

The dispute and refund read routes currently do not enforce an authenticated
principal, so they must not be treated as an authorized PII API. The audit
for this area is intentionally gated on the auth-enforcement work tracked by
issue #279. That change must include, in the same pull request:

1. Authentication on `GET /api/disputes/:disputeId`,
   `GET /api/disputes/escrow/:escrowId`, and
   `GET /api/refunds/claim/:refundId`.
2. An authorization lookup that derives the caller identity from the verified
   token (never a `userId` supplied by the client) and permits only the escrow
   buyer, seller, or an explicitly authorized resolver/admin.
3. Route tests that create records for two users and prove each cross-user
   read receives `403` (or `404` where non-disclosure is preferred), including
   guessed dispute, escrow, and refund IDs. Tests must also prove the owner
   can still read their own record.

Until #279 lands, do not add frontend PII readers for these endpoints. This
checklist is the acceptance gate for exposing dispute reasoning, evidence
references, refund destinations, or equivalent sensitive fields.

### API type-contract policy

The frontend currently has no client for the backend dispute, refund, or
ownership-transfer routes, and its saved-search/watchlist client uses inline
request shapes. There is consequently no duplicated frontend TypeScript API
type that can be truthfully contract-tested today. Do not create another
hand-written copy when adding one.

For every new frontend-to-backend route, define the Zod request/response
schema in a shared API-contract module and derive its exported TypeScript type
with `z.infer<typeof schema>`. Both the Express route and frontend client must
import that same schema/type. Add a compile-time contract test that assigns
the frontend request and response types to the inferred shared types in both
directions; an incompatible schema/type change then fails `typecheck` before
runtime. The test should cover listings, disputes, refunds, and transfers as
each client is introduced. This policy replaces passive reliance on comments
or parallel interfaces and prevents the prior duplicated-type drift pattern.

## Roadmap: routes to migrate here

These currently live in `apps/frontend` as proxies to external URLs. Moving
their logic here (rather than a separate service) is the natural next step
— each row is what the frontend already expects to exist "on the other
end" of the URL it's calling:

| Frontend route (proxy today)                     | Points at                 | What lands here eventually          |
| ------------------------------------------------ | ------------------------- | ----------------------------------- |
| `src/app/api/auth/validate-reset-token/route.ts` | `BACKEND_URL`             | Validate a password-reset token     |
| `src/app/api/auth/sync-user/route.ts`            | `BACKEND_URL`             | ✅ Done — see "Current scope" above |
| `src/app/api/auth/reset-password/route.ts`       | `BACKEND_URL`             | Complete a password reset           |
| `src/app/api/auth/forgot-password/route.ts`      | `NEXT_PUBLIC_WEBHOOK_URL` | Kick off the forgot-password flow   |
| `src/app/webhooks/escrow-status/route.ts`        | `BACKEND_URL`             | ✅ Done — see "Current scope" above |

The rest of that logic hasn't moved here yet. When it does, update the
frontend's `BACKEND_URL` / `NEXT_PUBLIC_WEBHOOK_URL` env vars to point at
this service, and delete the corresponding proxy route (or leave it as a
thin pass-through, whichever the routing story ends up needing).

## Not in scope here

Stellar/Soroban contract logic — that's `contracts/` at the repo root, also
a placeholder today. This service is meant to call out to Trustless Work's
hosted escrow API/contracts, not implement contract logic itself.
