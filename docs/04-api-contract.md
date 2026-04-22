# API Contract

## Summary

The backend exposes a small authenticated API for CRUD operations, generation, imports, and prompt inspection.

All non-auth routes require a valid session cookie.

## Auth

### `POST /auth/login`

Purpose:

- Validate password against `APP_PASSWORD`
- Issue session cookie

Request body:

```json
{
  "password": "string"
}
```

Response:

- `204 No Content` on success
- `401 Unauthorized` on failure

### `POST /auth/logout`

Purpose:

- Invalidate session

### `GET /auth/session`

Purpose:

- Check whether the current browser session is authenticated

Response body:

```json
{
  "authenticated": true
}
```

## Chats

### `GET /chats`
### `POST /chats`
### `GET /chats/:chatId`
### `PATCH /chats/:chatId`
### `DELETE /chats/:chatId`

### `GET /chats/:chatId/messages`
### `POST /chats/:chatId/messages`
### `PATCH /messages/:messageId`
### `DELETE /messages/:messageId`

## Generation

### `POST /chats/:chatId/generate`

Purpose:

- Create a new assistant turn from the current chat state
- Stream normalized events over SSE

Request body:

```json
{
  "mode": "reply",
  "messageId": "optional user message id",
  "overridePresetId": "optional",
  "overrideProviderConfigId": "optional"
}
```

Response:

- `text/event-stream`

Normalized events:

```json
{ "type": "response.started", "chatId": "...", "messageId": "..." }
```

```json
{ "type": "reasoning.delta", "chatId": "...", "messageId": "...", "text": "..." }
```

```json
{ "type": "content.delta", "chatId": "...", "messageId": "...", "text": "..." }
```

```json
{ "type": "response.completed", "chatId": "...", "messageId": "..." }
```

```json
{ "type": "response.error", "chatId": "...", "messageId": "...", "error": "..." }
```

### `POST /messages/:messageId/cancel`

Purpose:

- Cancel an in-flight generation

### `POST /messages/:messageId/retry`

Purpose:

- Retry generation from a given point

### `POST /messages/:messageId/continue`

Purpose:

- Continue an assistant response that was cut short or intentionally paused

## Characters

### `GET /characters`
### `POST /characters`
### `GET /characters/:characterId`
### `PATCH /characters/:characterId`
### `DELETE /characters/:characterId`

### `POST /characters/import`

Purpose:

- Import a PNG card or JSON character definition

Multipart payload:

- `file`

## Presets

### `GET /presets`
### `POST /presets`
### `GET /presets/:presetId`
### `PATCH /presets/:presetId`
### `DELETE /presets/:presetId`

## Providers

### `GET /providers`
### `POST /providers`
### `GET /providers/:providerId`
### `PATCH /providers/:providerId`
### `DELETE /providers/:providerId`

### `POST /providers/:providerId/validate`

Purpose:

- Validate reachability and config

### `GET /providers/:providerId/models`

Purpose:

- Fetch available models via the adapter

## Settings

### `GET /settings`
### `PATCH /settings`

## Prompt Inspection

### `GET /chats/:chatId/prompt-preview`

Purpose:

- Return fully assembled prompt inputs and truncation summary without triggering generation

Suggested response shape:

```json
{
  "chatId": "...",
  "provider": { "id": "...", "type": "openai-compatible", "model": "qwen" },
  "preset": { "id": "...", "name": "Balanced" },
  "tokenEstimate": 1234,
  "truncation": {
    "applied": true,
    "droppedMessageIds": ["..."]
  },
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```

## Exports

### `GET /exports/chats/:chatId`

Purpose:

- Export app-native chat data
- Exclude reasoning by default

## Health

### `GET /health`

Purpose:

- Basic health check for deployment and local development
