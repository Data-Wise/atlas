# Contributing to Atlas

> **Atlas welcomes contributions.** Every brain works differently — we need yours.

---

## Ways to Contribute

| Type | Description | Effort |
|------|-------------|--------|
| **Bug Reports** | Found a bug? Report it. | Low |
| **Feature Requests** | Missing something? Request it. | Low |
| **Documentation** | Fix typos, add examples, translate | Low-Med |
| **Code** | Fix bugs, add features, improve tests | Med-High |
| **Design** | UI/UX, accessibility, ADHD-focused design | Med |
| **Testing** | Write tests, report regressions | Med |
| **Advocacy** | Blog, tweet, talk, demo | Any |

---

## Quick Start

```bash
# 1. Fork & clone
git clone https://github.com/your-username/atlas.git
cd atlas

# 2. Install
npm install

# 3. Link for local development
npm link

# 4. Run tests
npm test

# 5. Make changes, test, commit
```

---

## Development Workflow

### Branch Naming

| Type | Format |
|------|--------|
| Feature | `feature/short-description` |
| Bugfix | `fix/short-description` |
| Docs | `docs/short-description` |
| Refactor | `refactor/short-description` |
| Test | `test/short-description` |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): brief description

[optional body]

[optional footer]
```

| Type | Example |
|------|---------|
| `feat` | `feat(cli): add --type flag to inbox` |
| `fix` | `fix(session): handle empty note on end` |
| `docs` | `docs(adhd-guide): add time-blindness page` |
| `refactor` | `refactor(repo): extract cache logic` |
| `test` | `test(unit): add sync registry tests` |
| `chore` | `chore(deps): update chalk to v5` |

### PR Requirements

| Check | Required |
|-------|----------|
| All tests pass | ✅ |
| Lint passes | ✅ |
| TypeScript compiles | ✅ |
| Docs updated | ✅ (if user-facing) |
| Tests added | ✅ (for new features) |
| Changelog entry | ✅ (for user-facing) |

---

## Code Standards

### TypeScript

- **Strict mode** — No `any`, explicit types
- **ESLint** — `npm run lint` must pass
- **Prettier** — `npm run format` before commit

### Testing

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Integration tests
npm run test:integration

# Coverage
npm run test:coverage
```

**Coverage target:** >90% for new code.

### Architecture Rules

| Rule | Enforcement |
|------|-------------|
| Clean Architecture layers | Import restrictions (ESLint) |
| Domain purity | No external deps in `domain/` |
| Use cases = single responsibility | One action per use case |
| Repositories = interfaces | Swap storage without changing domain |
| Events = decoupled | No direct calls between use cases |

---

## Testing Strategy

| Layer | Tool | Focus |
|-------|------|-------|
| Unit | Jest | Domain logic, use cases, entities |
| Integration | Jest | Repository implementations, adapters |
| E2E | Jest + CLI | Full CLI workflows |
| Dashboard | Vitest + Ink | Component rendering, hooks |
| Dogfood | Custom scripts | Real usage scenarios |

### Writing Tests

```typescript
// Unit: pure domain logic
describe('Session', () => {
  it('calculates duration correctly', () => {
    const session = new Session('id', 'project');
    session.start();
    advanceTime(30 * 60 * 1000); // 30 min
    session.end();
    expect(session.getDuration()).toBe(30);
  });
});

// E2E: real CLI
test('atlas sync --from-status preserves research metadata', () => {
  const result = runCLI('sync --from-status --paths /tmp/test');
  expect(result.stdout).toContain('preserved');
});
```

---

## Documentation Standards

### Writing Style

| Rule | Example |
|------|---------|
| Active voice | "Run `atlas sync`" not "`atlas sync` should be run" |
| Max sentence length | 25 words |
| Max paragraph | 3 sentences |
| Active voice | Required |
| Jargon | Defined inline or glossary |
| Acronyms | Expanded on first use |
| Instructions | Numbered, one action per step |

### Content Standards

- **Max paragraph:** 3 sentences
- **Heading frequency:** Every 300 words max
- **Code example:** Every 2 concepts min
- **ADHD tip box:** Every 500 words
- **Reading time:** Required on all pages

---

## Architecture Overview

```
src/
├── domain/              # Pure business logic (no deps)
│   ├── entities/        # Project, Session, Capture, Task, etc.
│   ├── value-objects/   # ProjectType, SessionState, TaskPriority
│   ├── constants/       # BusinessRules (thresholds, limits)
│   ├── gateways/        # Interfaces (IStatusFileParser)
│   └── repositories/    # Interfaces (IProjectRepository)
├── use-cases/           # Application logic
│   ├── session/         # CreateSession, EndSession, GetStats
│   ├── capture/         # CaptureIdea, TriageInbox, GetInbox
│   ├── context/         # GetContext, Park/Unpark, LogBreadcrumb
│   ├── project/         # GetStatus, GetRecent, ScanProjects
│   ├── registry/        # RegisterProject, SyncRegistry
│   ├── task/            # AddTask, ListTasks, CompleteTask
│   └── status/          # UpdateStatus, UpdateStatusFile
├── adapters/            # External interfaces
│   ├── controllers/     # CLI commands
│   ├── presenters/      # Formatters (ProjectPresenter, TUI)
│   ├── repositories/    # FileSystem/SQLite implementations
│   └── gateways/        # GitGateway, StatusFileGateway
├── utils/               # ADHD helpers, config, charts
├── mcp/                 # MCP server
├── cli/                 # Dashboard (Ink), dashboard-blessed
└── index.js             # Main facade
```

---

## Debugging

```bash
# Verbose logging
DEBUG=atlas:* atlas <command>

# CLI debugging
node --inspect-brk bin/atlas.js sync --paths ~/projects

# Dashboard debugging
DEBUG=atlas:* npx tsx src/cli/dashboard-ink/index.tsx
```

---

## Release Process

1. **Version bump:** `npm version patch|minor|major`
2. **Changelog:** Auto-generated from commits
3. **Release:** GitHub Actions builds, tests, publishes
4. **Homebrew:** Auto-updated via `brew bump-formula-pr`
5. **Docs:** Auto-deployed via GitHub Pages

---

## Code Review Checklist

- [ ] Tests pass locally
- [ ] Lint passes
- [ ] TypeScript compiles
- [ ] No `any` types introduced
- [ ] Domain logic has tests
- [ ] No circular dependencies
- [ ] Commit messages follow convention
- [ ] Changelog entry added (if user-facing)
- [ ] Docs updated (if user-facing)
- [ ] No console.log in production code

---

## Community

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Bugs, features |
| GitHub Discussions | Questions, ideas |
| Discord (planned) | Real-time chat |

---

## Code of Conduct

> **Be kind. Be constructive. Assume good intent.**

- No harassment, discrimination, or gatekeeping
- Constructive feedback > criticism
- Help newcomers — we were all new once
- Accessibility issues are P0 bugs

---

## Recognition

All contributors listed in:

- [Contributors](https://github.com/Data-Wise/atlas/graphs/contributors)
- Release notes
- Annual contributor appreciation post

---

## Questions?

| Channel | Response Time |
|---------|---------------|
| GitHub Issues | 24-48h |
| Discussions | Community |
| Email | maintainer@data-wise.dev |

**No stupid questions.** If you're confused, others are too. Ask.