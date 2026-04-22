# Forward Docs

This folder defines the first implementation target for `forward`.

The project goal is a slim, modern, responsive, single-user chat app inspired by SillyTavern, without trying to clone SillyTavern's full surface area.

Read in this order:

1. `00-product-scope.md`
2. `01-system-architecture.md`
3. `02-repo-structure.md`
4. `03-database-schema.md`
5. `04-api-contract.md`
6. `05-provider-adapters.md`
7. `06-prompt-pipeline.md`
8. `07-testing-strategy.md`
9. `08-roadmap.md`
10. `09-responsive-ux.md`
11. `10-import-compatibility.md`
12. `11-parallel-workstreams.md`

Current decisions:

- `pnpm` workspace
- `Vue 3` + `TypeScript` + `Vite` + `Tailwind`
- `Hono` backend
- `SQLite` as canonical persistence
- Single-user only
- Password gate via env-backed auth
- Provider secrets in env only
- Streaming plus reasoning support in V1
- Character imports from PNG cards and JSON
- Media stored as files on disk, paths in SQLite
- Deployment target is primarily LAN/VPN
- Full prompt inspector in V1

The repo is also structured to support concurrent implementation across multiple agents or contributors.
