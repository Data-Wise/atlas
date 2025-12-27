# Atlas Architecture

Atlas follows **Clean Architecture** principles, ensuring separation of concerns, testability, and maintainability.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI / Dashboard                          │
│                    (bin/atlas.js, src/cli/)                      │
├─────────────────────────────────────────────────────────────────┤
│                          Adapters                                │
│         Controllers, Repositories, Gateways, Events             │
├─────────────────────────────────────────────────────────────────┤
│                         Use Cases                                │
│              Application Business Logic (atomic ops)             │
├─────────────────────────────────────────────────────────────────┤
│                          Domain                                  │
│           Entities, Value Objects, Repository Interfaces         │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Diagram

```mermaid
graph TB
    subgraph "Presentation Layer"
        CLI[CLI Commands<br/>bin/atlas.js]
        Dashboard[TUI Dashboard<br/>src/cli/dashboard.js]
        API[Programmatic API<br/>src/index.js]
    end

    subgraph "Application Layer"
        UC_Project[Project Use Cases]
        UC_Session[Session Use Cases]
        UC_Capture[Capture Use Cases]
        UC_Context[Context Use Cases]
        UC_Registry[Registry Use Cases]
        UC_Status[Status Use Cases]
    end

    subgraph "Domain Layer"
        Entities[Entities<br/>Project, Session, Capture, Breadcrumb]
        ValueObjects[Value Objects<br/>ProjectType, SessionState]
        RepoInterfaces[Repository Interfaces]
        Validators[Validators]
    end

    subgraph "Infrastructure Layer"
        FSRepo[Filesystem Repositories<br/>JSON files]
        SQLRepo[SQLite Repositories]
        StatusGateway[StatusFile Gateway<br/>.STATUS parser]
        EventPub[Event Publisher]
        Config[Configuration]
    end

    CLI --> UC_Project
    CLI --> UC_Session
    Dashboard --> UC_Project
    Dashboard --> UC_Session
    API --> UC_Project
    API --> UC_Session

    UC_Project --> Entities
    UC_Session --> Entities
    UC_Capture --> Entities
    UC_Context --> Entities

    UC_Project --> RepoInterfaces
    UC_Session --> RepoInterfaces

    FSRepo -.-> RepoInterfaces
    SQLRepo -.-> RepoInterfaces
    StatusGateway --> Entities
```

## Directory Structure

```
src/
├── domain/                      # Core business logic (no dependencies)
│   ├── entities/               # Business entities
│   │   ├── Project.js          # Project entity with business rules
│   │   ├── Session.js          # Work session entity
│   │   ├── Capture.js          # Quick capture entity
│   │   ├── Breadcrumb.js       # Context marker entity
│   │   └── Task.js             # Task entity
│   ├── value-objects/          # Immutable value types
│   │   ├── ProjectType.js      # Project type classification
│   │   ├── SessionState.js     # Session lifecycle states
│   │   └── TaskPriority.js     # Task priority levels
│   ├── repositories/           # Repository interfaces (contracts)
│   │   ├── IProjectRepository.js
│   │   ├── ISessionRepository.js
│   │   ├── ICaptureRepository.js
│   │   └── IBreadcrumbRepository.js
│   ├── validators/             # Domain validation
│   │   └── StatusFileValidator.js
│   └── events/                 # Domain events
│       └── SessionEvent.js
│
├── use-cases/                   # Application business logic
│   ├── project/                # Project management
│   │   ├── ScanProjectsUseCase.js
│   │   ├── GetStatusUseCase.js
│   │   └── GetRecentProjectsUseCase.js
│   ├── session/                # Session management
│   │   ├── CreateSessionUseCase.js
│   │   └── EndSessionUseCase.js
│   ├── capture/                # Quick capture
│   │   ├── CaptureIdeaUseCase.js
│   │   ├── GetInboxUseCase.js
│   │   └── TriageInboxUseCase.js
│   ├── context/                # Context management
│   │   ├── GetContextUseCase.js
│   │   ├── LogBreadcrumbUseCase.js
│   │   ├── GetTrailUseCase.js
│   │   ├── ParkContextUseCase.js
│   │   └── UnparkContextUseCase.js
│   ├── registry/               # Project registry
│   │   ├── SyncRegistryUseCase.js
│   │   └── RegisterProjectUseCase.js
│   └── status/                 # Status updates
│       ├── UpdateStatusUseCase.js
│       └── UpdateStatusFileUseCase.js
│
├── adapters/                    # External interfaces
│   ├── repositories/           # Repository implementations
│   │   ├── FileSystemProjectRepository.js
│   │   ├── FileSystemSessionRepository.js
│   │   ├── FileSystemCaptureRepository.js
│   │   ├── FileSystemBreadcrumbRepository.js
│   │   ├── SQLiteProjectRepository.js
│   │   ├── SQLiteSessionRepository.js
│   │   ├── SQLiteCaptureRepository.js
│   │   └── SQLiteBreadcrumbRepository.js
│   ├── gateways/               # External system interfaces
│   │   └── StatusFileGateway.js
│   ├── controllers/            # Presentation controllers
│   │   └── StatusController.js
│   ├── events/                 # Event infrastructure
│   │   └── SimpleEventPublisher.js
│   └── Container.js            # Dependency injection container
│
├── cli/                         # Command-line interface
│   ├── dashboard.js            # TUI dashboard entry
│   └── dashboard/              # Dashboard components
│       ├── DashboardState.js
│       ├── TimerManager.js
│       └── ...
│
├── utils/                       # Shared utilities
│   ├── Config.js               # Configuration management
│   ├── StreakCalculator.js     # Streak tracking
│   ├── CelebrationHelper.js    # ADHD-friendly celebrations
│   ├── TimeBlindnessHelper.js  # Time awareness
│   ├── ContextRestorationHelper.js
│   ├── SessionCompletionHelper.js
│   ├── ProjectScanCache.js     # Caching
│   ├── MRUTracker.js           # Most recently used
│   ├── ProjectFilters.js       # Filtering
│   ├── ascii-charts.js         # ASCII visualizations
│   └── migrate.js              # Storage migration
│
├── templates/                   # Project templates
│   └── index.js                # Template system
│
└── index.js                     # Main export (Atlas class)

bin/
└── atlas.js                     # CLI entry point (Commander.js)
```

## Data Flow

### Session Start Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant CreateSessionUC as CreateSession UseCase
    participant SessionRepo as Session Repository
    participant ProjectRepo as Project Repository
    participant EventPub as Event Publisher

    User->>CLI: atlas session start myproject
    CLI->>CreateSessionUC: execute({ project: 'myproject' })
    CreateSessionUC->>SessionRepo: findActive()
    SessionRepo-->>CreateSessionUC: null (no active)
    CreateSessionUC->>CreateSessionUC: Create Session entity
    CreateSessionUC->>SessionRepo: save(session)
    CreateSessionUC->>ProjectRepo: findByName('myproject')
    ProjectRepo-->>CreateSessionUC: project
    CreateSessionUC->>ProjectRepo: update(project.touch())
    CreateSessionUC->>EventPub: publish(SessionStarted)
    CreateSessionUC-->>CLI: session
    CLI-->>User: Session started for myproject
```

### Project Sync Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant SyncUC as SyncRegistry UseCase
    participant Scanner as Project Scanner
    participant Gateway as StatusFile Gateway
    participant ProjectRepo as Project Repository

    User->>CLI: atlas sync
    CLI->>SyncUC: execute({ paths: [...] })

    loop Each scan path
        SyncUC->>Scanner: scan(path)
        Scanner-->>SyncUC: directories with .STATUS
    end

    loop Each .STATUS file
        SyncUC->>Gateway: read(path)
        Gateway-->>SyncUC: parsed status data
        SyncUC->>SyncUC: Create/Update Project entity
        SyncUC->>ProjectRepo: save(project)
    end

    SyncUC-->>CLI: { added, updated, unchanged }
    CLI-->>User: Synced X projects
```

## Domain Entities

### Project Entity

```mermaid
classDiagram
    class Project {
        +String id
        +String name
        +ProjectType type
        +String path
        +String description
        +String[] tags
        +Object metadata
        +Date createdAt
        +Date lastAccessedAt
        +Number totalSessions
        +Number totalDuration

        +validate() ValidationResult
        +touch() void
        +recordSession(duration) void
        +getAverageSessionDuration() Number
        +isRecentlyAccessed(hours) Boolean
        +hasTag(tag) Boolean
        +addTag(tag) void
        +removeTag(tag) void
        +getSummary() Object
        +matchesSearch(query) Boolean
    }

    class ProjectType {
        <<value object>>
        +String value
        +String icon
        +String displayName
        +equals(other) Boolean
        +toString() String
    }

    Project --> ProjectType
```

### Session Entity

```mermaid
classDiagram
    class Session {
        +String id
        +String project
        +String task
        +String branch
        +Date startTime
        +Date endTime
        +Date pausedAt
        +SessionState state
        +String outcome
        +Object context

        +validate() ValidationResult
        +end(outcome) void
        +pause() void
        +resume() void
        +getDuration() Number
        +getActiveDuration() Number
        +isInFlowState() Boolean
        +updateContext(updates) void
        +getEvents() DomainEvent[]
        +getSummary() Object
    }

    class SessionState {
        <<value object>>
        +String value
        +isActive() Boolean
        +isPaused() Boolean
        +isEnded() Boolean
    }

    Session --> SessionState
```

### Capture Entity

```mermaid
classDiagram
    class Capture {
        +String id
        +String text
        +CaptureType type
        +CaptureStatus status
        +String project
        +String[] tags
        +Object context
        +Date createdAt
        +Date triagedAt

        +triage(options) void
        +archive() void
        +assignToProject(project) void
        +addContext(key, value) void
        +addTag(tag) void
        +getAge() String
        +toJSON() Object
        +fromJSON(data) Capture
    }

    class CaptureType {
        <<enumeration>>
        idea
        task
        bug
        note
        question
        parked
    }

    class CaptureStatus {
        <<enumeration>>
        inbox
        triaged
        archived
        parked
    }
```

## Repository Pattern

```mermaid
classDiagram
    class IProjectRepository {
        <<interface>>
        +findById(id) Project
        +findByName(name) Project
        +findByPath(path) Project
        +findAll() Project[]
        +findRecent(hours, limit) Project[]
        +findTopByDuration(limit) Project[]
        +save(project) void
        +delete(id) void
    }

    class FileSystemProjectRepository {
        -String filePath
        -Object cache
        +findById(id) Project
        +findByName(name) Project
        +save(project) void
    }

    class SQLiteProjectRepository {
        -Database db
        +findById(id) Project
        +findByName(name) Project
        +save(project) void
    }

    IProjectRepository <|.. FileSystemProjectRepository
    IProjectRepository <|.. SQLiteProjectRepository
```

## Storage Backends

### Filesystem (Default)

```
~/.atlas/
├── projects.json        # Project registry
├── sessions.json        # Session history
├── captures.json        # Captured items
├── breadcrumbs.json     # Breadcrumb trail
├── config.json          # Configuration
└── templates/           # Custom templates
    └── *.md             # Template files
```

### SQLite

```
~/.atlas/
└── atlas.db             # Single database file
    ├── projects         # Projects table
    ├── sessions         # Sessions table
    ├── captures         # Captures table
    └── breadcrumbs      # Breadcrumbs table
```

## Dependency Injection

Atlas uses manual dependency injection via the Container class:

```javascript
// src/adapters/Container.js
export class Container {
  constructor(options = {}) {
    this.storage = options.storage || 'filesystem'
    this.configPath = options.configPath || '~/.atlas'
    this._instances = new Map()
  }

  resolve(name) {
    if (!this._instances.has(name)) {
      this._instances.set(name, this._create(name))
    }
    return this._instances.get(name)
  }

  _create(name) {
    switch (name) {
      case 'ProjectRepository':
        return this.storage === 'sqlite'
          ? new SQLiteProjectRepository(this.configPath)
          : new FileSystemProjectRepository(this.configPath)
      // ... other repositories
    }
  }
}
```

## Event System

Domain events are published for cross-cutting concerns:

```mermaid
flowchart LR
    UseCase[Use Case] -->|publish| EventPublisher
    EventPublisher -->|notify| Handler1[Metrics Handler]
    EventPublisher -->|notify| Handler2[Notification Handler]
    EventPublisher -->|notify| Handler3[Streak Handler]
```

**Event Types:**
- `SessionStarted` - When a session begins
- `SessionEnded` - When a session ends
- `SessionPaused` - When a session is paused
- `CaptureCreated` - When an item is captured
- `ProjectUpdated` - When project status changes

## ADHD-Friendly Features Architecture

```mermaid
graph TB
    subgraph "ADHD Helpers"
        Streak[StreakCalculator]
        Time[TimeBlindnessHelper]
        Celebrate[CelebrationHelper]
        Context[ContextRestorationHelper]
        Complete[SessionCompletionHelper]
    end

    subgraph "Integration Points"
        SessionStart[Session Start]
        SessionEnd[Session End]
        Dashboard[Dashboard Display]
    end

    SessionStart --> Context
    SessionStart --> Streak
    SessionEnd --> Celebrate
    SessionEnd --> Complete
    Dashboard --> Streak
    Dashboard --> Time
```

## Template System

```mermaid
flowchart TD
    subgraph "Template Sources"
        BuiltIn[Built-in Templates<br/>src/templates/]
        Custom[Custom Templates<br/>~/.atlas/templates/]
    end

    subgraph "Template Processing"
        Load[Load Template]
        Parse[Parse Frontmatter]
        Inherit[Apply Inheritance]
        Variables[Replace Variables]
    end

    subgraph "Output"
        STATUS[.STATUS File]
    end

    BuiltIn --> Load
    Custom --> Load
    Load --> Parse
    Parse --> Inherit
    Inherit --> Variables
    Variables --> STATUS
```

**Template Variables:**
- `{{name}}` - Project name
- `{{date}}` - Current date
- `{{author}}` - From config
- `{{github_user}}` - From config
- `{{parent}}` - Parent template content (for inheritance)

## Testing Architecture

```
test/
├── unit/                    # Unit tests (isolated)
│   ├── domain/             # Entity tests
│   ├── use-cases/          # Use case tests
│   └── utils/              # Utility tests
├── integration/            # Integration tests
│   ├── repositories/       # Repository tests
│   └── *.test.js          # Feature tests
├── e2e/                    # End-to-end tests
│   └── cli.test.js        # CLI command tests
└── dogfood-noninteractive.sh  # Dogfood script (71 tests)
```

## Performance Considerations

### Caching

```javascript
// ProjectScanCache for directory scanning
const cache = new ProjectScanCache({
  maxSize: 100,        // Max entries
  ttlMs: 5 * 60 * 1000 // 5 minute TTL
})
```

### Lazy Loading

- Repositories load data on first access
- SQLite uses prepared statements
- Dashboard uses virtual rendering

### Parallel Operations

- Directory scanning runs in parallel
- Multiple scan paths processed concurrently

## See Also

- [CLI Reference](./CLI-REFERENCE.md)
- [API Guide](./API-GUIDE.md)
- [Configuration](./CONFIGURATION.md)
