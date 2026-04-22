# Import Compatibility

## Summary

V1 supports character import from:

- PNG cards
- JSON character exports

Import compatibility is important, but internal app models should remain clean and stable.

## V1 Goals

- Allow the user to bring existing characters into the app quickly
- Preserve the key character fields needed for prompt assembly
- Save imported avatars to disk
- Track import history in SQLite

## Supported Formats

### PNG Character Cards

Expected behavior:

- Read embedded metadata payload
- Extract character fields
- Save embedded avatar or source image to managed media storage
- Normalize into the internal `characters` table shape

### JSON Character Definitions

Expected behavior:

- Parse known Tavern or SillyTavern-like JSON fields where practical
- Map into internal character fields
- Ignore unsupported fields safely

## Field Mapping

Target internal fields:

- `name`
- `description`
- `personality`
- `scenario`
- `first_message`
- `example_dialogue`
- `avatar_asset_path`
- `metadata_json`

Unsupported source fields should be preserved in `metadata_json` where useful rather than dropped immediately.

## Explicit Non-Goal

V1 does not support lorebooks.

If imported formats reference lorebook-like data, the importer should:

- ignore it safely
- record it in import details if helpful
- not block character import

## Import UX

Recommended UI flow:

- upload file
- parse and preview basic fields
- confirm import
- open character editor if user wants adjustments

The ideal happy path is one import action followed by immediate chat usage.

## Validation

Import should validate:

- file type support
- parse success
- presence of minimum usable character data

On validation failure, the app should show a useful error instead of silently importing broken records.

## Export Policy

V1 exports should prefer an app-native format.

Reasoning content is excluded by default.

Compatibility exports can be added later if there is a real need.
