# Atlas Programmatic API Guide

Use Atlas as a library in your Node.js applications for project tracking, session management, and workflow automation.

## Installation

```bash
npm install @data-wise/atlas
```

## Quick Start

```javascript
import { Atlas } from '@data-wise/atlas';

// Initialize Atlas
const atlas = new Atlas({
  storage: 'filesystem',  // or 'sqlite'
  configPath: '~/.atlas'
});

// Start a work session
const session = await atlas.sessions.start('myproject', {
  task: 'Implement feature X'
});

// Capture an idea
await atlas.capture.add('Check API rate limits', {
  project: 'myproject',
  type: 'task'
});

// Get current context
const context = await atlas.context.where('myproject');
console.log(context.focus);

// End the session
await atlas.sessions.end('Completed initial implementation');

// Clean up (important for SQLite)
atlas.close();
```

## Initialization

### Constructor Options

```javascript
const atlas = new Atlas({
  // Storage backend: 'filesystem' (default) or 'sqlite'
  storage: 'filesystem',

  // Configuration directory path
  configPath: '~/.atlas',

  // Override config (optional)
  config: {
    scanPaths: ['~/projects', '~/work'],
    preferences: {
      adhd: { showStreak: true }
    }
  }
});
```

### Environment Variables

```javascript
// These override constructor options
process.env.ATLAS_CONFIG = '/custom/path';
process.env.ATLAS_STORAGE = 'sqlite';
```

---

## Projects API

### Register a Project

```javascript
await atlas.projects.register(path, options);
```

**Parameters:**
- `path` (string): Absolute path to project directory
- `options` (object):
  - `tags` (string[]): Project tags
  - `status` (string): Initial status
  - `description` (string): Project description

**Example:**
```javascript
await atlas.projects.register('/Users/me/projects/api', {
  tags: ['node', 'api', 'active'],
  status: 'active',
  description: 'REST API service'
});
```

### List Projects

```javascript
const projects = await atlas.projects.list(options);
```

**Options:**
- `status` (string): Filter by status
- `tag` (string): Filter by tag
- `limit` (number): Max results

**Example:**
```javascript
// Get all active projects
const active = await atlas.projects.list({ status: 'active' });

// Get projects with specific tag
const rPackages = await atlas.projects.list({ tag: 'r-package' });
```

### Get Project

```javascript
const project = await atlas.projects.get(name);
```

**Returns:** Project object or null

**Example:**
```javascript
const project = await atlas.projects.get('myproject');
if (project) {
  console.log(project.name);
  console.log(project.path);
  console.log(project.status);
}
```

### Update Project

```javascript
await atlas.projects.update(name, updates);
```

**Example:**
```javascript
await atlas.projects.update('myproject', {
  status: 'active',
  description: 'Updated description',
  tags: ['node', 'active']
});
```

### Set Focus

```javascript
await atlas.projects.setFocus(name, focusText);
const focus = await atlas.projects.getFocus(name);
```

**Example:**
```javascript
await atlas.projects.setFocus('myproject', 'Optimizing database queries');

const focus = await atlas.projects.getFocus('myproject');
console.log(focus); // "Optimizing database queries"
```

### Set Status

```javascript
await atlas.projects.setStatus(name, status);
```

**Valid statuses:** `active`, `paused`, `blocked`, `archived`, `complete`

### Set Progress

```javascript
await atlas.projects.setProgress(name, progress);
await atlas.projects.incrementProgress(name, amount);
```

**Example:**
```javascript
await atlas.projects.setProgress('myproject', 50);
await atlas.projects.incrementProgress('myproject', 10); // Now 60
```

### Complete Next Action

```javascript
await atlas.projects.completeNextAction(name, newAction);
```

**Example:**
```javascript
// Complete current action and set new one
await atlas.projects.completeNextAction('myproject', 'Write tests');
```

### Unregister Project

```javascript
await atlas.projects.unregister(name);
```

---

## Sessions API

### Start Session

```javascript
const session = await atlas.sessions.start(project, options);
```

**Parameters:**
- `project` (string): Project name
- `options` (object):
  - `task` (string): Task description
  - `branch` (string): Git branch
  - `context` (object): Additional metadata

**Returns:** Session object

**Example:**
```javascript
const session = await atlas.sessions.start('myproject', {
  task: 'Implement user authentication',
  branch: 'feature/auth',
  context: {
    cwd: process.cwd(),
    ticket: 'JIRA-123'
  }
});

console.log(session.id);
console.log(session.startTime);
```

### End Session

```javascript
await atlas.sessions.end(note);
```

**Parameters:**
- `note` (string): Optional session summary

**Example:**
```javascript
await atlas.sessions.end('Completed login flow, needs code review');
```

### Get Current Session

```javascript
const session = await atlas.sessions.current();
```

**Returns:** Active session or null

**Example:**
```javascript
const current = await atlas.sessions.current();
if (current) {
  console.log(`Working on: ${current.project}`);
  console.log(`Duration: ${current.getDuration()} minutes`);
  console.log(`In flow: ${current.isInFlowState()}`);
}
```

### Session Object Methods

```javascript
const session = await atlas.sessions.current();

// Get duration in minutes
const duration = session.getDuration();

// Check if in flow state (15+ minutes)
const inFlow = session.isInFlowState();

// Get active work duration (excluding pauses)
const activeDuration = session.getActiveDuration();

// Get session summary
const summary = session.getSummary();
```

### Session Analytics

```javascript
const stats = await atlas.sessions.stats(options);
```

**Parameters:**
- `options` (object):
  - `days` (number): Days to analyze (default: 7)
  - `project` (string): Filter by project
  - `period` (string): Preset period (`week`, `month`)

**Returns:** Analytics object with:
- `period`: Date range info
- `summary`: Total sessions, time, flow percentage, completion rate
- `streak`: Current and longest streak
- `bestDay`: Most productive day
- `hourlyDistribution`: Session activity by hour (24 values)
- `byProject`: Per-project breakdown

**Example:**
```javascript
// Weekly stats
const stats = await atlas.sessions.stats();
console.log(`Total: ${stats.summary.totalSessions} sessions`);
console.log(`Flow: ${stats.summary.flowPercentage}%`);
console.log(`Streak: ${stats.streak.display}`);

// Monthly stats for specific project
const projectStats = await atlas.sessions.stats({
  days: 30,
  project: 'myproject'
});

// Access per-project breakdown
stats.byProject.forEach(p => {
  console.log(`${p.name}: ${p.sessions} sessions, ${p.flowPercentage}% flow`);
});
```

### Session Export (v0.7.0)

```javascript
const result = await atlas.sessions.export(options);
```

**Parameters:**
- `options` (object):
  - `days` (number): Days to export (default: 30)
  - `project` (string): Filter by project
  - `period` (string): Preset period (`week`, `month`, `year`, `all`)
  - `format` (string): Output format (`ical`, `json`)

**Returns:** Object with:
- `content`: iCal string or JSON string
- `sessions`: Number of sessions exported
- `format`: Format used

**Example:**
```javascript
// Export to iCal format
const { content } = await atlas.sessions.export({
  days: 30,
  format: 'ical'
});

// Write to file
import { writeFileSync } from 'fs';
writeFileSync('sessions.ics', content);

// Export specific project as JSON
const result = await atlas.sessions.export({
  project: 'myproject',
  days: 60,
  format: 'json'
});
const sessions = JSON.parse(result.content);
console.log(`Exported ${sessions.length} sessions`);
```

**iCal Output:**
The iCal export follows RFC 5545 and works with:
- Apple Calendar (double-click .ics file)
- Google Calendar (Settings → Import)
- Outlook (File → Import)

### Plan Day (v0.8.0)

```javascript
const plan = await atlas.sessions.planDay(options);
```

**Parameters:**
- `options` (object):
  - `ecosystemPath` (string): Path to scan for .STATUS files

**Returns:** Planning data object with:
- `yesterdaySessions`: Array of yesterday's sessions
- `streak`: Current streak info
- `inboxItems`: Pending inbox captures
- `suggestions`: Smart suggestions for today
- `parkedContexts`: Any parked work contexts

**Example:**
```javascript
// Get daily planning data
const plan = await atlas.sessions.planDay();

console.log(`🔥 Streak: ${plan.streak.display}`);
console.log(`📥 ${plan.inboxItems.length} inbox items`);

// Show yesterday's work
plan.yesterdaySessions.forEach(s => {
  console.log(`  ${s.project}: ${s.duration}m`);
});

// Show suggestions
plan.suggestions.forEach(s => {
  console.log(`💡 ${s.text}`);
});

// With ecosystem scan
const ecoplan = await atlas.sessions.planDay({
  ecosystemPath: '~/projects/dev-tools'
});
console.log(`Found ${ecoplan.ecosystemProjects.length} ecosystem projects`);
```

---

## Capture API

### Add Capture

```javascript
await atlas.capture.add(text, options);
```

**Parameters:**
- `text` (string): Capture content (max 500 chars)
- `options` (object):
  - `project` (string): Associate with project
  - `type` (string): `idea`, `task`, `bug`, `note`, `question`
  - `tags` (string[]): Tags for the capture

**Example:**
```javascript
// Quick capture
await atlas.capture.add('Check VanderWeele 2015 appendix');

// Capture with options
await atlas.capture.add('Add input validation to login form', {
  project: 'api',
  type: 'task',
  tags: ['security', 'urgent']
});
```

### Get Inbox

```javascript
const items = await atlas.capture.inbox(options);
```

**Options:**
- `project` (string): Filter by project
- `type` (string): Filter by type
- `status` (string): Filter by status
- `limit` (number): Max results

**Example:**
```javascript
// Get all inbox items
const inbox = await atlas.capture.inbox();

// Get tasks for specific project
const tasks = await atlas.capture.inbox({
  project: 'myproject',
  type: 'task'
});
```

### Get Counts

```javascript
const counts = await atlas.capture.counts();
```

**Returns:**
```javascript
{
  total: 15,
  byType: {
    idea: 5,
    task: 7,
    bug: 2,
    note: 1
  },
  byProject: {
    'myproject': 8,
    'api': 7
  }
}
```

---

## Context API

### Where (Get Context)

```javascript
const context = await atlas.context.where(project);
```

**Returns:**
```javascript
{
  focus: 'Current focus text',
  session: {
    id: 'session-id',
    project: 'myproject',
    task: 'Current task',
    duration: 45,
    startTime: Date
  },
  recentCrumbs: [
    { text: 'Latest breadcrumb', timestamp: Date },
    // ...
  ],
  recentCaptures: [
    { text: 'Latest capture', type: 'idea' },
    // ...
  ]
}
```

**Example:**
```javascript
const ctx = await atlas.context.where('myproject');

if (ctx.session) {
  console.log(`Active: ${ctx.session.task}`);
  console.log(`Duration: ${ctx.session.duration} min`);
}

if (ctx.focus) {
  console.log(`Focus: ${ctx.focus}`);
}

ctx.recentCrumbs.forEach(crumb => {
  console.log(`- ${crumb.text}`);
});
```

### Leave Breadcrumb

```javascript
await atlas.context.breadcrumb(text, project);
```

**Example:**
```javascript
await atlas.context.breadcrumb('Stuck on variance estimation', 'myproject');
await atlas.context.breadcrumb('Need to refactor auth module');
```

### Get Trail

```javascript
const trail = await atlas.context.trail(project, days);
```

**Parameters:**
- `project` (string): Project name (optional)
- `days` (number): Days to look back (default: 7)

**Example:**
```javascript
const trail = await atlas.context.trail('myproject', 14);

trail.forEach(crumb => {
  console.log(`${crumb.timestamp}: ${crumb.text}`);
});
```

### Get Status

```javascript
const status = await atlas.context.getStatus(project);
```

**Returns:** Comprehensive status object

---

## Sync API

### Sync Registry

```javascript
const result = await atlas.sync(options);
```

**Options:**
- `paths` (string[]): Directories to scan
- `dryRun` (boolean): Preview without changes
- `removeOrphans` (boolean): Remove missing projects

**Returns:**
```javascript
{
  added: ['project1', 'project2'],
  updated: ['project3'],
  unchanged: ['project4', 'project5'],
  removed: [],
  errors: []
}
```

**Example:**
```javascript
// Sync from configured paths
const result = await atlas.sync();
console.log(`Added: ${result.added.length}`);
console.log(`Updated: ${result.updated.length}`);

// Sync specific paths
const result2 = await atlas.sync({
  paths: ['~/projects', '~/work'],
  removeOrphans: true
});
```

### StatusFileParser (v0.8.0)

Directly parse .STATUS files from any directory:

```javascript
const parser = atlas.container.resolve('StatusFileParser');

// Parse a single .STATUS file
const status = await parser.parse('/path/to/.STATUS');
console.log(status.name);      // Project name
console.log(status.status);    // "active"
console.log(status.progress);  // 75
console.log(status.focus);     // Current focus text
console.log(status.next);      // Next action

// Scan a directory tree for .STATUS files
const results = await parser.scanDirectory('~/projects/dev-tools', {
  maxDepth: 2  // Limit recursion depth
});

results.forEach(({ path, parsed }) => {
  console.log(`${parsed.name}: ${parsed.status} (${parsed.progress}%)`);
});
```

**Parsed fields:**
- `name` (string): Project name from file
- `type` (string): Project type (node, r-package, etc.)
- `status` (string): Status value
- `progress` (number): 0-100 percentage
- `priority` (number): 1-3 priority level
- `phase` (string): Current phase text
- `focus` (string): Current focus text
- `next` (string): Next action item

---

## Configuration API

### Access Config

```javascript
const config = atlas.config;
```

### Load Configuration

```javascript
const cfg = await config.load();
```

### Get Scan Paths

```javascript
const paths = await config.getScanPaths();
// ['~/projects', '~/work']
```

### Add/Remove Scan Paths

```javascript
await config.addScanPath('~/new-projects');
await config.removeScanPath('~/old-projects');
```

### Get/Set Preferences

```javascript
// Get all preferences
const prefs = await config.getPreferences();

// Get specific preference using dot notation
const showStreak = await config.getPreference('adhd.showStreak');

// Set preference
await config.setPreference('adhd.celebrationLevel', 'enthusiastic');

// Get category-specific preferences
const adhdPrefs = await config.getADHDPreferences();
const sessionPrefs = await config.getSessionPreferences();
const dashboardPrefs = await config.getDashboardPreferences();
```

### Reset Preferences

```javascript
await config.resetPreferences();
```

---

## Output Formatters

Atlas provides formatting utilities for display:

```javascript
// Format data as table, json, or names
atlas.formatOutput(data, 'table');
atlas.formatOutput(data, 'json');
atlas.formatOutput(data, 'names');

// Format status display
atlas.formatStatus(statusObject);

// Format context display
atlas.formatContext(contextObject);

// Format inbox display
atlas.formatInbox(captureItems);

// Format trail display
atlas.formatTrail(breadcrumbs);
```

---

## Domain Entities

### Project

```javascript
import { Project } from '@data-wise/atlas';

const project = new Project({
  id: 'unique-id',
  name: 'myproject',
  path: '/path/to/project',
  tags: ['node', 'active']
});

// Methods
project.validate();              // Validate business rules
project.touch();                 // Update lastAccessedAt
project.recordSession(30);       // Record 30-min session
project.hasTag('node');          // Check for tag
project.addTag('urgent');        // Add tag
project.removeTag('old');        // Remove tag
project.matchesSearch('my');     // Search matching
project.getSummary();            // Get summary object
```

### Session

```javascript
import { Session } from '@data-wise/atlas';

const session = new Session('id', 'project', {
  task: 'My task',
  branch: 'main'
});

// Methods
session.validate();              // Validate
session.end('completed');        // End session
session.pause();                 // Pause session
session.resume();                // Resume session
session.getDuration();           // Get duration in minutes
session.isInFlowState();         // Check flow (15+ min)
session.getSummary();            // Get summary
```

### Capture

```javascript
import { Capture } from '@data-wise/atlas';

const capture = new Capture({
  id: 'unique-id',
  text: 'My idea',
  type: 'idea'
});

// Methods
capture.triage({ project: 'myproject' });
capture.archive();
capture.assignToProject('otherproject');
capture.addTag('urgent');
capture.getAge();                // "2 hours ago"
```

---

## TUI Component APIs (v0.9.1)

The v0.9.1 Ink dashboard exposes typed React components and hooks for building custom layouts.

### useLayout() hook

```typescript
import { useLayout, LAYOUT, PANEL_CONFIG } from '../lib/LayoutManager';

function MyDashboard() {
  const { layout, focusedPanel, cycleLayout, cycleFocus } = useLayout();

  // layout: 'single' | 'split' | 'triple'
  // focusedPanel: 'main' | 'sidebar' | 'inspector'
  // Tab → cycleLayout()  |  Shift+Tab → cycleFocus()

  const config = PANEL_CONFIG[layout];
  // { sidebar: { width: 28 } | null, main: { width: 72 }, inspector: { width: 28 } | null }
}
```

**`LAYOUT` constants:**
```typescript
LAYOUT.SINGLE  // 'single' — full-screen, no panels
LAYOUT.SPLIT   // 'split'  — sidebar 28% + main 72%
LAYOUT.TRIPLE  // 'triple' — sidebar 25% + main 47% + inspector 28%
```

### SidebarPanel props

```typescript
import { SidebarPanel, SidebarProject } from '../components/SidebarPanel';

interface SidebarProject {
  id: string;
  name: string;       // truncated to 14 chars in display
  type: string;
  status: string;     // 'active'|'paused'|'stable'|'complete'|'planning'|'blocked'
  progress: number;   // 0-100, displayed as right-padded 4-char " 75%"
  focus?: string;
  path?: string;
  next?: string;
}

<SidebarPanel
  projects={projects}        // required
  selectedIndex={idx}        // controlled
  onSelect={setIdx}          // called on j/k navigation
  onSelectProject={openFn}   // called on Enter
  isActive={isActive}        // j/k/Enter no-ops when false
  pendingCaptures={5}        // 📥 badge in header, optional
  activeProjectId="abc"      // ⏱ on matching row, optional
/>
```

**Display contract:**
- Row: `● atlas   75%` — icon(1) + space + name(14) + progress(4)
- 12-row window, scroll indicator `1-12/N` when N > 12
- Header border: `cyan` when `isActive`, `gray` when not

### InspectorPanel props

```typescript
import { InspectorPanel, InspectorProject } from '../components/InspectorPanel';

interface InspectorProject {
  id: string;
  name: string;       // truncated to 18 chars
  type: string;
  status: string;
  progress: number;   // drives 8-char ████░░░░ bar
  focus?: string;     // truncated to 22 chars
  next?: string;      // comma/newline split, max 3 items, each truncated to 20
}

<InspectorPanel
  project={selectedProject}  // undefined → empty state
  isActive={active}          // Space/r keys guarded by this
  sessionSeconds={300}       // > 0 shows live Pomodoro timer
  pomodoroLength={25}        // block length in minutes, default 25
  breadcrumbs={crumbs}       // string[], newest-first, max 3 shown
/>
```

**Pomodoro mini-timer:**
- Live tick via `useEffect` + `setInterval(1000)`
- States: `● FOCUSING` (green) → `◑ PAUSED` (yellow) → `☕ BREAK TIME` (yellow)
- `Space` toggles pause, `r` resets (both guarded by `isActive`)
- Timer resets automatically when `sessionSeconds` prop changes

---

## Error Handling

```javascript
try {
  await atlas.sessions.start('nonexistent');
} catch (error) {
  if (error.code === 'PROJECT_NOT_FOUND') {
    console.log('Project does not exist');
  } else if (error.code === 'SESSION_ACTIVE') {
    console.log('Another session is already active');
  } else {
    throw error;
  }
}
```

**Error Codes:**
- `PROJECT_NOT_FOUND` - Project doesn't exist
- `SESSION_ACTIVE` - Session already in progress
- `NO_ACTIVE_SESSION` - No session to end
- `VALIDATION_ERROR` - Invalid data

---

## TypeScript Support

Atlas includes TypeScript definitions:

```typescript
import { Atlas, Project, Session, Capture } from '@data-wise/atlas';

const atlas = new Atlas({
  storage: 'sqlite'
});

const project: Project = await atlas.projects.get('myproject');
const session: Session = await atlas.sessions.start('myproject');
const captures: Capture[] = await atlas.capture.inbox();
```

---

## Best Practices

### Always Close Atlas

```javascript
// When using SQLite, always close to flush data
try {
  // ... use atlas
} finally {
  atlas.close();
}
```

### Handle Active Sessions

```javascript
// Check for existing session before starting
const current = await atlas.sessions.current();
if (current) {
  console.log(`Already working on: ${current.project}`);
} else {
  await atlas.sessions.start('myproject');
}
```

### Use Context for Recovery

```javascript
// Restore context after interruption
const ctx = await atlas.context.where('myproject');

console.log('Last focus:', ctx.focus);
console.log('Recent breadcrumbs:');
ctx.recentCrumbs.forEach(c => console.log(`  - ${c.text}`));
```

---

## Presenter Utilities

Atlas exports formatting utilities for building custom UIs:

### ProjectPresenter (UI-agnostic)

```javascript
import {
  formatTimeAgo,
  formatDuration,
  truncateText,
  formatProjectStatus,
  formatSessionStatus
} from '@data-wise/atlas/presenters';

// Format relative time
formatTimeAgo(new Date('2024-01-15')); // "2 days ago"

// Format duration
formatDuration(125); // "2h 5m"

// Truncate with ellipsis
truncateText('Long project name', 10); // "Long pr..."
```

### TuiPresenter (Terminal UI)

For blessed/terminal UIs with color tags:

```javascript
import {
  sparkline,
  progressBar,
  getStatusIcon,
  formatProjectName,
  themes
} from '@data-wise/atlas/presenters';

// Create sparkline chart
sparkline([1, 2, 5, 3, 4]); // "▁▂█▃▄"

// Progress bar with colors
progressBar(75, 20); // "{green-fg}███████████████{/}..."

// Status icons
getStatusIcon('active');  // "{green-fg}●{/}"
getStatusIcon('blocked'); // "{red-fg}✖{/}"

// Available themes
console.log(themes.default.primary); // "blue"
console.log(themes.dark.primary);    // "magenta"
```

### Ink Component Status Icons (v0.9.1)

All three panel components share a common status icon / colour contract:

```typescript
// Same mapping in SidebarPanel.tsx, InspectorPanel.tsx, and DetailView.tsx
const STATUS_ICON = {
  active:   '●',   // green
  paused:   '◐',   // yellow
  stable:   '◆',   // cyan
  complete: '✓',   // gray
  planning: '○',   // blue
  blocked:  '✗',   // red
};
```

---

## See Also

- [CLI Reference](./CLI-REFERENCE.md)
- [Architecture](./ARCHITECTURE.md)
- [Configuration](./CONFIGURATION.md)
