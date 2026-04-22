# Responsive UX

## Summary

Responsive behavior is a core product requirement.

The app must be comfortable on a phone, not just technically accessible there.

## UX Goals

- Keep the conversation as the primary focus
- Minimize clutter on smaller screens
- Keep the composer easy to use with the keyboard open
- Preserve context while streaming
- Make core actions reachable with touch

## Desktop Layout

Recommended structure:

- Left rail for chats and character shortcuts
- Center conversation pane
- Right contextual panel or drawer for character, preset, provider, and prompt info

## Mobile Layout

Recommended structure:

- Single-column conversation view
- Sticky bottom composer
- Slide-over drawer for chat list
- Separate drawer or sheet for character and settings controls
- Simple header with essential actions only

## Critical Mobile Behaviors

- Composer remains visible when the keyboard opens
- Streamed output does not break scroll position
- Touch targets remain comfortably large
- Long prompts and panels open in sheets or dedicated screens, not cramped sidebars

## Reasoning UX

Assistant messages should support a collapsible reasoning section.

Recommended default:

- Hidden by default
- Expandable while still streaming
- Clearly separated from final visible answer text

## Prompt Inspector UX

The prompt inspector is in scope for V1, but it should not dominate the chat screen.

Recommended patterns:

- Desktop: right-side drawer or modal
- Mobile: full-screen modal or dedicated route

## Chat Actions

Important actions per assistant turn:

- retry
- continue
- copy
- reveal reasoning

Important actions per user turn:

- edit
- delete
- regenerate from edit

Avoid showing too many buttons inline at all times on small screens.

## Markdown Rendering

V1 should support standard markdown:

- headings
- paragraphs
- emphasis
- lists
- links
- code blocks
- tables where practical

Rendering should stay readable on narrow screens, especially for code blocks.

## Visual Direction

The product should feel slimmer and more modern than SillyTavern.

Practical implications:

- generous spacing
- clear hierarchy
- fewer always-visible controls
- typography that keeps long chats readable
- drawers and sheets instead of dense control walls
