# Parallel Workstreams

## Summary

The repository is intentionally split so multiple agents can work concurrently without constant merge conflicts.

The key idea is to freeze small contracts early, then let each area move independently.

## Stable Boundaries

The main boundaries are:

- `packages/shared`: shared contracts only
- `packages/db`: SQLite schema and persistence helpers only
- `packages/provider-core`: provider protocols and stream normalization only
- `apps/api`: Hono routes and service orchestration only
- `apps/web`: Vue UI only

## Recommended Agent Split

### Agent 1: Shared Contracts

Owns:

- DTO shapes
- stream event types
- route payload schemas
- message and character core types

Output should stabilize before broader feature work starts.

### Agent 2: Database Layer

Owns:

- Drizzle schema
- migrations
- repository functions
- test database setup

This should depend only on `packages/shared` contracts where useful.

### Agent 3: Provider Core

Owns:

- provider adapter interface
- OpenAI-compatible adapter
- stream normalization
- live integration probes and tests

This can progress in parallel with the DB layer once the normalized stream contract is defined.

### Agent 4: API Layer

Owns:

- auth routes
- CRUD routes
- generation routes
- prompt preview routes
- middleware and service wiring

This layer integrates `packages/db`, `packages/provider-core`, and `packages/shared`.

### Agent 5: Web UI

Owns:

- login screen
- app shell
- chat workspace
- reasoning UI
- prompt inspector
- responsive behavior

This should build against stable DTOs and mocked SSE events early.

## Coordination Rules

1. Change contracts in `packages/shared` first.
2. Do not let `apps/web` depend on provider-specific response formats.
3. Do not let `apps/api` invent DTOs that are not represented in `packages/shared`.
4. Keep DB schema changes isolated to `packages/db` and reviewed carefully.
5. Use mock fixtures for streaming and prompt-preview payloads so frontend work is not blocked.

## Good Parallel Milestones

### Milestone A

- Shared stream event contract exists
- DB entity shapes exist
- API route shapes exist

At this point, frontend and provider work can split safely.

### Milestone B

- provider adapter can normalize reasoning and content chunks
- frontend can render mocked reasoning and content chunks

At this point, SSE integration becomes mostly wiring.

### Milestone C

- DB repositories exist for chats, messages, characters, presets, providers
- API routes can integrate persistence without reshaping storage models late

## Likely Merge Hotspots

These areas need extra coordination:

- shared stream event types
- message DTO shape
- provider config DTO shape
- prompt preview response shape
- auth/session contract

Keep those changes small and explicit.

## Practical Advice

If multiple agents are active at once, the safest order is:

1. freeze `packages/shared`
2. split into `db`, `provider-core`, `web`, and `api`
3. merge `db` and `provider-core` before wiring `api`
4. keep `web` using mocks until the API contract is stable

This keeps the repo moving without everyone editing the same files.
