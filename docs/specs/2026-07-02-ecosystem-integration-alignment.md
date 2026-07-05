# SPEC — Ecosystem Integration Alignment (v0.13.0)

**Status:** Proposed  
**Created:** 2026-07-02  
**Target Versions:** atlas v0.13.0, flow-cli v7.15.0  

---

## 1. Goal

Ensure the new `v0.13.0` commands (`atlas task`, `atlas schedule push`, `atlas agenda`) are fully integrated and aligned with `flow-cli` workflows, preventing runtime parsing bugs and ensuring robust timezone-safe dates.

## 2. Proposed Changes

### [MODIFY] flow-cli: [docs/ATLAS-CONTRACT.md](file:///Users/dt/projects/dev-tools/flow-cli/docs/ATLAS-CONTRACT.md)
- Bump contract version to **v1.2.0**.
- Fully document the `v0.13.0` commands and JSON formats:
  - `atlas task` CRUD command specifications.
  - `atlas schedule push --format=json --data=<json>` input schema.
  - `atlas agenda [window-days] --format=json` output schema.

### [MODIFY] flow-cli: [tests/e2e-agenda-atlas.zsh](file:///Users/dt/projects/dev-tools/flow-cli/tests/e2e-agenda-atlas.zsh)
- Extend the E2E test suite to execute against the real local `atlas` binary (located at `../atlas/bin/atlas.js`) when available, rather than relying exclusively on stub fixtures.

### [MODIFY] flow-cli: [tests/test-atlas-contract.zsh](file:///Users/dt/projects/dev-tools/flow-cli/tests/test-atlas-contract.zsh)
- Add verification test cases asserting that `atlas task list --format=json` and `atlas agenda --format=json` exit 0 and output valid, parseable JSON arrays matching the contracted keys.

## 3. Verification Plan

### Automated Tests
- In `flow-cli`:
  - Run `zsh tests/e2e-agenda-atlas.zsh` to verify merged agenda behavior.
  - Run `zsh tests/test-atlas-contract.zsh` to assert full contract compatibility.
