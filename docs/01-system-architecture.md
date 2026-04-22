# System Architecture

## Summary

`forward` is a single-user web application with a split frontend and backend:

- `apps/web` serves the UI
- `apps/api` owns auth, storage, prompt assembly, provider access, and streaming

SQLite is the source of truth. The browser is not the source of truth.

## High-Level Shape

```text
Browser UI
  -> Hono API
    -> Auth/session layer
    -> App services
    -> Prompt pipeline
    -> Provider adapters
    -> SQLite database
    -> Media storage on disk
```

## Core Architectural Rules

1. Provider secrets never reach the frontend.
2. Provider-specific response formats are normalized in the backend.
3. Prompt assembly happens in the backend.
4. The frontend only consumes stable application DTOs and stream events.
5. SQLite is canonical for persistent user data.
6. Media binaries live on disk, not in SQLite blobs.

## Frontend Responsibilities

- Render authenticated application shell
- Display chats, characters, presets, providers, and settings
- Manage local UI state and optimistic interaction state
- Consume normalized SSE stream events
- Render markdown output
- Show a collapsible reasoning panel per assistant message
- Expose full prompt inspection UI

The frontend should not:

- Hold provider secrets
- Build provider-specific requests
- Persist canonical data outside the backend
- Parse raw provider stream formats

## Backend Responsibilities

- Authenticate the user with an env password
- Issue and validate session cookies
- Perform CRUD for chats, messages, characters, presets, and provider configs
- Assemble prompts from internal models
- Call model providers
- Normalize streaming and non-streaming responses
- Persist responses and message state transitions
- Handle imports and exports
- Serve media files safely

## Streaming Architecture

The backend receives provider stream data and emits normalized SSE events to the frontend.

Internal event types:

- `response.started`
- `reasoning.delta`
- `content.delta`
- `response.completed`
- `response.error`

The frontend must not depend on raw provider event names such as `reasoning_content`.

## Reasoning Support

Reasoning is a first-class output channel in V1.

Behavior:

- Reasoning is streamed separately from visible answer text
- Reasoning is hidden by default in the UI behind a disclosure
- Reasoning is stored in SQLite with the message
- Reasoning is not included in exports by default

## Persistence Model

Canonical persistence:

- Chats
- Messages
- Characters
- Presets
- Provider configurations
- App settings
- Sessions
- Import history

On-disk persistence:

- Avatar images
- Imported media assets

## Deployment Model

Primary deployment target:

- Self-hosted on LAN or VPN
- Docker-ready
- SQLite file on a mounted persistent volume

This is not being designed as a public SaaS app.

## External Provider Assumptions

The backend must be able to reach providers directly.

This matters for local-model support. If a provider is only reachable from a laptop, but the backend runs elsewhere, that provider will not work unless network access is solved outside the app.

Known test endpoint:

- `http://192.168.178.68:8082/`
- Exposes OpenAI-style APIs through `llama-swap`
- Can stream reasoning separately from content

## Key Extension Points

The architecture should stay open to future expansion in these areas:

- Additional provider adapters
- More import formats
- Optional offline cache later
- Optional richer auth later

These should be additive, not coupled into V1 core flows.
