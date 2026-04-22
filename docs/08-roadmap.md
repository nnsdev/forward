# Roadmap

## Summary

The roadmap is organized around vertical slices that produce usable software early.

The first priority is not broad feature coverage. It is a solid end-to-end chat slice with persistence, streaming, and reasoning.

## Phase 0: Foundation

Deliverables:

- `pnpm` workspace setup
- shared TypeScript config
- lint and formatting setup
- test runner setup
- Docker development setup
- base env handling

Exit criteria:

- Workspace installs and runs cleanly
- Frontend and backend boot independently
- Basic tests can run in CI or local dev

Parallel tracks that can start near the end of this phase:

- shared DTO and event contract work
- DB schema drafting
- provider adapter interface drafting
- app shell and route shell work in web

## Phase 1: Persistence And Auth Backbone

Deliverables:

- SQLite connection and migrations
- Drizzle schema for core tables
- session storage
- password login route
- auth middleware
- protected app shell in frontend

Exit criteria:

- User can log in
- Protected routes reject anonymous access
- Sessions persist across refreshes

## Phase 2: First Chat Vertical Slice

Deliverables:

- chat list and conversation view
- composer
- messages CRUD
- SQLite-backed chat persistence
- mock or stub streaming path
- responsive base layout

Exit criteria:

- User can create a chat and save messages
- App is usable on desktop and mobile

## Phase 3: Real Provider Integration

Deliverables:

- provider adapter contract
- OpenAI-compatible adapter
- provider config CRUD
- model list route
- SSE generation route
- cancel, retry, continue handling
- reasoning-aware stream normalization

Exit criteria:

- User can connect to the test endpoint
- User can stream content and reasoning into a chat
- Message state transitions are stored correctly

Parallelization note:

- `packages/provider-core` can progress independently from `apps/web` once the normalized stream contract is fixed
- `apps/web` can implement stream rendering against mocked SSE fixtures before the real adapter lands


## Phase 4: Characters

Deliverables:

- character list and editor
- avatar upload and storage
- PNG card import
- JSON import
- per-chat character assignment

Exit criteria:

- User can import a character card and start chatting immediately

## Phase 5: Presets And Prompt Inspection

Deliverables:

- preset CRUD
- per-chat preset selection
- prompt builder package
- token estimation and truncation
- prompt preview route
- prompt inspector UI

Exit criteria:

- User can inspect assembled prompts and understand truncation behavior

## Phase 6: Polish And Hardening

Deliverables:

- empty and error states
- mobile keyboard behavior fixes
- scroll anchoring during streaming
- markdown rendering polish
- export flow
- Docker packaging hardening
- live provider tests

Exit criteria:

- App is stable for daily personal use
- The known live provider path is covered by opt-in tests

## V1 Release Criteria

V1 is ready when the app supports:

- password login
- central persistence
- character imports
- chat persistence
- provider configs
- presets
- streaming content
- streaming reasoning
- prompt inspection
- responsive phone usage

## Deferred After V1

- lorebooks
- group chat
- plugin systems
- multi-user support
- advanced theme tooling
- broader provider coverage beyond justified adapters
