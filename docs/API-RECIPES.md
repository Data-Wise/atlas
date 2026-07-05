# Atlas API Recipes

> Practical programmatic examples using Atlas as a library. For the full API reference, see [API-GUIDE.md](API-GUIDE.md).
> Each recipe is **use case → working code → notes**.

---

## Recipe 1 — Batch task management

**You want** to add multiple tasks from a project plan or markdown list.

```javascript
import { Atlas } from '@data-wise/atlas';

const atlas = new Atlas({ storage: 'filesystem' });

const tasks = [
  { text: 'Review CRAN submission', due: '2026-07-10', priority: 'P1' },
  { text: 'Update changelog for v0.13.0', due: '2026-07-05', priority: 'P2' },
  { text: 'Write release notes', priority: 'P3' },
  { text: 'Run R CMD check --as-cran', due: 'tomorrow', priority: 'P1' },
];

for (const task of tasks) {
  const result = await atlas.tasks.add(task.text, {
    due: task.due,
    priority: task.priority,
    project: 'medfit',
  });
  console.log(`Added: ${result.text} (id: ${result.id})`);
}

atlas.close();
```

**Notes.** `due` accepts ISO dates, relative formats (`tomorrow`, `next-friday`, `+3d`), or `null`. Priority levels: `P0` (critical) through `P3` (low). Tasks are chronological by default.

---

## Recipe 2 — Query tasks with filters

**You want** to find overdue tasks, tasks due soon, or completed tasks for reporting.

```javascript
const atlas = new Atlas({ storage: 'filesystem' });

// All incomplete tasks
const allPending = await atlas.tasks.list({ completed: false });
console.log(`${allPending.length} pending tasks`);

// Overdue tasks across all projects
const overdue = await atlas.tasks.list({ overdue: true });
for (const task of overdue) {
  console.log(`⚠️  ${task.text} (due: ${task.due}, project: ${task.project})`);
}

// Tasks due within 3 days
const dueSoon = await atlas.tasks.list({ dueSoon: 3 });
console.log(`Due soon: ${dueSoon.length} tasks`);

// Tasks for a specific project
const projectTasks = await atlas.tasks.list({ project: 'medfit' });

atlas.close();
```

**Notes.** All filter parameters are optional. Combine them: `overdue: true, project: 'medfit'` returns overdue tasks only for medfit.

---

## Recipe 3 — Schedule records and push

**You want** to create scheduled events and push them to the agenda.

```javascript
const atlas = new Atlas({ storage: 'filesystem' });

// Create a scheduled record
await atlas.schedule.add({
  title: 'CRAN submission review',
  date: '2026-07-10',
  time: '14:00',
  duration: 60,
  project: 'medfit',
  type: 'meeting',
});

// Push schedule to agenda
const agenda = await atlas.schedule.push({ format: 'json' });
console.log(JSON.stringify(agenda, null, 2));

atlas.close();
```

**Notes.** Schedule types: `meeting`, `deadline`, `reminder`, `focus`. The `push` method merges scheduled records with tasks due on each date.

---

## Recipe 4 — Merged agenda view

**You want** to get today's combined agenda from multiple sources programmatically.

```javascript
const atlas = new Atlas({ storage: 'filesystem' });

// Today's agenda
const today = await atlas.agenda.get();
console.log('Today:');
for (const item of today) {
  const time = item.time || 'all day';
  console.log(`  ${time} - ${item.title} (${item.source})`);
}

// Next 7 days
const week = await atlas.agenda.get({ windowDays: 7 });
console.log(`\nNext 7 days: ${week.length} items`);

// JSON for scripting
const weekJson = await atlas.agenda.get({ windowDays: 7, format: 'json' });

atlas.close();
```

**Notes.** Each agenda item has a `source` field: `schedule` (from schedule records), `task` (tasks with due dates), or `session` (historical sessions).

---

## Recipe 5 — Analytics and velocity tracking

**You want** to query session analytics for custom reporting.

```javascript
const atlas = new Atlas({ storage: 'filesystem' });

// Get stats for a project
const stats = await atlas.sessions.stats({ project: 'atlas' });
console.log(`Sessions: ${stats.totalSessions}`);
console.log(`Total time: ${stats.totalMinutes} minutes`);
console.log(`Average: ${stats.averageMinutes} minutes/session`);

// Velocity (4-week rolling)
const velocity = await atlas.analytics.velocity({ project: 'atlas' });
console.log(`Current velocity: ${velocity.current}`);
console.log(`Trend: ${velocity.trend}`); // 'up', 'down', 'stable'

// Pattern analysis (90-day)
const patterns = await atlas.analytics.patterns({ project: 'atlas' });
console.log(`Best hours: ${patterns.bestHours.join(', ')}`);
console.log(`Typical session length: ${patterns.typicalDuration} min`);

atlas.close();
```

**Notes.** Velocity is calculated over a 4-week rolling window. Patterns analyze 90-day session history to find your most productive hours and typical session lengths.

---

## Recipe 6 — Session export to iCal

**You want** to export session history to iCal format for calendar integration.

```javascript
import { writeFileSync } from 'fs';

const atlas = new Atlas({ storage: 'filesystem' });

// Export all sessions as iCal
const ical = await atlas.sessions.export({ format: 'ical' });
writeFileSync('atlas-sessions.ics', ical);
console.log('Exported to atlas-sessions.ics');

// Export filtered sessions
const filtered = await atlas.sessions.export({
  format: 'ical',
  project: 'atlas',
  since: '2026-06-01',
});
writeFileSync('atlas-june.ics', filtered);

atlas.close();
```

**Notes.** iCal files can be imported into Google Calendar, Apple Calendar, or Outlook. The export creates VEVENT entries with project, duration, and completion notes.

---

## Recipe 7 — Capture and triage workflow

**You want** to capture ideas programmatically and process them later.

```javascript
const atlas = new Atlas({ storage: 'filesystem' });

// Capture quick ideas
await atlas.capture.add('Check API rate limits');
await atlas.capture.add('Add dark mode', { project: 'dashboard' });
await atlas.capture.add('Review CRAN submission', { project: 'medfit', priority: 'P1' });

// List pending captures
const inbox = await atlas.capture.list();
console.log(`Inbox: ${inbox.length} items`);
for (const item of inbox) {
  console.log(`  - ${item.text} (project: ${item.project || 'none'})`);
}

// Process a capture (mark as done)
await atlas.capture.triage(inbox[0].id, {
  action: 'convert-to-task',
  project: 'medfit',
});

atlas.close();
```

**Notes.** Triage actions: `convert-to-task` (creates a task), `convert-to-breadcrumb` (logs as context), `archive` (marks done), `delete` (removes).

---

## Recipe 8 — Cross-project dashboard data

**You want** to build a custom dashboard using Atlas data.

```javascript
const atlas = new Atlas({ storage: 'filesystem' });

// Get all projects with stats
const projects = await atlas.projects.list({ includeStats: true });
for (const p of projects) {
  console.log(`${p.name}:`);
  console.log(`  Status: ${p.status}`);
  console.log(`  Sessions: ${p.stats.totalSessions}`);
  console.log(`  Last active: ${p.stats.lastSessionAt}`);
  console.log(`  Streak: ${p.stats.streak} days`);
}

// Get ecosystem view (cross-project overview)
const ecosystem = await atlas.analytics.ecosystem();
console.log(`\nEcosystem: ${ecosystem.totalProjects} projects`);
console.log(`Active today: ${ecosystem.activeToday}`);
console.log(`Total sessions this week: ${ecosystem.weeklySessions}`);

atlas.close();
```

**Notes.** `includeStats: true` adds session counts, streaks, and last-active timestamps to each project. The ecosystem view aggregates across all projects.

---

## Recipe 9 — Context management (park/unpark)

**You want** to save and restore work context programmatically.

```javascript
const atlas = new Atlas({ storage: 'filesystem' });

// Save current context
const parkResult = await atlas.context.park({
  note: 'Switching to urgent bug fix',
  project: 'atlas',
});
console.log(`Parked at: ${parkResult.timestamp}`);

// List all parked contexts
const parked = await atlas.context.parked();
for (const ctx of parked) {
  console.log(`  ${ctx.note} (${ctx.project}, ${ctx.timestamp})`);
}

// Restore most recent context
const restored = await atlas.context.unpark();
console.log(`Restored: ${restored.note}`);

atlas.close();
```

**Notes.** Park creates a breadcrumb with your context note. Multiple parks stack — `parked()` returns them in LIFO order.

---

## Recipe 10 — Custom integration with MCP

**You want** to use Atlas MCP tools from a custom script or automation.

```javascript
import { AtlasMCP } from '@data-wise/atlas/mcp';

const mcp = new AtlasMCP();

// List projects via MCP
const projects = await mcp.call('atlas_get_projects', { kind: 'manuscript' });
console.log(projects);

// Start session via MCP
await mcp.call('atlas_start_session', {
  project: 'medfit',
  task: 'Run CRAN checks',
});

// Capture via MCP
await mcp.call('atlas_capture', {
  text: 'Check revdep results',
  project: 'medfit',
});

// Get context via MCP
const context = await mcp.call('atlas_get_context', { project: 'medfit' });
console.log(context);
```

**Notes.** The MCP interface mirrors the CLI commands. Use this when building automations that need to interact with Atlas from outside Node.js, or when integrating with Claude Desktop/CLI workflows.

---

## Recipe 11 — SQLite backend for performance

**You want** to use SQLite for faster queries on large datasets.

```javascript
const atlas = new Atlas({
  storage: 'sqlite',
  configPath: '~/.atlas',
});

// Same API works — just faster for large datasets
const projects = await atlas.projects.list();
const tasks = await atlas.tasks.list({ overdue: true });

// SQLite is better for:
// - Projects with many sessions (1000+)
// - Complex queries (multiple filters)
// - Concurrent access
// - Analytics over large time ranges

atlas.close();
```

**Notes.** SQLite is recommended if you have 50+ projects or 1000+ sessions. The filesystem backend uses JSON files with in-memory caching — fast for small datasets, slower for large ones.

---

## Recipe 12 — Container dependency injection

**You want** to customize the Atlas internals for testing or advanced use.

```javascript
import { Container } from '@data-wise/atlas/adapters/Container.js';

// Create a custom container
const container = new Container({
  storage: 'sqlite',  // or 'filesystem'
});

// Get repositories
const projectRepo = container.getProjectRepository();
const sessionRepo = container.getSessionRepository();
const taskRepo = container.getTaskRepository();

// Use repositories directly
const projects = await projectRepo.findAll();
const sessions = await sessionRepo.findByProject('atlas');

// Use use cases
const createSession = container.getCreateSessionUseCase();
const result = await createSession.execute('atlas', { task: 'Custom workflow' });

// Clean up
container.close();
```

**Notes.** The Container pattern allows swapping storage backends without changing business logic. Useful for testing (use in-memory), custom integrations, or when you need direct access to repositories.

---

## Notes

All recipes assume Atlas is installed (`npm install @data-wise/atlas`) and configured (`~/.atlas/` directory exists). See [CONFIGURATION.md](CONFIGURATION.md) for setup details. For the full API reference including all parameters, return types, and error handling, see [API-GUIDE.md](API-GUIDE.md).
