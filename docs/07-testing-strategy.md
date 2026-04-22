# Testing Strategy

## Summary

Testing is a core project requirement, not optional polish.

The goal is to keep the app safe to refactor while it grows from a narrow V1 into a larger system later.

## Test Layers

### Unit Tests

Use unit tests for pure or nearly pure logic:

- auth utilities
- session helpers
- prompt assembly
- token truncation logic
- provider stream normalization
- import parsers
- markdown/rendering helpers where needed

### Backend Integration Tests

Use integration tests for Hono routes and service composition:

- login/logout/session flow
- CRUD routes for chats, characters, presets, providers
- prompt preview route
- generation route behavior with mocked adapters
- cancellation and retry flows

### Frontend Component Tests

Use component tests for:

- login form behavior
- chat composer behavior
- message rendering
- reasoning disclosure rendering
- prompt inspector panels
- character editor and import UI
- provider config forms

### End-To-End Tests

Use Playwright for real user flows:

- login
- create provider config
- create character
- start chat
- send message
- stream response
- reveal reasoning
- edit and regenerate
- mobile viewport smoke coverage

## Live Provider Tests

Include opt-in tests for the available test endpoint:

- `http://192.168.178.68:8082/`

Live tests should verify:

- model listing works
- small chat completion works
- streaming works
- reasoning deltas are normalized correctly

These tests should only run when enabled by env so local CI is not coupled to network availability.

## Test Database Strategy

- Use isolated SQLite databases per test suite or per test worker where practical
- Avoid sharing mutable database state between tests
- Run migrations in test setup

## Required Coverage Areas

Minimum required confidence areas:

- auth protection
- persistence correctness
- stream event normalization
- reasoning persistence
- prompt truncation correctness
- import parsing correctness
- mobile layout smoke coverage

## Suggested Commands

Target command set:

- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm test:live`

## Design Principle

Prefer small fast unit and integration coverage for core logic, with a smaller number of meaningful E2E flows on top.
