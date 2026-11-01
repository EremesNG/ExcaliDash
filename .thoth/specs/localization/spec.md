# Localization Specification

## Purpose

Durable behavior for localization.

## Requirements

### Requirement: Spanish user interface

Every screen reachable on ChatGPT Sites MUST render its application text in Spanish when the resolved locale is Spanish, falling back to English only for keys absent from a partial locale.

#### Scenario: Spanish user interface

- **GIVEN** a user whose browser language is `es-ES` and who has no stored language preference
- **WHEN** they open the dashboard, an editor and Settings
- **THEN** application text and `<html lang>` are Spanish and the editor uses Excalidraw's `es-ES` locale

### Requirement: Localized API errors

Adapter error responses MUST include a stable `code`, and the frontend MUST show a localized message for known codes while preserving the server text for unknown ones.

#### Scenario: Localized API errors

- **GIVEN** the Spanish locale
- **WHEN** a backup upload exceeds the archive size limit
- **THEN** the response carries `code` `ARCHIVE_UPLOAD_TOO_LARGE` and the UI shows the Spanish message
