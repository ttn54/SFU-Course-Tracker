# SFU Course Tracker - Migration to Python/FastAPI
## **14-Day Sprint: Node.js → Python Full Stack Rebuild**

**Author:** Zen Ng  
**Target:** Computing Science Co-op Interview Preparation  
**Goal:** Migrate from Node.js/Express/Prisma to Python/FastAPI with modern React frontend

---

## 📋 Executive Summary

This is a **complete architectural rewrite**, not a port. I'm rebuilding the SFU Course Tracker from the ground up using **Python/FastAPI** and **React 18** to demonstrate Systems knowledge for co-op applications.

**What Makes This Project Unique:**
- ✅ **Recursive Prerequisite Parser** - Converts natural language to boolean logic trees
- ✅ **Real-time Enrollment Scraping** - Live data from SFU CourSys (HTML scraping)
- ✅ **Drag-and-Drop Calendar** - Visual course scheduling with conflict detection
- ✅ **Automatic Data Pipeline** - No manual data entry required
- ✅ **Production-Ready** - Docker deployment with multi-service orchestration

**Interview Pitch:**  
*"I built a full-stack course planner that automatically scrapes SFU's course data, parses complex prerequisite logic using recursive descent parsing, and provides real-time enrollment tracking. It's designed to handle 3,000+ courses with an emphasis on Systems fundamentals: graph algorithms, concurrent scraping, and async I/O."*

---

## 🏗️ Architecture Overview

### Current State (Node.js - To Be Replaced)
```
Node.js/Express + TypeScript
├── Backend: Express.js + Prisma ORM
├── Frontend: Vanilla JavaScript (public/app.js)
├── Database: PostgreSQL via Prisma migrations
└── Data: Static JSON file
```

### Target State (Python - Beta Reference)
```
Python/FastAPI + React 18
├── Backend: FastAPI + SQLModel ORM
├── Frontend: React + Vite + TypeScript + Zustand
├── Database: SQLite (dev) / PostgreSQL (prod)
├── Data: Automatic scraping from SFU API + CourSys
└── Deployment: Docker Compose
```

---

## 🎯 Tech Stack Specification

### Backend: The "Systems" Core

| Component | Technology | Why This Choice? |
|-----------|-----------|------------------|
| **Language** | Python 3.12+ | Better data science/scraping ecosystem |
| **Framework** | FastAPI 0.109.0 | Async support, auto-generated OpenAPI docs |
| **ORM** | SQLModel 0.0.14 | Pydantic integration, type safety |
| **Database** | SQLite (dev), PostgreSQL (prod) | Simple migration path |
| **Scraper** | httpx + BeautifulSoup4 | Async HTTP + HTML parsing |
| **Scheduler** | APScheduler 3.10.4 | Background tasks (enrollment updates) |
| **Auth** | python-jose + passlib | JWT tokens + bcrypt hashing |

**Interview Talking Points:**
- **FastAPI vs Flask:** Built-in async/await, automatic request validation with Pydantic, auto-generated Swagger docs
- **SQLModel vs SQLAlchemy:** Combines SQLAlchemy (mature ORM) with Pydantic (runtime validation)
- **httpx vs requests:** Native async support for concurrent scraping
- **Why not Django?** Too heavyweight; FastAPI gives more control over API design

### Frontend: The Interface

| Component | Technology | Why This Choice? |
|-----------|-----------|------------------|
| **Framework** | React 18.3 | Component reusability, large ecosystem |
| **Build Tool** | Vite 5.4 | 10-100x faster than Create React App |
| **Language** | TypeScript (strict mode) | Type safety, IntelliSense, refactoring |
| **Styling** | Tailwind CSS 3.4 | Utility-first, no CSS files, dark mode |
| **State** | Zustand 4.5 | 3 lines vs 50 lines (Redux) |
| **Calendar** | react-big-calendar | Drag-drop scheduling |
| **HTTP Client** | axios 1.6 | Interceptors for auth tokens |

**Interview Talking Points:**
- **React vs Vue/Angular:** Largest job market, best TypeScript support
- **Vite vs Webpack:** Native ESM, instant HMR, optimized builds
- **Zustand vs Redux:** No boilerplate, persist middleware for localStorage
- **Tailwind vs Material-UI:** More customizable, smaller bundle size

---

## 🧠 Core Systems Concepts (For Interviews)

### 1. Recursive Prerequisite Parser

**The Problem:**  
SFU provides prerequisites as unstructured text:
```
"CMPT 120 or 125, and MATH 151, and (MACM 101 or MATH 154)"
```

**The Solution:**  
A **recursive descent parser** that builds an Abstract Syntax Tree (AST):

```python
{
  "type": "AND",
  "children": [
    {
      "type": "OR",
      "children": [
        {"type": "COURSE", "course": "CMPT-120"},
        {"type": "COURSE", "course": "CMPT-125"}
      ]
    },
    {"type": "COURSE", "course": "MATH-151"},
    {
      "type": "OR",
      "children": [
        {"type": "COURSE", "course": "MACM-101"},
        {"type": "COURSE", "course": "MATH-154"}
      ]
    }
  ]
}
```

**Parsing Algorithm:**
1. **Tokenization:** Regex extracts course codes (`CMPT-120`) and operators (`and`, `or`, `,`)
2. **Operator Precedence:** Parentheses > OR > Comma > AND
3. **Recursive Construction:** `_parse_expression()` → `_parse_and_group()` → `_parse_or_group()` → `_parse_atom()`
4. **Tree Evaluation:** Recursive traversal checks if user's transcript satisfies requirements

**Interview Question:** *"How do you handle 'CMPT 120 or 125'?"*  
**Your Answer:** "The parser tracks the last department seen (CMPT), then when it encounters a standalone number (125), it infers the department as CMPT. This handles implicit course references."

**Code Location:** [`backend/services/parser.py`](backend/services/parser.py)

---

### 2. Real-Time Enrollment Scraping

**The Problem:**  
SFU's official API doesn't provide live enrollment data. Need to scrape CourSys HTML.

**The Solution:**  
BeautifulSoup4 parses HTML to extract enrollment numbers:

```python
async def fetch_enrollment(dept: str, number: str, section: str, term: str):
    # Example: https://coursys.sfu.ca/2025fa-cmpt-354-d100/
    url = f"https://coursys.sfu.ca/{term}-{dept.lower()}-{number}-{section.lower()}/"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10.0)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract "150/150 (15 on waitlist)" text
        enrollment_text = soup.find('div', class_='enrollment-info').text
        
        # Parse with regex
        match = re.search(r'(\d+)/(\d+) \((\d+) on waitlist\)', enrollment_text)
        enrolled, capacity, waitlist = match.groups()
        
        return {
            "enrolled": f"{enrolled}/{capacity}",
            "waitlist": waitlist,
            "timestamp": datetime.now()
        }
```

**Challenges:**
- **Rate Limiting:** 0.2s delay between requests (5 req/sec) to avoid being blocked
- **Section Code Mapping:** SFU uses "D100", CourSys uses "d100" (lowercase)
- **Error Handling:** CourSys returns 404 for unscheduled sections
- **HTML Changes:** BeautifulSoup selectors can break if SFU changes layout

**Interview Talking Points:**
- **Ethical Scraping:** Respectful rate limiting, User-Agent headers, robots.txt compliance
- **Async Scraping:** `httpx.AsyncClient` allows concurrent requests (10x faster than `requests`)
- **Caching Strategy:** JSON file for course catalog (changes rarely), live API for enrollment (changes constantly)

**Code Location:** [`backend/crawler/sfu_api_client.py`](backend/crawler/sfu_api_client.py)

---

### 3. Database Schema Design

**Core Models:**

```python
class Course(SQLModel, table=True):
    """Static course information"""
    id: str = Field(primary_key=True)  # "CMPT-354"
    dept: str = Field(index=True)       # "CMPT"
    number: str                         # "354"
    title: str                          # "Database Systems"
    description: Optional[str]
    credits: int = Field(default=3)
    prerequisites_raw: Optional[str]    # Raw text from SFU
    prerequisites_logic: dict = Field(sa_column=Column(JSON))  # Parsed tree
    
    sections: list["Section"] = Relationship(back_populates="course")

class Section(SQLModel, table=True):
    """Dynamic section information"""
    id: int = Field(primary_key=True)
    course_id: str = Field(foreign_key="courses.id")
    term: str                           # "Spring 2026"
    section_code: str                   # "D100"
    instructor: Optional[str]
    schedule_json: list[dict] = Field(sa_column=Column(JSON))
    
    # Enrollment tracking
    seats_total: int
    seats_enrolled: int
    waitlist_total: int
    waitlist_enrolled: int
    
    course: Course = Relationship(back_populates="sections")

class User(SQLModel, table=True):
    """User accounts with saved schedules"""
    id: int = Field(primary_key=True)
    email: str = Field(unique=True)
    password: str  # bcrypt hashed
    completed_courses: list[str] = Field(sa_column=Column(JSON))
    scheduled_courses: dict = Field(sa_column=Column(JSON))
```

**Design Decisions:**
- **JSON Columns:** Store complex data (prerequisite trees, schedules) without creating 5+ tables
- **Composite Keys:** Courses are uniquely identified by (dept, number) but use string ID for URLs
- **Relationships:** SQLModel's `Relationship()` handles foreign keys automatically
- **Why SQLite?** Simpler for development, easy migration to PostgreSQL (same SQL dialect)

**Interview Question:** *"Why use JSON columns instead of normalized tables?"*  
**Your Answer:** "For semi-structured data like schedule arrays, JSON columns reduce join complexity. The prerequisite tree is recursive and variable-depth, which is hard to normalize. Since we're not querying inside the JSON structure, it's more efficient."

**Code Location:** [`backend/models.py`](backend/models.py)

---

### 4. Drag-and-Drop Calendar Implementation

**The Challenge:**  
Users drag a course card onto a calendar timeslot → system must:
1. Show section selector modal (pick lecture + lab)
2. Check for time conflicts
3. Add to schedule
4. Persist to localStorage (Zustand)

**HTML5 Drag & Drop API:**

```typescript
// CourseCard.tsx - Make draggable
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('courseGroup', JSON.stringify(courseGroup));
    e.dataTransfer.effectAllowed = 'copy';
  }}
>

// WeeklyCalendar.tsx - Accept drops
<Calendar
  onDrop={(e) => {
    e.preventDefault();
    const courseGroup = JSON.parse(e.dataTransfer.getData('courseGroup'));
    showSectionSelectorModal(courseGroup);
  }}
  onDragOver={(e) => e.preventDefault()}  // Required to allow drop
/>

// Conflict Detection Algorithm
const hasTimeConflict = (section1, section2) => {
  for (const sched1 of section1.schedule) {
    for (const sched2 of section2.schedule) {
      if (sched1.day === sched2.day) {
        const start1 = parseTime(sched1.startTime);
        const end1 = parseTime(sched1.endTime);
        const start2 = parseTime(sched2.startTime);
        const end2 = parseTime(sched2.endTime);
        
        // Interval overlap: [start1, end1] ∩ [start2, end2] ≠ ∅
        if (start1 < end2 && start2 < end1) {
          return true;
        }
      }
    }
  }
  return false;
};
```

**Interview Talking Points:**
- **Native API vs Library:** HTML5 Drag & Drop has better browser support than react-dnd
- **Data Transfer:** Pass JSON through `dataTransfer` (limited to text, must serialize)
- **Time Representation:** Store as "HH:MM" strings, convert to minutes since midnight for comparison
- **Combined Sections:** Some courses require Lecture + Lab + Tutorial bundled together

**Code Location:** [`frontend/src/components/Calendar/WeeklyCalendar.tsx`](frontend/src/components/Calendar/WeeklyCalendar.tsx)

---

## 📅 14-Day Migration Plan

### Phase 1: Backend Core (Days 1-5)

#### **Day 1: Project Setup & Database Migration**

**Morning: Clean Up Old Node.js Project (15 minutes)**

Before migrating to Python, remove old Node.js files to avoid confusion:

```bash
cd \\wsl.localhost\Ubuntu\home\zen\my_projects\SFU-Course-Tracker

# Remove old Node.js backend files
rm -rf src/                  # Old Express.js routes/controllers/middleware
rm package.json package-lock.json tsconfig.json

# Remove Prisma (switching to SQLModel)
rm -rf prisma/

# Remove old frontend (will rebuild with React/Vite Days 6-10)
rm -rf frontend/public/app.js frontend/public/styles.css
rm -rf frontend/node_modules/
rm frontend/package.json frontend/tsconfig.json

# Remove root-level node_modules if exists
rm -rf node_modules/
```

**What to Delete:**

| File/Folder | Why Delete? |
|-------------|-------------|
| `src/` | Old Express.js TypeScript backend (Express routes, controllers) |
| `package.json` (root) | Root-level Node config (frontend will have its own) |
| `tsconfig.json` (root) | Root-level TypeScript config (frontend will have its own) |
| [`prisma`](prisma )/ | Switching to SQLModel (Python ORM) |
| `frontend/public/app.js` | Vanilla JS (replacing with React) |
| `frontend/node_modules/` | Old dependencies (will reinstall for React) |
| [`node_modules`](node_modules )/ (root) | Root-level Node dependencies (not needed) |

**What to Keep:**

| File/Folder | Why Keep? |
|-------------|-----------|
| [`backend`](backend )/ | Already has Python crawler - will expand this! |
| [`backend/crawler`](backend/crawler )/ | Python scraper (sfu_api_client.py, test_crawler.py) |
| [`backend/data`](backend/data )/ | Course JSON files (fall_2025_courses.json) |
| [`data`](data )/ | Additional course data |
| [`frontend`](frontend )/ folder structure | Will rebuild with React (keep Dockerfile, init.sh for Docker) |
| [`.git`](.git )/ | Version control history - DON'T DELETE! |
| [`README.md`](README.md ), [`DESIGN_DOC.md`](DESIGN_DOC.md ) | Documentation |
| [`docker-compose.yml`](docker-compose.yml ) | Will update for Python stack |

**Git Status Check:**
```bash
git status
# You should see many deleted files - that's expected!
# Don't commit yet - wait until Day 2 after initial Python setup
```

---

**Afternoon: Initialize Python Backend**

**Tasks:**
- [ ] Clean up old Node.js files (above)
- [ ] Create Python virtual environment
- [ ] Install FastAPI dependencies
- [ ] Copy core files from beta (config, database, models)
- [ ] Initialize SQLite database
- [ ] Test database connection

**Step 1: Setup Python Environment**
```bash
cd backend
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac (WSL)
# OR
venv\Scripts\activate     # Windows PowerShell

# Verify Python version
python --version  # Should be 3.10+
```

**Step 2: Install Dependencies**
```bash
pip install fastapi==0.109.0 uvicorn[standard] sqlmodel==0.0.14 \
    httpx==0.26.0 beautifulsoup4==4.12.2 python-jose[cryptography] \
    passlib[bcrypt] python-multipart

# Save dependencies
pip freeze > requirements.txt
```

**Step 3: Copy Core Files from Beta**
```bash
# From beta to current project
cp ../../SFU-course-tracker-simul/SFU-Course-Tracker-beta/backend/config.py .
cp ../../SFU-course-tracker-simul/SFU-Course-Tracker-beta/backend/database.py .
cp ../../SFU-course-tracker-simul/SFU-Course-Tracker-beta/backend/models.py .
```

**Key Files Structure:**
```python
# config.py - Environment configuration
DATABASE_URL = "sqlite:///./sfu_scheduler.db"
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# database.py - SQLAlchemy engine setup
from sqlmodel import create_engine, Session, SQLModel

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# models.py - Database schemas
class Course(SQLModel, table=True):
    id: str = Field(primary_key=True)
    dept: str
    number: str
    title: str
    # ... more fields
```

**Step 4: Initialize Database**
```bash
# Create database tables
python3 -c "from database import create_db_and_tables; create_db_and_tables()"

# Verify database file created
ls -lh sfu_scheduler.db
# Should see: sfu_scheduler.db (8.0K or similar)
```

**Step 5: Test Database Connection**
```python
# test_db.py (create this file)
from database import get_session
from models import Course

with next(get_session()) as session:
    # Try to query courses (should be empty)
    courses = session.query(Course).all()
    print(f"Database connected! Found {len(courses)} courses.")
    # Expected: "Database connected! Found 0 courses."
```

```bash
python3 test_db.py
```

**Expected Output:**
```
Database connected! Found 0 courses.
```

---

**Interview Explanation:**
- **Why async?** FastAPI supports async route handlers, allowing concurrent database queries
- **Dependency Injection:** `get_session()` provides database connection to routes via `Depends()`
- **Connection Pooling:** SQLAlchemy manages connection pool automatically
- **SQLite vs PostgreSQL:** SQLite for development (zero setup), PostgreSQL for production (scalability)

---

#### **Day 2: Data Crawler & Seeding**

**Tasks:**
- [ ] Copy [`backend/crawler/sfu_api_client.py`](backend/crawler/sfu_api_client.py) from beta
- [ ] Run crawler: `python3 -m crawler.test_crawler`
- [ ] Verify JSON file: [`backend/data/fall_2025_courses_with_enrollment.json`](backend/data/fall_2025_courses_with_enrollment.json)
- [ ] Copy [`backend/seed_database.py`](backend/seed_database.py)
- [ ] Seed database: `python3 seed_database.py`

**Crawler Logic:**
```python
async def fetch_all_cmpt_courses():
    # Step 1: Get all course outlines from SFU API
    base_url = "https://www.sfu.ca/bin/wcm/course-outlines"
    courses = []
    
    # Fetch: 2025 -> fall -> cmpt -> all courses
    async with httpx.AsyncClient() as client:
        for course_number in range(100, 500):  # CMPT 100-499
            url = f"{base_url}/2025/fall/cmpt/{course_number}"
            response = await client.get(url)
            if response.status_code == 200:
                course_data = response.json()
                courses.append(course_data)
    
    # Step 2: For each course, scrape enrollment from CourSys
    for course in courses:
        for section in course['sections']:
            enrollment = await fetch_enrollment_from_coursys(
                dept=course['dept'],
                number=course['number'],
                section=section['code']
            )
            section['enrollment'] = enrollment
            await asyncio.sleep(0.2)  # Rate limiting
    
    # Step 3: Save to JSON
    with open('data/fall_2025_courses_with_enrollment.json', 'w') as f:
        json.dump(courses, f, indent=2)
```

**Interview Talking Points:**
- **Concurrent Scraping:** `asyncio.gather()` fetches multiple courses in parallel
- **Rate Limiting:** 0.2s delay prevents IP bans (5 req/sec is reasonable)
- **Error Recovery:** Continue scraping even if one course fails
- **Data Normalization:** Section codes converted (D100 → d100) for CourSys compatibility

---

#### **Day 3: Core API Endpoints**

**Tasks:**
- [ ] Copy [`backend/main.py`](backend/main.py) (FastAPI app initialization)
- [ ] Copy `backend/routers/courses.py` (course endpoints)
- [ ] Copy `backend/routers/auth.py` (authentication)
- [ ] Test endpoints: `http://localhost:8000/docs` (Swagger UI)

**Key Endpoints:**
```python
# GET /api/v1/courses/all - Returns all 251 courses from JSON
@router.get("/courses/all")
async def get_all_courses() -> list[dict]:
    with open('data/fall_2025_courses_with_enrollment.json') as f:
        return json.load(f)

# GET /api/v1/courses/search?q=CMPT - Fuzzy search
@router.get("/courses/search")
async def search_courses(q: str) -> list[dict]:
    courses = get_all_courses()
    return [c for c in courses if q.upper() in f"{c['dept']} {c['number']} {c['title']}".upper()]

# GET /api/v1/courses/enrollment/{dept}/{number}/{section} - Live enrollment
@router.get("/courses/enrollment/{dept}/{number}/{section}")
async def get_live_enrollment(dept: str, number: str, section: str, term: str = "2025/fall"):
    return await fetch_enrollment_from_coursys(dept, number, section, term)

# POST /api/v1/courses/enrollment/batch - Batch enrollment (efficient)
@router.post("/courses/enrollment/batch")
async def batch_enrollment(sections: list[SectionRequest], term: str = "2025/fall"):
    tasks = [fetch_enrollment_from_coursys(s.dept, s.number, s.section, term) for s in sections]
    return await asyncio.gather(*tasks)
```

**Interview Explanation:**
- **Auto Documentation:** FastAPI generates `/docs` from type hints automatically
- **Request Validation:** Pydantic models validate input (returns 422 if invalid)
- **Response Models:** Type hints ensure consistent API responses
- **Batch Endpoint:** Reduces network overhead (1 request vs 10 requests)

---

#### **Day 4: Prerequisite Parser**

**Tasks:**
- [ ] Copy [`backend/services/parser.py`](backend/services/parser.py) from beta
- [ ] Copy `backend/routers/prerequisites.py`
- [ ] Write unit tests: `pytest backend/tests/test_parser.py`

**Parser Algorithm Walkthrough:**

**Input:** `"CMPT 120 or 125, and MATH 151"`

**Step 1: Tokenization**
```python
tokens = ["CMPT 120", "or", "125", ",", "and", "MATH 151"]
```

**Step 2: Parse Expression (Top-Level AND)**
```python
_parse_expression("CMPT 120 or 125, and MATH 151")
  → Split by " and " → ["CMPT 120 or 125,", "MATH 151"]
  → Parse each part
```

**Step 3: Parse AND Group (Handle Commas)**
```python
_parse_and_group("CMPT 120 or 125,")
  → Split by "," → ["CMPT 120 or 125"]
  → Parse as OR group
```

**Step 4: Parse OR Group**
```python
_parse_or_group("CMPT 120 or 125")
  → Split by " or " → ["CMPT 120", "125"]
  → Extract courses → ["CMPT-120", "CMPT-125"]  # Implicit department
```

**Step 5: Build Tree**
```python
{
  "type": "AND",
  "children": [
    {
      "type": "OR",
      "children": [
        {"type": "COURSE", "course": "CMPT-120"},
        {"type": "COURSE", "course": "CMPT-125"}
      ]
    },
    {"type": "COURSE", "course": "MATH-151"}
  ]
}
```

**Interview Question:** *"How do you evaluate the tree?"*  
**Your Answer:**
```python
def evaluate(tree, completed_courses):
    if tree["type"] == "COURSE":
        return tree["course"] in completed_courses
    elif tree["type"] == "AND":
        return all(evaluate(child, completed_courses) for child in tree["children"])
    elif tree["type"] == "OR":
        return any(evaluate(child, completed_courses) for child in tree["children"])
```

---

#### **Day 5: Authentication System**

**Tasks:**
- [ ] Copy `backend/routers/auth.py` and `backend/routers/user.py`
- [ ] Implement JWT token generation
- [ ] Add password hashing with bcrypt
- [ ] Test login flow

**Authentication Flow:**
```python
# 1. Registration
@router.post("/auth/register")
async def register(email: str, password: str, session: Session = Depends(get_session)):
    # Hash password with bcrypt (10 rounds)
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    
    # Save user
    user = User(email=email, password=hashed.decode())
    session.add(user)
    session.commit()
    
    return {"message": "User created"}

# 2. Login
@router.post("/auth/login")
async def login(email: str, password: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == email)).first()
    
    # Verify password
    if not bcrypt.checkpw(password.encode(), user.password.encode()):
        raise HTTPException(401, "Invalid credentials")
    
    # Generate JWT token
    token = jwt.encode(
        {"sub": user.email, "exp": datetime.utcnow() + timedelta(days=1)},
        SECRET_KEY,
        algorithm="HS256"
    )
    
    return {"access_token": token, "token_type": "bearer"}

# 3. Protected Route
@router.get("/user/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    return {"email": payload["sub"]}
```

**Interview Talking Points:**
- **JWT Structure:** Header (algorithm) + Payload (user data) + Signature (HMAC)
- **Why bcrypt?** Adaptive hashing (adjustable rounds), salted automatically
- **Token Expiry:** 24-hour tokens balance security and UX
- **OAuth2 Flow:** `Authorization: Bearer <token>` header standard

---

### Phase 2: Frontend Rewrite (Days 6-10)

#### **Day 6: React Project Setup**

**Tasks:**
- [ ] Initialize Vite project: `npm create vite@latest frontend -- --template react-ts`
- [ ] Install dependencies: `npm install zustand axios react-big-calendar lucide-react`
- [ ] Install Tailwind: `npm install -D tailwindcss postcss autoprefixer`
- [ ] Copy [`frontend/vite.config.ts`](frontend/vite.config.ts), [`frontend/tailwind.config.js`](frontend/tailwind.config.js)
- [ ] Copy [`frontend/src/index.css`](frontend/src/index.css) (global styles)

**Project Structure:**
```
frontend/src/
├── App.tsx                    # Main app component
├── main.tsx                   # Entry point
├── components/
│   ├── Auth/
│   │   └── AuthPage.tsx       # Login/register
│   ├── Calendar/
│   │   └── WeeklyCalendar.tsx # Drag-drop calendar
│   ├── CourseList/
│   │   ├── CourseCard.tsx     # Course display with enrollment
│   │   ├── CourseList.tsx     # Search results
│   │   └── SectionSelectorModal.tsx
│   ├── Layout/
│   │   ├── GlobalHeader.tsx   # Top navigation
│   │   ├── ControlBar.tsx     # Search bar
│   │   └── FooterActionBar.tsx
│   └── Prerequisites/
│       └── CompletedCoursesModal.tsx
├── stores/
│   ├── authStore.ts           # JWT token, user data
│   └── courseStore.ts         # Selected courses, schedule
├── hooks/
│   └── useEnrollmentData.ts   # Real-time enrollment
├── services/
│   └── api.ts                 # Axios client
└── types/
    └── index.ts               # TypeScript interfaces
```

---

#### **Day 7: State Management (Zustand)**

**Tasks:**
- [ ] Copy [`frontend/src/stores/courseStore.ts`](frontend/src/stores/courseStore.ts)
- [ ] Copy [`frontend/src/stores/authStore.ts`](frontend/src/stores/authStore.ts)
- [ ] Test state persistence (localStorage)

**Why Zustand Over Redux:**

**Redux (50+ lines):**
```typescript
// Action types
const ADD_COURSE = 'ADD_COURSE';
const REMOVE_COURSE = 'REMOVE_COURSE';

// Action creators
const addCourse = (course) => ({ type: ADD_COURSE, payload: course });

// Reducer
const courseReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_COURSE:
      return { ...state, courses: [...state.courses, action.payload] };
    case REMOVE_COURSE:
      return { ...state, courses: state.courses.filter(c => c.id !== action.payload) };
    default:
      return state;
  }
};

// Store
const store = createStore(courseReducer);

// Provider
<Provider store={store}>
  <App />
</Provider>

// Usage
const dispatch = useDispatch();
dispatch(addCourse(course));
```

**Zustand (10 lines):**
```typescript
import create from 'zustand';
import { persist } from 'zustand/middleware';

const useCourseStore = create(
  persist(
    (set) => ({
      courses: [],
      addCourse: (course) => set((state) => ({ courses: [...state.courses, course] })),
      removeCourse: (id) => set((state) => ({ courses: state.courses.filter(c => c.id !== id) })),
    }),
    { name: 'course-storage' }  // Auto-save to localStorage
  )
);

// Usage (no Provider needed)
const { courses, addCourse } = useCourseStore();
addCourse(course);
```

**Interview Talking Points:**
- **No Boilerplate:** Direct state mutations (Zustand handles immutability)
- **No Provider:** Import hooks anywhere (React Context under the hood)
- **Persist Middleware:** Auto-save to localStorage (survives page refresh)
- **TypeScript-Friendly:** Inferred types from store definition

---

#### **Day 8: Course List & Real-time Enrollment**

**Tasks:**
- [ ] Copy [`frontend/src/components/CourseList/CourseCard.tsx`](frontend/src/components/CourseList/CourseCard.tsx)
- [ ] Copy [`frontend/src/hooks/useEnrollmentData.ts`](frontend/src/hooks/useEnrollmentData.ts)
- [ ] Connect to backend API (`/api/v1/courses/all`)

**Custom Hook: Real-time Enrollment**

```typescript
// useEnrollmentData.ts
export const useSingleEnrollment = (dept: string, number: string, section: string) => {
  const [data, setData] = useState({ enrolled: 'N/A', waitlist: '0' });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getEnrollment(dept, number, section);
        setData(response);
      } catch (error) {
        console.error('Enrollment fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch immediately
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [dept, number, section]);
  
  return { ...data, loading };
};
```

**Interview Explanation:**
- **Custom Hooks:** Extract reusable logic from components
- **useEffect Cleanup:** Return function clears interval (prevents memory leaks)
- **Auto-Refresh:** `setInterval` updates data without user interaction
- **Error Handling:** Graceful degradation (show "N/A" if API fails)

---

#### **Day 9: Drag-Drop Calendar**

**Tasks:**
- [ ] Copy [`frontend/src/components/Calendar/WeeklyCalendar.tsx`](frontend/src/components/Calendar/WeeklyCalendar.tsx)
- [ ] Copy [`frontend/src/components/CourseList/SectionSelectorModal.tsx`](frontend/src/components/CourseList/SectionSelectorModal.tsx)
- [ ] Implement conflict detection algorithm

**Conflict Detection:**
```typescript
const hasTimeConflict = (section1: Section, section2: Section): boolean => {
  for (const sched1 of section1.schedule) {
    for (const sched2 of section2.schedule) {
      // Must be same day
      if (sched1.day !== sched2.day) continue;
      
      // Convert "14:30" to minutes since midnight
      const start1 = timeToMinutes(sched1.startTime);
      const end1 = timeToMinutes(sched1.endTime);
      const start2 = timeToMinutes(sched2.startTime);
      const end2 = timeToMinutes(sched2.endTime);
      
      // Check interval overlap: [start1, end1] ∩ [start2, end2]
      if (start1 < end2 && start2 < end1) {
        return true;
      }
    }
  }
  return false;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
```

**Interview Question:** *"Why convert to minutes instead of using Date objects?"*  
**Your Answer:** "Time-only comparisons don't need dates. Converting 'HH:MM' to integer minutes simplifies math: '14:30' becomes 870, making interval overlap checks trivial."

---

#### **Day 10: Prerequisites Modal**

**Tasks:**
- [ ] Copy [`frontend/src/components/Prerequisites/CompletedCoursesModal.tsx`](frontend/src/components/Prerequisites/CompletedCoursesModal.tsx)
- [ ] Copy [`frontend/src/utils/prerequisiteParser.ts`](frontend/src/utils/prerequisiteParser.ts)
- [ ] Test client-side validation

**Two-Tier Validation Strategy:**

1. **Client-Side (Fast):** Parse simple prerequisites locally
2. **Server-Side (Accurate):** Handle complex cases with API

```typescript
const validatePrerequisites = async (courseKey: string, completedCourses: string[]) => {
  try {
    // Attempt client-side parsing first
    const tree = PrerequisiteParser.parse(prereqString);
    const isValid = evaluateTree(tree, completedCourses);
    
    if (tree && tree.type !== 'UNKNOWN') {
      return { isValid, method: 'client-side' };
    }
  } catch {
    // Fallback to server
  }
  
  // Server-side validation for complex cases
  const response = await api.post('/prerequisites/validate', {
    target_course: courseKey,
    transcript: completedCourses
  });
  
  return { ...response.data, method: 'server-side' };
};
```

**Interview Talking Points:**
- **Progressive Enhancement:** Try fast client-side first, fallback to accurate server-side
- **Offline Support:** Client-side parser works without network
- **Complex Cases:** Server handles parentheses, corequisites, grade requirements

---

### Phase 3: Integration & Deployment (Days 11-14)

#### **Day 11: Docker Compose**

**Tasks:**
- [ ] Copy [`docker-compose.yml`](docker-compose.yml)
- [ ] Copy [`backend/Dockerfile`](backend/Dockerfile)
- [ ] Copy [`frontend/Dockerfile`](frontend/Dockerfile)
- [ ] Test: `docker-compose up --build`

**Multi-Service Orchestration:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/sfu_tracker
    depends_on:
      - db
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    command: npm run dev

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: sfu_tracker
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Interview Explanation:**
- **Service Dependencies:** Frontend waits for backend via `depends_on`
- **Volume Mounts:** Live code changes without rebuilding
- **Environment Variables:** Different configs for dev/prod
- **Multi-Stage Builds:** Smaller production images (Node build → Nginx runtime)

---

#### **Day 12: Testing**

**Tasks:**
- [ ] Write backend tests: `pytest backend/tests/`
- [ ] Write frontend tests: `npm test` (Vitest)
- [ ] Test full user flow

**Key Tests:**
```python
# test_parser.py
def test_simple_or():
    tree = PrerequisiteParser().parse("CMPT 120 or 125")
    assert tree["type"] == "OR"
    assert len(tree["children"]) == 2

def test_complex_nested():
    tree = PrerequisiteParser().parse("CMPT 120, and (MATH 150 or MATH 151)")
    assert tree["type"] == "AND"
    # More assertions...

# test_enrollment.py
@pytest.mark.asyncio
async def test_fetch_enrollment():
    data = await fetch_enrollment_from_coursys("CMPT", "354", "D100")
    assert "enrolled" in data
    assert "waitlist" in data
```

---

#### **Day 13: Documentation**

**Tasks:**
- [ ] Update README with architecture diagram
- [ ] Document API endpoints (FastAPI auto-generates `/docs`)
- [ ] Write interview preparation notes

---

#### **Day 14: Deployment**

**Tasks:**
- [ ] Deploy backend to Railway/Render
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Migrate database to Neon/Supabase (PostgreSQL)

**Deployment Commands:**
```bash
# Railway (Backend)
railway login
railway init
railway up

# Vercel (Frontend)
vercel login
vercel --prod

# Environment Variables
VITE_API_URL=https://sfu-tracker-api.railway.app
DATABASE_URL=postgresql://...
```

---

## 🎤 Interview Preparation

### Technical Questions You Can Answer

1. **"Walk me through your system architecture"**
   - FastAPI backend with async I/O for concurrent scraping
   - React frontend with Zustand for state management
   - SQLite database with SQLModel ORM (JSON columns for semi-structured data)
   - Docker Compose for multi-service deployment
   - Real-time data pipeline: SFU API → Parser → CourSys scraper → Frontend

2. **"How does your prerequisite parser work?"**
   - Recursive descent parser with 4 levels: expression → AND group → OR group → atom
   - Operator precedence: Parentheses > OR > Comma > AND
   - Handles implicit departments (CMPT 120 or 125)
   - Builds Abstract Syntax Tree, evaluates with recursive traversal
   - Time complexity: O(n) for parsing, O(m) for evaluation (n=string length, m=tree nodes)

3. **"Explain your real-time enrollment system"**
   - BeautifulSoup4 scrapes CourSys HTML (enrollment not available via API)
   - Rate limiting: 0.2s delay between requests (respectful scraping)
   - Frontend polls every 5 minutes with custom React hook
   - Batch API endpoint reduces network calls (1 request for 10 courses)
   - Error handling: Graceful degradation (show "N/A" if CourSys down)

4. **"Why Python for backend instead of Node.js?"**
   - Better data science/scraping libraries (BeautifulSoup, NetworkX)
   - Type safety with Pydantic (runtime validation)
   - Async/await native support (cleaner syntax than Node callbacks)
   - Automatic API docs (FastAPI generates OpenAPI/Swagger)
   - Larger AI/ML ecosystem (future features: course recommendation)

5. **"How do you handle time conflicts in the calendar?"**
   - Represent time as minutes since midnight (14:30 → 870)
   - Interval overlap algorithm: [start1, end1] ∩ [start2, end2] ≠ ∅
   - Check condition: start1 < end2 AND start2 < end1
   - O(n²) worst-case (compare all pairs), but n is small (<10 courses)
   - Future optimization: Interval tree (O(log n) query)

6. **"Explain your authentication flow"**
   - JWT tokens with 24-hour expiry (balance security/UX)
   - Bcrypt password hashing with 10 rounds (adaptive algorithm)
   - Token stored in localStorage (XSS risk, but acceptable for MVP)
   - Authorization header: `Bearer <token>` (OAuth2 standard)
   - Future: Refresh tokens, HttpOnly cookies, rate limiting

---

## ✅ Migration Checklist

### Backend
- [ ] [`backend/config.py`](backend/config.py)
- [ ] [`backend/database.py`](backend/database.py)
- [ ] [`backend/models.py`](backend/models.py)
- [ ] [`backend/main.py`](backend/main.py)
- [ ] [`backend/requirements.txt`](backend/requirements.txt)
- [ ] [`backend/crawler/sfu_api_client.py`](backend/crawler/sfu_api_client.py)
- [ ] [`backend/services/parser.py`](backend/services/parser.py)
- [ ] `backend/routers/*.py` (all 7 routers)

### Frontend
- [ ] [`frontend/package.json`](frontend/package.json)
- [ ] [`frontend/vite.config.ts`](frontend/vite.config.ts)
- [ ] [`frontend/tailwind.config.js`](frontend/tailwind.config.js)
- [ ] [`frontend/src/App.tsx`](frontend/src/App.tsx)
- [ ] `frontend/src/components/**/*.tsx` (all components)
- [ ] `frontend/src/stores/*.ts` (Zustand stores)
- [ ] [`frontend/src/hooks/useEnrollmentData.ts`](frontend/src/hooks/useEnrollmentData.ts)
- [ ] [`frontend/src/services/api.ts`](frontend/src/services/api.ts)
- [ ] [`frontend/src/types/index.ts`](frontend/src/types/index.ts)

### DevOps
- [ ] [`docker-compose.yml`](docker-compose.yml)
- [ ] [`.dockerignore`](.dockerignore)
- [ ] [`.gitignore`](.gitignore)

---

## 🚨 Common Pitfalls

1. **Don't copy Prisma files** - You're switching to SQLModel
2. **Update CORS settings** - Frontend on :3000, backend on :8000
3. **Environment variables** - Create `.env` files for both frontend/backend
4. **Database path** - SQLite file location must match in [`config.py`](backend/config.py)
5. **Section code mapping** - CourSys uses lowercase (d100), SFU uses uppercase (D100)

---

## 📈 Success Metrics

By Day 14, you will have:
- ✅ Python backend with 15+ FastAPI endpoints
- ✅ React frontend with TypeScript + Zustand
- ✅ Drag-drop calendar with conflict detection
- ✅ Real-time enrollment tracking (5-min auto-refresh)
- ✅ Recursive prerequisite parser with 90%+ accuracy
- ✅ JWT authentication system
- ✅ Docker Compose deployment
- ✅ Comprehensive README for interviews
- ✅ Portfolio project demonstrating Systems knowledge

---

**Current Status:** Design complete. Ready to begin Day 1 (Backend setup).

**Next Step:** Copy [`backend/config.py`](backend/config.py), [`backend/database.py`](backend/database.py), [`backend/models.py`](backend/models.py) from beta to current project.
