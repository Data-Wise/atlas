# Grill: CLI Project Remove Fix
Date: 2026-07-02

## Q1: Name Resolution and Fallback Priority
What is the fallback precedence when resolving the project query?
- [RECOMMENDED] Option A: Resolve by exact name first. If no match, fallback to exact UUID match.
  - Pros: Matches typical user intent (naming projects); minimal CLI syntax impact.
  - Cons: If a project name matches another project's UUID, the named project is removed first.
- [ ] Option B: Resolve by exact UUID first. If no match, fallback to exact name match.
  - Pros: Safer for automated scripting where UUIDs are stable keys.
  - Cons: Less intuitive for standard users.
- [ ] Option C: Reject with error if the name and a UUID collide.
  - Pros: Completely safe from ambiguity.
  - Cons: More complex check, rare collision.

User choice: Option A

## Q2: Case Sensitivity in Name Resolution
Should the name resolution be case-sensitive or case-insensitive?
- [RECOMMENDED] Option A: Case-insensitive match (e.g. `medrobust` matches `Medrobust`).
  - Pros: ADHD-friendly, reduces frustration from mistypes.
  - Cons: Potential collision if two projects share a case-variant name.
- [ ] Option B: Case-sensitive match.
  - Pros: Standard Unix convention; safer.
  - Cons: Frustrating for users who mismatch casing.

User choice: Option A

## Q3: Duplicate Name Collision Behavior
How should `project remove` behave if two registered projects share the exact same name (but differ by path/UUID)?
- [RECOMMENDED] Option A: Error out and list paths/UUIDs of both, forcing the user to pass a path or UUID.
  - Pros: Zero risk of accidental deletion.
  - Cons: Interrupts workflow.
- [ ] Option B: Remove the most recently registered project.
  - Pros: No intervention needed.
  - Cons: Risk of deleting the wrong project.
- [ ] Option C: Remove both projects.
  - Pros: Simple.
  - Cons: Accidental deletion risk.

User choice: Option A

## Summary
- Questions answered: 3/3
- Recommended picks: 3/3
- Key concern: Establishing safe name resolution without breaking CLI script usage.

