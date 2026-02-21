# 📊 SFU Course Tracker - System Diagrams

This document contains UML and architectural diagrams for the SFU Course Tracker project.

---

## 🗄️ Database Schema (ERD) - 3NF Design

Shows the normalized database structure with relationships between entities.

```mermaid
erDiagram
    COURSE ||--o{ SECTION : "has many"
    SECTION ||--o{ WATCHER : "monitored by"
    USER ||--o{ WATCHER : "creates"
    
    COURSE {
        string id PK "CMPT-276"
        string dept "CMPT"
        string number "276"
        string title "Intro to Software Engineering"
        string description
        int credits "3"
        string prerequisites_raw
        json prerequisites_logic "Boolean tree"
    }
    
    SECTION {
        int id PK
        string course_id FK "→ COURSE.id"
        string term "Spring 2026"
        string section_code "D100"
        string instructor "Dr. Chan"
        json schedule_json "Time slots"
        string location "Burnaby"
        string delivery_method "In Person"
        int seats_total "120"
        int seats_enrolled "118"
        int waitlist_total "10"
        int waitlist_enrolled "5"
        datetime created_at
        datetime updated_at
    }
    
    WATCHER {
        int id PK
        string user_email FK "john@sfu.ca"
        int section_id FK "→ SECTION.id"
        bool is_active "true"
        datetime created_at
    }
    
    USER {
        int id PK
        string email UK "john@sfu.ca"
        string password "hashed"
        json completed_courses "[CMPT-120, CMPT-125]"
        json scheduled_courses "Saved schedule"
        datetime created_at
        datetime updated_at
    }
```

**Key Design Decisions:**
- **3NF Normalization**: Course metadata separated from Section instances
- **Foreign Keys**: `section_id` and `course_id` indexed for fast joins
- **JSON Columns**: `prerequisites_logic` stores recursive boolean trees, `completed_courses` stores user transcripts
- **Calculated Property**: `seats_available` computed as `seats_total - seats_enrolled`

---

## 🏗️ System Architecture - Docker Compose Stack

Shows the full-stack deployment architecture across Vercel (frontend) and AWS EC2 (backend).

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🌐 User Browser"]
    end
    
    subgraph "Frontend - Vercel"
        React["⚛️ React + TypeScript<br/>Vite Build"]
        Store["📦 Zustand Store<br/>(Course, Auth)"]
        Components["🎨 Components<br/>(Calendar, CourseList, Auth)"]
    end
    
    subgraph "Backend - AWS EC2"
        Nginx["🔒 Nginx<br/>(Reverse Proxy + SSL)"]
        
        subgraph "Docker Container"
            FastAPI["🚀 FastAPI<br/>(Python 3.12)"]
            Routers["📍 Routers<br/>(auth, courses, watchers, prerequisites)"]
            Services["⚙️ Services<br/>(parser, validator, worker)"]
            Crawler["🕷️ SFU API Crawler<br/>(Course Data Fetcher)"]
        end
        
        Database[("💾 SQLite<br/>sfu_scheduler.db")]
    end
    
    subgraph "External APIs"
        SFU["🏫 SFU Official APIs<br/>course-outlines<br/>courses.students.sfu.ca"]
    end
    
    Browser -->|HTTPS| React
    React --> Store
    Store --> Components
    Components -->|"REST API<br/>(JWT Auth)"| Nginx
    Nginx -->|Port 8000| FastAPI
    FastAPI --> Routers
    Routers --> Services
    Services --> Database
    Crawler -->|Scrapes| SFU
    Crawler -->|Updates| Database
    
    style Browser fill:#e1f5ff
    style React fill:#61dafb
    style FastAPI fill:#009688
    style Database fill:#ffa726
    style SFU fill:#cc0033
```

**Technology Stack:**
- **Frontend**: React 18 + TypeScript + Vite (deployed on Vercel)
- **Backend**: FastAPI + Python 3.12 (deployed on AWS EC2)
- **Proxy**: Nginx with Let's Encrypt SSL certificates
- **Database**: SQLite with WAL mode for concurrent reads
- **Containerization**: Docker Compose orchestration

---

## 🔄 User Flow - Course Search & Watch

Sequence diagram showing a typical user interaction from search to seat notification.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant API as FastAPI Backend
    participant Parser as Prerequisite Parser
    participant DB as SQLite Database
    participant Worker as Background Worker
    participant SFU as SFU API
    
    User->>Frontend: 1. Select "CMPT" department
    Frontend->>API: GET /api/v1/courses?dept=CMPT&term=spring&year=2026
    API->>DB: SELECT * FROM courses JOIN sections
    DB-->>API: Return CMPT courses
    API-->>Frontend: JSON: [{id, title, sections: [...]}]
    Frontend->>Frontend: Render CourseList
    
    User->>Frontend: 2. Click "Check Prerequisites" (CMPT-300)
    Frontend->>API: POST /api/v1/prerequisites/validate<br/>{target: "CMPT-300", transcript: ["CMPT-120", "CMPT-125"]}
    API->>DB: SELECT prerequisites_logic FROM courses
    DB-->>API: Return boolean tree
    API->>Parser: validate_tree(tree, completed_courses)
    Parser-->>Parser: Recursive AND/OR evaluation
    Parser-->>API: {is_valid: true, missing: []}
    API-->>Frontend: Valid ✅
    
    User->>Frontend: 3. Click "Watch this section" (D100)
    Frontend->>API: POST /api/v1/watchers<br/>{email: "user@sfu.ca", section_id: 42}
    API->>DB: INSERT INTO watchers
    DB-->>API: Success
    API-->>Frontend: Watcher created
    
    Note over Worker,SFU: Every 10 minutes
    Worker->>SFU: Scrape latest enrollment
    SFU-->>Worker: {enrolled: 115, total: 120}
    Worker->>DB: UPDATE sections SET seats_enrolled = 115
    Worker->>DB: SELECT * FROM watchers WHERE section_id = 42
    DB-->>Worker: [user@sfu.ca, jane@sfu.ca]
    Worker->>Worker: Check: seats_available = 5 > 0 ✅
    Worker->>User: 📧 Email: "Seat available in CMPT-300 D100!"
```

**Key Interactions:**
1. **Course Search**: Frontend filters by department, backend joins `courses` and `sections` tables
2. **Prerequisite Check**: Recursive parser evaluates boolean tree against user's transcript
3. **Watcher Creation**: Creates junction record between user and section
4. **Background Worker**: Scheduled task checks SFU API every 10 minutes, notifies watchers when seats open

---

## 🧠 Prerequisite Parser - Recursive Logic Tree

Illustrates how complex prerequisite strings are parsed into evaluable boolean trees.

```mermaid
graph TD
    Start["Raw String:<br/>'CMPT 120 and CMPT 125, or CMPT 130'"]
    
    Start --> Clean["1. Clean String<br/>Remove grade requirements<br/>Normalize AND/OR"]
    Clean --> Parse["2. Parse Expression<br/>Split by ' and '"]
    
    Parse --> AND1["AND Node"]
    AND1 --> Group1["'CMPT 120'"]
    AND1 --> Group2["'CMPT 125'"]
    AND1 --> Group3["'CMPT 130'"]
    
    Group3 --> OR["OR Node<br/>(from 'or')"]
    OR --> C125["COURSE<br/>CMPT-125"]
    OR --> C130["COURSE<br/>CMPT-130"]
    
    Group1 --> C120["COURSE<br/>CMPT-120"]
    Group2 --> C125
    
    Validate["3. Validate Tree<br/>transcript = ['CMPT-120', 'CMPT-125']"]
    C120 --> Validate
    C125 --> Validate
    C130 --> Validate
    
    Validate --> Check1["✅ CMPT-120 in transcript"]
    Validate --> Check2["✅ CMPT-125 in transcript<br/>OR satisfied"]
    Check1 --> Result["✅ Valid<br/>All AND nodes satisfied"]
    Check2 --> Result
    
    style Start fill:#fff3cd
    style Parse fill:#d1ecf1
    style Validate fill:#d4edda
    style Result fill:#28a745,color:#fff
```

**Parser Logic:**
- **Operator Precedence**: `and` > `,` (comma) > `or` > parentheses
- **Recursive Descent**: Handles nested expressions like `(A OR B) AND (C OR (D AND E))`
- **Validation**: DFS traversal of tree, propagates boolean results up from leaf COURSE nodes

---

## 🚀 CI/CD Pipeline - GitHub Actions Deployment

Automated deployment workflow from code push to production.

```mermaid
graph LR
    subgraph "Developer"
        Dev["👨‍💻 Developer<br/>git push"]
    end
    
    subgraph "GitHub"
        GH["🐙 GitHub Repo<br/>main branch"]
        Actions["⚙️ GitHub Actions<br/>.github/workflows/deploy.yml"]
    end
    
    subgraph "Build Process"
        Checkout["📥 Checkout code"]
        Build["🔨 Build Images<br/>docker compose build"]
        Test["🧪 Run tests<br/>(if configured)"]
    end
    
    subgraph "Deployment - AWS EC2"
        SSH["🔐 SSH Connection<br/>(30min timeout)"]
        Pull["📦 git pull"]
        Deploy["🚀 docker compose up -d<br/>--build (with cache)"]
        Health["✅ Health Check"]
    end
    
    subgraph "Production"
        Live["🌐 api.sfucourseplanner.me<br/>Nginx + FastAPI + SQLite"]
    end
    
    Dev -->|push| GH
    GH -->|trigger| Actions
    Actions --> Checkout
    Checkout --> Build
    Build --> Test
    Test --> SSH
    SSH --> Pull
    Pull --> Deploy
    Deploy --> Health
    Health -->|success| Live
    
    style Dev fill:#e1f5ff
    style Actions fill:#2088ff
    style Deploy fill:#28a745
    style Live fill:#ffa726
```

**Pipeline Stages:**
1. **Trigger**: Any push to `main` branch starts the workflow
2. **Build**: GitHub Actions runner builds Docker images with layer caching
3. **Deploy**: SSH into EC2 (with 30min timeout to handle slow builds)
4. **Production**: `docker compose up -d --build` restarts containers with zero downtime

**Key Features:**
- **Docker Layer Caching**: Speeds up builds from 15min → 5min
- **SSH Timeout**: Extended to 30 minutes to handle cold EC2 starts
- **Zero Downtime**: SQLite database persisted via volume mount

---

## 📚 Interview Talking Points

### "Walk me through your architecture"

> "I built a full-stack course tracker with **separation of concerns**:
> 
> **Frontend (Vercel)**: React SPA with TypeScript for type safety. Zustand manages client state, and components are organized by feature (Layout, Calendar, Auth).
> 
> **Backend (AWS EC2)**: FastAPI serves REST endpoints, containerized with Docker. SQLModel handles ORM with SQLAlchemy under the hood. Nginx reverse proxies with Let's Encrypt SSL.
> 
> **Database**: SQLite with a normalized 3NF schema. The key design is separating static course metadata from dynamic section instances, preventing data duplication when courses update.
> 
> **Background Worker**: A scheduler scrapes SFU APIs every 10 minutes, updates seat counts, and queries the `watchers` junction table to send notifications."

### "Explain your prerequisite parser"

> "SFU's prerequisite strings are complex nested boolean logic like `(A OR B) AND (C OR D)`.
> 
> I built a **recursive descent parser** that:
> 1. **Cleans** the raw string (removes grade requirements, normalizes operators)
> 2. **Parses** with operator precedence: `AND` → `,` → `OR` → `()`
> 3. **Builds** a JSON tree structure: `{type: 'AND', children: [{type: 'COURSE', course: 'CMPT-120'}, ...]}`
> 4. **Validates** by recursively checking if user's transcript satisfies the tree
> 
> This is stored in the database as a JSON column (`prerequisites_logic`), so validation is O(n) tree traversal instead of re-parsing on every request."

### "How does your deployment work?"

> "I use **GitHub Actions** for CI/CD. On every push to `main`:
> 
> 1. Actions runner SSHs into EC2 (30min timeout for reliability)
> 2. Pulls latest code and runs `docker compose up -d --build`
> 3. Docker layer caching speeds up builds (5min vs 15min cold)
> 4. SQLite database persists via volume mount, so no data loss on redeploy
> 
> Frontend deploys separately to Vercel with automatic SSL and CDN. The two communicate via CORS-enabled REST API."

---

## 🔗 Resources

- **Live Demo**: [sfucourseplanner.me](https://www.sfucourseplanner.me)
- **API Docs**: [api.sfucourseplanner.me/docs](https://api.sfucourseplanner.me/docs)
- **GitHub Repo**: [SFU-Course-Tracker](https://github.com/ttn54/SFU-Course-Tracker)
- **Mermaid Docs**: [mermaid.js.org](https://mermaid.js.org)

---

**Built with ❤️ for SFU students by students**
