# Atlas CLI - Architecture Diagrams

This document contains comprehensive Mermaid diagrams visualizing the Atlas CLI architecture, data flows, and system interactions.

---

## 1. System Architecture (Clean Architecture Layers)

```mermaid
graph TB
    subgraph "CLI / Presentation Layer"
        CLI["CLI Entry Point<br/>bin/atlas.js<br/>(Commander.js)"]
        Dashboard["TUI Dashboard<br/>src/cli/dashboard.js"]
        API["Programmatic API<br/>src/index.js"]
    end

    subgraph "Controller / Adapter Layer"
        StatusCtl["Status Controller<br/>CLI Output Formatting"]
        FSGateway["Status File Gateway<br/>.STATUS Parser"]
        EventPub["Event Publisher<br/>Event Dispatch"]
    end

    subgraph "Use Case / Application Logic Layer"
        ProjectUC["Project Use Cases<br/>Scan, Status,<br/>Recent, Register"]
        SessionUC["Session Use Cases<br/>Create, End"]
        CaptureUC["Capture Use Cases<br/>Capture, Triage<br/>Get Inbox"]
        ContextUC["Context Use Cases<br/>Log Breadcrumb,<br/>Get Trail,<br/>Park/Unpark"]
        RegistryUC["Registry Use Cases<br/>Sync, Register"]
        StatusUC["Status Use Cases<br/>Update Status<br/>Update Status File"]
    end

    subgraph "Domain / Entity Layer"
        Project["Project<br/>Core Entity"]
        Session["Session<br/>Core Entity"]
        Capture["Capture<br/>Core Entity"]
        Breadcrumb["Breadcrumb<br/>Core Entity"]
        Task["Task<br/>Core Entity"]
        RepoIface["Repository<br/>Interfaces<br/>IProject, ISession,<br/>ICapture, IBreadcrumb"]
        ValueObj["Value Objects<br/>ProjectType,<br/>SessionState"]
        Validators["Domain Validators<br/>StatusFileValidator"]
    end

    subgraph "Repository / Infrastructure Layer"
        FSRepo["FileSystem<br/>Repositories<br/>JSON Storage"]
        SQLiteRepo["SQLite<br/>Repositories<br/>DB Storage"]
        Config["Configuration<br/>Config Management"]
    end

    CLI --> StatusCtl
    CLI --> ProjectUC
    CLI --> SessionUC
    CLI --> CaptureUC
    Dashboard --> ProjectUC
    Dashboard --> SessionUC
    API --> ProjectUC
    API --> SessionUC

    ProjectUC --> Project
    SessionUC --> Session
    CaptureUC --> Capture
    ContextUC --> Breadcrumb
    ProjectUC --> RepoIface
    SessionUC --> RepoIface
    CaptureUC --> RepoIface

    FSGateway --> Validators
    FSGateway --> Project
    EventPub --> ProjectUC
    EventPub --> SessionUC

    RepoIface -.->|implements| FSRepo
    RepoIface -.->|implements| SQLiteRepo

    FSRepo --> Config
    SQLiteRepo --> Config
    ProjectUC --> ValueObj
    SessionUC --> ValueObj

    style CLI fill:#e1f5ff
    style Dashboard fill:#e1f5ff
    style API fill:#e1f5ff
    style ProjectUC fill:#f3e5f5
    style SessionUC fill:#f3e5f5
    style CaptureUC fill:#f3e5f5
    style ContextUC fill:#f3e5f5
    style Project fill:#e8f5e9
    style Session fill:#e8f5e9
    style Capture fill:#e8f5e9
    style FSRepo fill:#fff3e0
    style SQLiteRepo fill:#fff3e0
```

**Layers Explained:**

- **Presentation:** CLI, Dashboard, and programmatic API interfaces
- **Controllers/Adapters:** Convert between presentation and business logic
- **Use Cases:** Atomic application operations (Session Start, Capture Idea, etc.)
- **Domain:** Core entities and business rules
- **Infrastructure:** Storage backends (Filesystem JSON or SQLite) and configuration

---

## 2. Data Flow - Complete Session Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant CLI as CLI
    participant SessionUC as Session<br/>Use Case
    participant ProjectRepo as Project<br/>Repository
    participant SessionRepo as Session<br/>Repository
    participant BreadcrumbRepo as Breadcrumb<br/>Repository
    participant CaptureRepo as Capture<br/>Repository
    participant EventPub as Event<br/>Publisher
    participant FSOrDB as Storage<br/>FileSystem/SQLite

    User->>CLI: atlas session start project-name

    CLI->>SessionUC: execute({ project: 'project-name' })

    SessionUC->>SessionRepo: findActive()
    SessionRepo->>FSOrDB: load sessions.json / query db
    FSOrDB-->>SessionRepo: current sessions
    SessionRepo-->>SessionUC: null or active session

    alt No active session
        SessionUC->>ProjectRepo: findByName('project-name')
        ProjectRepo->>FSOrDB: load projects.json / query db
        FSOrDB-->>ProjectRepo: project data
        ProjectRepo-->>SessionUC: Project entity

        SessionUC->>SessionUC: Create Session entity<br/>state: ACTIVE, startTime: now

        SessionUC->>SessionRepo: save(session)
        SessionRepo->>FSOrDB: write to storage
        FSOrDB-->>SessionRepo: ✓ saved

        SessionUC->>ProjectRepo: update(project.touch())
        ProjectRepo->>FSOrDB: write updated project

        SessionUC->>EventPub: publish(SessionStarted)
        EventPub-->>EventPub: Notify handlers<br/>Streak, Notification, etc.

        SessionUC-->>CLI: session object
        CLI-->>User: Session started for project-name
    else Active session exists
        CLI-->>User: Session already active
    end

    User->>CLI: atlas context breadcrumb "working on feature X"
    CLI->>BreadcrumbRepo: save(breadcrumb)
    BreadcrumbRepo->>FSOrDB: append to breadcrumbs.json / insert db

    User->>CLI: atlas capture "idea for refactoring"
    CLI->>CaptureUC: execute({ text: 'idea...', type: 'idea' })
    CaptureUC->>CaptureRepo: save(capture)
    CaptureRepo->>FSOrDB: write to storage
    EventPub->>EventPub: publish(CaptureCreated)

    User->>CLI: atlas session end "completed feature"
    CLI->>SessionUC: execute({ outcome: 'completed feature' })

    SessionUC->>SessionRepo: findActive()
    SessionRepo-->>SessionUC: active session

    SessionUC->>SessionUC: Update session<br/>state: ENDED, endTime: now, outcome: text

    SessionUC->>SessionRepo: save(session)
    SessionRepo->>FSOrDB: write updated session

    SessionUC->>ProjectRepo: update(project.recordSession(duration))
    ProjectRepo->>FSOrDB: write updated project stats

    SessionUC->>EventPub: publish(SessionEnded)
    EventPub-->>EventPub: Streak calculation<br/>Celebration notification

    SessionUC-->>CLI: session summary
    CLI-->>User: Session ended. Awesome work!
```

**Key Points:**
- Session lifecycle flows through Use Cases → Domain Entities → Repositories
- Each write operation persists to storage (Filesystem JSON or SQLite)
- Domain events trigger cross-cutting concerns (streak, notifications, etc.)
- Breadcrumbs and Captures are logged independently during session

---

## 3. Entity Relationship Diagram

```mermaid
erDiagram
    PROJECT ||--o{ SESSION : has
    PROJECT ||--o{ CAPTURE : receives
    PROJECT ||--o{ BREADCRUMB : logs
    PROJECT ||--o{ TASK : contains

    SESSION ||--o{ BREADCRUMB : "logs during"
    SESSION ||--o{ CAPTURE : "may create"

    PROJECT {
        string id PK
        string name UK
        string type
        string path UK
        string description
        string[] tags
        object metadata
        datetime createdAt
        datetime lastAccessedAt
        number totalSessions
        number totalDuration
    }

    SESSION {
        string id PK
        string project FK
        string task
        string branch
        datetime startTime
        datetime endTime
        datetime pausedAt
        string state
        string outcome
        object context
    }

    CAPTURE {
        string id PK
        string text
        string type
        string status
        string project FK
        string[] tags
        object context
        datetime createdAt
        datetime triagedAt
    }

    BREADCRUMB {
        string id PK
        string sessionId FK
        string text
        string project FK
        object context
        datetime createdAt
    }

    TASK {
        string id PK
        string project FK
        string description
        string status
        string priority
        datetime dueDate
        string assignee
    }
```

**Relationships:**
- **1:N (Project → Session):** Each project has multiple sessions
- **1:N (Project → Capture):** Each project receives multiple captures
- **1:N (Project → Breadcrumb):** Each project logs multiple breadcrumbs
- **1:N (Project → Task):** Each project contains multiple tasks
- **1:N (Session → Breadcrumb):** Each session logs multiple breadcrumbs
- **1:N (Session → Capture):** Sessions may trigger captures

---

## 4. Session State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Active: start()

    Active --> Paused: pause()
    Active --> Ended: end(outcome)
    Active --> Active: logBreadcrumb()<br/>captureIdea()

    Paused --> Active: resume()
    Paused --> Ended: end(outcome)
    Paused --> Idle: abandon()

    Ended --> [*]

    Idle --> Parked: park()
    Parked --> Idle: unpark()
    Parked --> [*]

    note right of Idle
        No active session
        Ready to start new work
    end note

    note right of Active
        Session in progress
        Can log breadcrumbs,
        capture ideas, pause
    end note

    note right of Paused
        Session temporarily paused
        Can resume or end
    end note

    note right of Ended
        Session completed
        Final state - immutable
    end note

    note right of Parked
        Context preserved
        Session suspended
        Can be unparked later
    end note
```

**State Transitions:**
- **Idle → Active:** Start work session
- **Active → Paused:** Take a break (preserves start time)
- **Active → Ended:** Complete work (calculates duration)
- **Paused → Active:** Resume work
- **Active/Paused → Parked:** Save context for later
- **Parked → Unparked:** Restore context

---

## 5. CLI Command Tree

```mermaid
graph TD
    Atlas["atlas<br/>CLI Root"]

    %% Session Commands
    Atlas -->|session| Session["session<br/>Work session mgmt"]
    Session -->|start| SStart["start PROJECT<br/>Start new session"]
    Session -->|end| SEnd["end [OUTCOME]<br/>End active session"]
    Session -->|status| SStatus["status<br/>Show active session"]
    Session -->|pause| SPause["pause<br/>Pause session"]
    Session -->|resume| SResume["resume<br/>Resume session"]
    Session -->|list| SList["list [PROJECT]<br/>List sessions"]

    %% Project Commands
    Atlas -->|project| Project["project<br/>Project management"]
    Project -->|list| PList["list [FILTER]<br/>List projects"]
    Project -->|status| PStatus["status PROJECT<br/>Show project status"]
    Project -->|find| PFind["find QUERY<br/>Search projects"]
    Project -->|recent| PRecent["recent [LIMIT]<br/>Recently accessed"]
    Project -->|top| PTop["top [LIMIT]<br/>By duration"]

    %% Capture Commands
    Atlas -->|capture| Capture["capture<br/>Quick capture"]
    Capture -->|idea| CIdea["idea TEXT<br/>Capture idea"]
    Capture -->|task| CTask["task TEXT<br/>Capture task"]
    Capture -->|bug| CBug["bug TEXT<br/>Capture bug"]
    Capture -->|note| CNote["note TEXT<br/>Capture note"]
    Capture -->|inbox| CInbox["inbox<br/>Show inbox"]
    Capture -->|triage| CTriage["triage ID [PROJECT]<br/>Assign to project"]

    %% Context Commands
    Atlas -->|context| Context["context<br/>Breadcrumb trail"]
    Context -->|log| CLog["log TEXT<br/>Log breadcrumb"]
    Context -->|trail| CTrail["trail [PROJECT]<br/>Show breadcrumb trail"]
    Context -->|park| CPark["park TEXT<br/>Park context"]
    Context -->|unpark| CUnpark["unpark ID<br/>Restore context"]
    Context -->|parked| CParked["parked<br/>List parked contexts"]

    %% Config Commands
    Atlas -->|config| Config["config<br/>Configuration"]
    Config -->|show| CShow["show<br/>Show config"]
    Config -->|set| CSet["set KEY VALUE<br/>Set config value"]
    Config -->|init| CInit["init<br/>Initialize config"]
    Config -->|storage| CStorage["storage [TYPE]<br/>Choose storage backend"]

    %% Registry Commands
    Atlas -->|sync| Sync["sync [PATHS...]<br/>Sync project registry"]
    Atlas -->|register| Register["register PROJECT PATH<br/>Register project"]

    %% Info Commands
    Atlas -->|status| Info["status<br/>System status"]
    Atlas -->|dashboard| Dashboard["dashboard<br/>TUI Dashboard"]
    Atlas -->|version| Version["version<br/>Show version"]
    Atlas -->|help| Help["help [COMMAND]<br/>Show help"]

    style Atlas fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    style Session fill:#f3e5f5,stroke:#4a148c
    style Project fill:#f3e5f5,stroke:#4a148c
    style Capture fill:#f3e5f5,stroke:#4a148c
    style Context fill:#f3e5f5,stroke:#4a148c
    style Config fill:#f3e5f5,stroke:#4a148c
    style SStart fill:#e8f5e9,stroke:#1b5e20
    style SEnd fill:#e8f5e9,stroke:#1b5e20
    style CIdea fill:#e8f5e9,stroke:#1b5e20
    style CInbox fill:#e8f5e9,stroke:#1b5e20
    style CLog fill:#e8f5e9,stroke:#1b5e20
    style CTrail fill:#e8f5e9,stroke:#1b5e20
    style Sync fill:#fff3e0,stroke:#e65100
    style Register fill:#fff3e0,stroke:#e65100
```

**Command Groups:**

1. **Session:** Session lifecycle management (start, end, pause, resume)
2. **Project:** Project discovery and metadata
3. **Capture:** Quick capture (inbox system for ideas, tasks, bugs, notes)
4. **Context:** Breadcrumb trail for tracking work context
5. **Config:** Configuration management and storage backend selection
6. **Registry:** Project discovery and registration
7. **Info:** System information and UI

---

## 6. Repository Pattern & Storage Abstraction

```mermaid
graph TB
    subgraph "Use Case Layer"
        UC["Use Cases<br/>ProjectUC, SessionUC,<br/>CaptureUC, etc."]
    end

    subgraph "Domain Layer"
        IRepo["Repository Interfaces<br/>IProjectRepository<br/>ISessionRepository<br/>ICaptureRepository<br/>IBreadcrumbRepository"]
    end

    subgraph "Adapter Layer - Filesystem"
        FSProj["FileSystemProjectRepository<br/>~/.atlas/projects.json"]
        FSSess["FileSystemSessionRepository<br/>~/.atlas/sessions.json"]
        FSCap["FileSystemCaptureRepository<br/>~/.atlas/captures.json"]
        FSBread["FileSystemBreadcrumbRepository<br/>~/.atlas/breadcrumbs.json"]
    end

    subgraph "Adapter Layer - SQLite"
        SQLProj["SQLiteProjectRepository<br/>~/.atlas/atlas.db<br/>projects table"]
        SQLSess["SQLiteSessionRepository<br/>~/.atlas/atlas.db<br/>sessions table"]
        SQLCap["SQLiteCaptureRepository<br/>~/.atlas/atlas.db<br/>captures table"]
        SQLBread["SQLiteBreadcrumbRepository<br/>~/.atlas/atlas.db<br/>breadcrumbs table"]
    end

    subgraph "Infrastructure Layer"
        FS["FileSystem<br/>read/write JSON files"]
        DB["SQLite Database<br/>SQL queries"]
    end

    subgraph "Dependency Injection"
        Container["Container<br/>storage: 'filesystem'|'sqlite'<br/>resolve(name) → instance"]
    end

    UC -->|depends on| IRepo
    IRepo -.->|implements| FSProj
    IRepo -.->|implements| FSSess
    IRepo -.->|implements| FSCap
    IRepo -.->|implements| FSBread
    IRepo -.->|implements| SQLProj
    IRepo -.->|implements| SQLSess
    IRepo -.->|implements| SQLCap
    IRepo -.->|implements| SQLBread

    FSProj --> FS
    FSSess --> FS
    FSCap --> FS
    FSBread --> FS

    SQLProj --> DB
    SQLSess --> DB
    SQLCap --> DB
    SQLBread --> DB

    Container -->|creates| FSProj
    Container -->|creates| FSSess
    Container -->|creates| SQLProj
    Container -->|creates| SQLSess

    style UC fill:#f3e5f5
    style IRepo fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style FSProj fill:#fff3e0
    style FSSess fill:#fff3e0
    style SQLProj fill:#fff3e0
    style SQLSess fill:#fff3e0
    style Container fill:#e1f5ff
```

**Key Pattern Elements:**

- **Repositories:** Abstract interface between Use Cases and storage
- **Multiple Implementations:** Filesystem (JSON) and SQLite backends both implement the same interface
- **Dependency Injection:** Container decides which implementation to instantiate
- **Storage Agnostic:** Use Cases don't care about storage backend

---

## 7. Event System Architecture

```mermaid
graph LR
    subgraph "Event Sources"
        ProjectUC["Project<br/>Use Cases"]
        SessionUC["Session<br/>Use Cases"]
        CaptureUC["Capture<br/>Use Cases"]
        ContextUC["Context<br/>Use Cases"]
    end

    subgraph "Event Publication"
        EventPub["Event Publisher<br/>SimpleEventPublisher"]
        EventTypes["Event Types<br/>SessionStarted<br/>SessionEnded<br/>SessionPaused<br/>CaptureCreated<br/>ProjectUpdated"]
    end

    subgraph "Event Handlers"
        StreakHandler["Streak Handler<br/>Calculate streaks<br/>Update metrics"]
        NotifyHandler["Notification Handler<br/>User notifications<br/>Celebrations"]
        MetricsHandler["Metrics Handler<br/>Track usage<br/>Statistics"]
        ContextHandler["Context Handler<br/>Preserve context<br/>Restore on unpark"]
    end

    ProjectUC -->|publishes| EventPub
    SessionUC -->|publishes| EventPub
    CaptureUC -->|publishes| EventPub
    ContextUC -->|publishes| EventPub

    EventPub -->|emits| EventTypes
    EventTypes -->|notifies| StreakHandler
    EventTypes -->|notifies| NotifyHandler
    EventTypes -->|notifies| MetricsHandler
    EventTypes -->|notifies| ContextHandler

    StreakHandler -->|updates| DB1["Domain State"]
    NotifyHandler -->|displays| UI["User Interface"]
    MetricsHandler -->|logs| DB2["Analytics"]
    ContextHandler -->|preserves| DB3["Context State"]

    style EventPub fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style SessionUC fill:#f3e5f5
    style ProjectUC fill:#f3e5f5
    style StreakHandler fill:#e8f5e9
    style NotifyHandler fill:#e8f5e9
```

**Publish-Subscribe Pattern:**

- Use Cases publish domain events asynchronously
- Multiple handlers subscribe to events independently
- Decouples use cases from cross-cutting concerns (metrics, notifications, streak tracking)
- Events fire after entity state changes are persisted

---

## 8. Configuration & ADHD-Friendly Features

```mermaid
graph TB
    subgraph "Configuration System"
        Config["Configuration<br/>Config.js"]
        ConfigFile["~/.atlas/config.json<br/>User preferences"]
        Defaults["Default Config<br/>Built-in defaults"]
    end

    subgraph "ADHD Helper Utilities"
        Streak["StreakCalculator<br/>Track work streaks<br/>Celebrate consistency"]
        TimeBlind["TimeBlindnessHelper<br/>Visible timers<br/>Time awareness"]
        Celebrate["CelebrationHelper<br/>Positive feedback<br/>Encouragement"]
        Context["ContextRestoration<br/>Quick context switch<br/>Preserve state"]
        Complete["SessionCompletion<br/>Guided end-of-session<br/>Reflections"]
    end

    subgraph "Integration Points"
        SessionStart["Session Start Flow"]
        SessionEnd["Session End Flow"]
        Dashboard["Dashboard Display"]
        Capture["Capture System"]
    end

    Config -->|loads| ConfigFile
    Config -->|provides| Defaults
    Config -->|supplies| Streak
    Config -->|supplies| TimeBlind
    Config -->|supplies| Celebrate

    SessionStart -->|activates| Context
    SessionStart -->|activates| Streak
    SessionStart -->|displays| Dashboard

    SessionEnd -->|triggers| Celebrate
    SessionEnd -->|triggers| Complete
    SessionEnd -->|updates| Streak

    Dashboard -->|shows| Streak
    Dashboard -->|shows| TimeBlind
    Dashboard -->|shows| Celebrate

    Capture -->|preserves| Context

    style Config fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style Streak fill:#c8e6c9
    style TimeBlind fill:#c8e6c9
    style Celebrate fill:#c8e6c9
    style Context fill:#c8e6c9
    style Complete fill:#c8e6c9
```

**Configuration & Helpers:**

- Central `Config.js` manages all user preferences
- ADHD-friendly helpers integrate at key lifecycle points
- Helpers are optional and can be toggled via configuration
- Dashboard displays time awareness and streak information

---

## 9. Template System Flow

```mermaid
graph TD
    subgraph "Template Sources"
        BuiltIn["Built-in Templates<br/>src/templates/"]
        Custom["Custom Templates<br/>~/.atlas/templates/"]
        User["User Selection"]
    end

    subgraph "Template Processing"
        Load["Load Template File<br/>Markdown + Frontmatter"]
        Parse["Parse Frontmatter<br/>Extract metadata,<br/>config, inheritance"]
        Inherit["Apply Inheritance<br/>Load parent template<br/>if specified"]
        Variables["Replace Variables<br/>{{name}}, {{author}},<br/>{{date}}, etc."]
    end

    subgraph "Output"
        Status[".STATUS File<br/>Project root"]
    end

    subgraph "Registry Update"
        Register["Register in<br/>Project Registry"]
        Sync["Sync Registry<br/>Discover .STATUS"]
    end

    User -->|chooses| BuiltIn
    User -->|chooses| Custom

    BuiltIn --> Load
    Custom --> Load

    Load --> Parse
    Parse --> Inherit
    Inherit --> Variables
    Variables --> Status

    Status --> Register
    Status --> Sync

    style BuiltIn fill:#fff3e0
    style Custom fill:#fff3e0
    style Load fill:#f3e5f5
    style Parse fill:#f3e5f5
    style Variables fill:#f3e5f5
    style Status fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

**Template Variables:**
- `{{name}}` - Project name
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{author}}` - From config
- `{{github_user}}` - From config
- `{{parent}}` - Parent template content (inheritance)

---

## 10. Project Scanning & Registry Synchronization

```mermaid
graph TD
    User["User"]
    CLI["atlas sync"]
    ScanPaths["Scan Paths<br/>[paths from config]"]

    subgraph "Scanning Phase"
        Scanner["Directory Scanner"]
        FindStatus["Find .STATUS files<br/>Recursive scan"]
        Cache["Project Scan Cache<br/>5-minute TTL"]
    end

    subgraph "Processing Phase"
        Gateway["StatusFile Gateway<br/>.STATUS Parser"]
        Entities["Create/Update<br/>Project Entities"]
        Validation["Validate<br/>Domain Rules"]
    end

    subgraph "Persistence Phase"
        Repo["Project Repository<br/>FileSystem/SQLite"]
        Storage["Storage Backend<br/>projects.json / DB"]
    end

    subgraph "Result"
        Summary["Summary<br/>Added: N<br/>Updated: M<br/>Unchanged: P"]
    end

    User -->|runs| CLI
    CLI --> ScanPaths

    ScanPaths -->|scan each path| Scanner
    Scanner -->|find .STATUS| FindStatus
    FindStatus -->|cache results| Cache
    Cache -->|load from cache| Scanner

    Scanner -->|for each .STATUS| Gateway
    Gateway -->|parse YAML| Entities
    Entities -->|validate| Validation
    Validation -->|save| Repo
    Repo -->|write| Storage

    Storage -->|aggregate| Summary
    Summary -->|display| CLI
    CLI -->|output| User

    style CLI fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style FindStatus fill:#fff3e0
    style Cache fill:#e3f2fd
    style Gateway fill:#f3e5f5
    style Validation fill:#f3e5f5
    style Storage fill:#fff3e0
    style Summary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

---

## Diagram Reference Guide

| # | Diagram | Purpose | Key Use Case |
|---|---------|---------|--------------|
| 1 | System Architecture | Shows Clean Architecture layers | Understanding overall structure |
| 2 | Data Flow | Complete session lifecycle | How data moves through system |
| 3 | Entity Relationships | Database schema and cardinality | Understanding data model |
| 4 | Session State Machine | Possible session states | Session lifecycle management |
| 5 | CLI Command Tree | Command hierarchy | CLI navigation and usage |
| 6 | Repository Pattern | Storage abstraction | Understanding backend switching |
| 7 | Event System | Publish-subscribe pattern | Cross-cutting concerns |
| 8 | Configuration & ADHD Features | User preferences integration | ADHD-friendly features |
| 9 | Template System | Project template processing | Creating new projects |
| 10 | Scanning & Registry | Project discovery | Project synchronization |

---

## Rendering Notes

All diagrams use standard Mermaid syntax and should render correctly in:
- GitHub markdown (`.md` files)
- GitLab markdown
- Notion
- Mermaid Live Editor (mermaid.live)

To render locally, install Mermaid CLI:
```bash
npm install -g @mermaid-js/mermaid-cli
# Then convert diagrams to PNG/SVG:
mmdc -i docs/DIAGRAMS.md -o docs/diagrams-output.svg
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture explanation
- [CLI-REFERENCE.md](./CLI-REFERENCE.md) - Complete CLI command reference
- [API-GUIDE.md](./API-GUIDE.md) - Programmatic API usage
- [CONFIGURATION.md](./CONFIGURATION.md) - Configuration options
