# Product Scope

## Summary

`forward` is a single-user, self-hosted chat application inspired by SillyTavern.

It prioritizes:

- A slimmer, more modern interface
- Strong mobile responsiveness
- Reliable streaming chat UX
- Character-driven conversations
- Central persistence across devices
- Clean architecture instead of feature sprawl

It does not aim to reach SillyTavern feature parity in V1.

## Product Goals

V1 must deliver:

- A fast and polished chat experience on desktop and mobile
- Character-based chat with imported character cards
- Central persistence across devices through a single backend and SQLite database
- Support for both hosted and local model providers
- Streaming output with separate reasoning support
- Presets and provider configurations that can be reused per chat
- A prompt inspector that makes prompt assembly understandable and debuggable

## Target User

The target user is one technically capable self-hosting user who wants:

- Better chat UX than raw model UIs
- Character and preset management
- Persistent chat history across laptop and phone
- Access to both local and remote models
- Visibility into how prompts are assembled

## V1 In Scope

- Password login gate
- Session-based authentication
- Chat creation, listing, renaming, and deletion
- Message persistence
- Streaming assistant responses
- Streaming reasoning or thinking output when provided by the model
- Cancel, retry, continue, edit-and-regenerate flows
- Character library and character editor
- Character import from PNG cards and JSON
- Preset management
- Provider configuration management
- Prompt inspection view
- Standard markdown rendering
- Mobile-first responsive UI
- Disk-backed media storage for avatars and imported assets
- Docker-ready local deployment

## V1 Out Of Scope

- Lorebooks
- Group chats
- Multi-user accounts or roles
- Plugin or extension systems
- Scripting or macros
- Cloud sync conflict resolution
- Image generation
- Tool calling
- Theme editor
- Public marketplace or sharing features
- Rich admin/security features beyond the single-user password gate

## Product Principles

1. Core chat UX first.
2. Provider differences stay out of the UI.
3. Prompt assembly must be inspectable.
4. Mobile usability is not polish, it is core functionality.
5. Imports matter, but imported formats do not control the internal data model.
6. V1 should be small enough to complete and solid enough to keep.

## Success Criteria

V1 is successful when all of the following are true:

- The user can log in from phone or laptop and see the same chats.
- The user can import a character card and start chatting immediately.
- The user can connect a provider and stream a response.
- The user can view reasoning separately from answer text.
- The user can retry, continue, or edit and regenerate a message.
- Chats, characters, presets, and settings persist correctly.
- The prompt inspector clearly shows what was sent and why.
- The app feels good to use on a phone.

## Non-Goals For V1.5 Planning

These may be revisited later, but they should not shape V1 architecture beyond reasonable extension points:

- Lorebook support
- Group orchestration
- Provider-specific advanced control panels
- Offline-first browser caching
- Public internet multi-user hosting
