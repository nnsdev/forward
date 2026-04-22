# Provider Adapters

## Summary

Provider adapters isolate model-provider quirks from the rest of the app.

The frontend should never know how a specific provider formats its responses or expects its request body.

## V1 Adapter Strategy

Start with one adapter family:

- `openai-compatible`

This should cover:

- OpenAI-style hosted APIs
- `llama.cpp` or `llama-swap` endpoints exposing `/v1/*`
- Similar self-hosted compatible providers

Add separate adapters later only when needed for materially different protocols.

## Required Adapter Interface

Each adapter must implement:

- `validateConfig()`
- `listModels()`
- `generate()`
- `streamGenerate()`
- `supports()`
- `normalizeError()`

## Normalized Output

The adapter layer should normalize into a provider-agnostic stream of chunks:

- `reasoning`
- `content`
- `done`
- `error`

The generation service then maps those into public SSE events.

## Reasoning Support

V1 must explicitly support providers that emit separate reasoning fields.

Known example:

- `delta.reasoning_content`

Rules:

- Do not discard reasoning data at the adapter level
- Do not merge reasoning into visible content
- Emit reasoning in order as its own stream channel

## Capability Flags

The adapter should report capabilities such as:

- `streaming`
- `reasoning`
- `model_listing`
- `cancel`

This lets the backend and UI degrade gracefully.

## Configuration Resolution

Provider config is split between SQLite and env.

SQLite contains:

- provider type
- base URL
- selected model
- env variable name for API key, if any
- non-secret options

Env contains:

- the actual secret values

The adapter must resolve the secret from env at runtime.

## Known Test Target

Available endpoint:

- `http://192.168.178.68:8082/`

Observed behavior:

- `/v1/models` returns model list
- `/v1/chat/completions` works
- streaming emits `reasoning_content` chunks separately from answer content

This endpoint should be included in integration testing behind an opt-in test flag.

## Error Normalization

Provider errors should be normalized into a stable internal shape with fields like:

- `code`
- `message`
- `retryable`
- `providerType`
- `status`

Do not leak raw provider response bodies directly into the UI.

## Future Adapters

Potential later additions:

- Ollama-specific adapter if its APIs need direct support
- Non-OpenAI local backends
- Provider-specific advanced options where justified

These should plug into the same internal interfaces.
