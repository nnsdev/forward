# Prompt Pipeline

## Summary

Prompt assembly is a core backend responsibility.

It should be deterministic, testable, and inspectable.

## Inputs

The prompt pipeline consumes:

- App settings
- Selected provider config
- Selected preset
- Selected character
- Chat history
- Current user message or generation mode

## V1 Assembly Order

Recommended order:

1. Global system or base instruction layer
2. Character description and personality
3. Character scenario
4. Example dialogue
5. Prior chat messages
6. Current user message
7. Provider-specific formatting adjustments

This order should be explicit in code and covered by tests.

## Character Fields

V1 character prompt inputs:

- `description`
- `personality`
- `scenario`
- `first_message`
- `example_dialogue`

No lorebooks in V1.

## History Handling

The pipeline must support:

- token estimation
- history truncation
- preservation of message ordering
- exclusion of messages removed by edit-and-regenerate flows

## Truncation Policy

V1 should use a straightforward predictable policy:

- preserve system and character layers first
- preserve the current user message
- keep the newest conversation turns
- drop oldest history first when token budget is exceeded

The prompt inspector should show when truncation happened.

## Provider Formatting

Provider-specific formatting should be the final step, not mixed into generic prompt assembly.

Examples:

- OpenAI-compatible message arrays
- stop string application
- max token shaping

## Prompt Preview

The prompt inspector should show:

- selected provider
- selected model
- selected preset
- token estimate
- truncation summary
- fully assembled messages

This view is required in V1 because debugging prompt problems is otherwise too opaque.

## Generation Modes

V1 needs at least these generation modes:

- `reply`
- `retry`
- `continue`
- `edit-and-regenerate`

Each mode should use the same prompt pipeline with small, explicit differences in input selection.

## Testing Requirements

The prompt pipeline must have direct tests for:

- message ordering
- truncation behavior
- character field inclusion
- preset influence on request shaping
- retry and continue mode behavior
