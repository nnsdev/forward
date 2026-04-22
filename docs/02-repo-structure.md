# Repo Structure

## Workspace Layout

```text
forward/
  apps/
    api/
    web/
  packages/
    db/
    provider-core/
    shared/
  docs/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

## Package Responsibilities

### `apps/web`

Owns:

- Vue application shell
- Routing
- Login screen
- Chat workspace
- Character management UI
- Preset management UI
- Provider config UI
- Settings UI
- Prompt inspector UI
- Responsive layout behavior

Suggested internal structure:

```text
apps/web/src/
  app/
  components/
  features/
    auth/
    chat/
    characters/
    presets/
    providers/
    settings/
  lib/
  router/
  stores/
```

### `apps/api`

Owns:

- Hono app bootstrap
- Auth routes and middleware
- CRUD routes
- SSE generation routes
- Import/export routes
- Media upload and serving
- Service composition

Suggested internal structure:

```text
apps/api/src/
  app/
  config/
  lib/
  middleware/
  routes/
  services/
    auth/
    chat/
    characters/
    presets/
    providers/
    prompting/
    generation/
    imports/
```

### `packages/shared`

Owns:

- Shared DTOs
- Shared `zod` schemas
- Shared event shapes
- Common type utilities
- Public API contract types used by both apps

### `packages/db`

Owns:

- Drizzle schema
- Database connection setup
- Migrations
- Repository helpers
- Test database setup utilities

### `packages/provider-core`

Owns:

- Provider adapter interfaces
- OpenAI-compatible adapter
- Stream normalization
- Capability detection
- Provider-specific parsing helpers

## Shared Type Boundary

Import direction should be simple:

- `apps/web` can import from `packages/shared`
- `apps/api` can import from `packages/shared`, `packages/db`, and `packages/provider-core`
- `packages/provider-core` can import from `packages/shared`
- `packages/db` can import from `packages/shared` when schema-aligned types are useful

Avoid cross-imports from `apps/web` into `apps/api` or vice versa.

## Configuration Files

Recommended root files:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.editorconfig`
- `.gitignore`
- `.env.example`
- `docker-compose.yml`
- `eslint.config.js` or equivalent
- `prettier.config.*`

## Testing Layout

Suggested locations:

- Unit tests close to source where practical
- Integration tests in `apps/api/test`
- Frontend component tests in `apps/web/src/**/*.test.ts`
- E2E tests in root `e2e/`

## Design Goal

This structure should feel small, not enterprise-heavy. The workspace exists to keep boundaries clean, not to create ceremony.

## Parallel Ownership

This repo layout is intentionally suitable for concurrent work.

Suggested ownership split:

- `apps/web`: frontend-focused work only
- `apps/api`: route and service composition only
- `packages/db`: schema, migrations, and repositories only
- `packages/provider-core`: provider contracts and adapters only
- `packages/shared`: shared schemas, DTOs, and event contracts only

Changes that cross more than one of these areas should be driven by a small contract-first change in `packages/shared` before larger implementation work begins.
