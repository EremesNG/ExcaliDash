# Editor Integration Specification

## Purpose

Durable behavior for editor-integration.

## Requirements

### Requirement: Pinned editor build

The frontend MUST depend on one exact published `@excalidraw/excalidraw` version whose package, commit and integrity are recorded in `upstream.json`, and the repository MUST fail its offline consistency check when the manifest, lockfile and provenance disagree.

#### Scenario: Pinned editor build

- **GIVEN** `upstream.json` records editor version V
- **WHEN** `frontend/package.json` or `frontend/package-lock.json` resolves a different version or a range
- **THEN** `check:editor-upstream --offline` exits non-zero 

### Requirement: Editor upstream drift status

Authenticated users MUST be able to see, in Settings → Advanced, the built editor version and whether excalidraw.com currently serves the same build, a newer build, a different build, or could not be checked, without their browser contacting third-party hosts.

#### Scenario: Editor upstream drift status

- **GIVEN** the pinned editor is `0.18.0-4ce8305`
- **WHEN** excalidraw.com reports a later build with another hash
- **THEN** `GET /api/system/editor` returns status `newer` and the Advanced row shows that an editor update is available 
