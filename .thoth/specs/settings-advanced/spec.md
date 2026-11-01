# Settings Advanced Specification

## Purpose

Durable behavior for settings-advanced.

## Requirements

### Requirement: Managed authentication description

When authentication is provided by ChatGPT Sites, Settings → Advanced MUST describe it as managed by ChatGPT Sites and MUST NOT offer a control to disable authentication.

#### Scenario: Managed authentication description

- **GIVEN** the adapter reports Sites-managed authentication
- **WHEN** a user opens Settings → Advanced
- **THEN** the authentication row names ChatGPT Sites and shows no Disable button

### Requirement: API keys hidden under managed authentication

When authentication is managed by ChatGPT Sites (`authMode` `oidc_enforced`), Settings MUST NOT render API-key management or request API keys; `local` and `hybrid` modes keep the API-key card.

#### Scenario: API keys hidden under managed authentication

- **GIVEN** a Sites user whose auth status reports `authMode` `oidc_enforced`
- **WHEN** they open Settings
- **THEN** no API-key card is shown and no API-key list request is made
