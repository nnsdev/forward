# Forward

`forward` is a slim, modern, responsive, single-user chat app inspired by SillyTavern.

This repository is intentionally structured as a `pnpm` workspace so separate agents or contributors can work in parallel with minimal overlap.

## Workspace

```text
apps/
  api/              Hono backend
  web/              Vue frontend
packages/
  db/               SQLite schema and repositories
  provider-core/    Provider adapters and stream normalization
  shared/           Shared types, DTOs, schemas, event contracts
docs/               Product, architecture, and roadmap docs
```

## Concurrency Strategy

The main parallel workstreams are:

- `apps/web`: chat UI, auth UI, prompt inspector, responsive behavior
- `apps/api`: auth routes, CRUD, SSE generation routes, service composition
- `packages/db`: Drizzle schema, migrations, repositories, test DB helpers
- `packages/provider-core`: provider contract, OpenAI-compatible adapter, stream normalization
- `packages/shared`: shared API DTOs, `zod` schemas, stream event types

See `docs/11-parallel-workstreams.md` for the work split and coordination rules.

## Current Foundation

The workspace is now scaffolded with:

- `apps/web`: Vite + Vue + Tailwind app shell with a reasoning-aware message component
- `apps/api`: Hono app with password auth, session cookie flow, health route, character APIs, preset APIs, prompt preview, and streaming generation
- `packages/shared`: shared contracts for auth, chats, prompt previews, and stream events
- `packages/provider-core`: OpenAI-compatible stream normalization utilities with reasoning support
- `packages/db`: Drizzle schema and `node:sqlite` client wiring

## Commands

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:api`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:live`
- `pnpm build`

## Notes

- The DB package currently uses Drizzle's beta line because that is where `node:sqlite` support lives.
- `node:sqlite` currently emits an experimental warning on Node 22, which is expected.
- `pnpm test:live` is opt-in and hits the configured live OpenAI-compatible endpoint.
- Plain chats automatically receive a default assistant system prompt.
- Character-backed chats build a roleplay-specific system prompt from the selected character.
- Chats can also select a preset that controls generation defaults like temperature and max output tokens.
