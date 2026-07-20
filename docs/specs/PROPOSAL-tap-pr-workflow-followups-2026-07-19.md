# Follow-ups: tap PR auto-merge workflow (from PR #101 review)

**Source:** code review of [atlas#101](https://github.com/Data-Wise/atlas/pull/101)
(`fix(ci): tap formula update via PR + auto-merge`), 2026-07-19. Both items are
non-blocking — PR #101 merged as-is. Tracked here so they aren't lost.

## 1. Re-run false-red on `gh pr merge --auto` fallback

**File:** `.github/workflows/homebrew-release.yml`, "Commit, push branch, and
open tap PR" step.

```bash
gh pr merge "$BRANCH" --repo Data-Wise/homebrew-tap --squash --auto \
  || gh pr merge "$BRANCH" --repo Data-Wise/homebrew-tap --squash
```

On a re-run where auto-merge is already enabled from a prior attempt, `gh pr
merge --auto` can itself error (e.g. "auto-merge is already enabled"),
falling through to the immediate `--squash` merge — which then fails if the
tap's required checks haven't finished yet. End state is still correct
(auto-merge stays enabled, PR merges once checks pass), but the **workflow
run reports red** even though nothing is actually broken.

**Fix idea:** treat "already enabled" as success, e.g. check the PR's
`autoMergeRequest` state before attempting, or grep the error message before
falling back to an immediate merge attempt.

## 2. Dead `unset GITHUB_TOKEN`

Same step. `GITHUB_TOKEN` isn't set as a step/job env var anywhere in this
workflow, so `unset GITHUB_TOKEN` before the push has no effect — there's
nothing to unset. Harmless, but the comment above it ("clear GITHUB_TOKEN so
the runner credential helper doesn't intercept") implies a credential-helper
interference that isn't actually wired up in this job.

**Fix idea:** either remove the line, or set `GITHUB_TOKEN` explicitly
somewhere upstream if there's a real interference case this is guarding
against — worth confirming which before touching it.

## Priority

Low — cosmetic (case 1: misleading red CI on re-run) and dead-code cleanup
(case 2). Pick up next time `homebrew-release.yml` is touched rather than as
a standalone PR.
