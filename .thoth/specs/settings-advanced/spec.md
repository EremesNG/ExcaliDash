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
