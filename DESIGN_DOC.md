## **Project Name: SFU Intelligent Course Engine**

**Role:** Backend Systems Engineer
**Target Audience:** SFU Students (Scaling to \~3,000 courses)

### **1. Executive Summary**

This project is a high-performance backend system designed to solve the "Course Planning" problem using Graph Theory and Distributed Systems concepts. Unlike existing solutions (e.g., *sfuscheduler.ca*) which focus on UI/Calendar visualization, this project focuses on **Dependency Resolution** and **Real-Time Availability Tracking**.

**Primary Goal:** To engineer a "Logic Engine" that parses unstructured university data into a Directed Acyclic Graph (DAG) for prerequisite validation and implements an event-driven "Seat Watcher" for course enrollment.

### **2. The Tech Stack**

  * **Language:** **Python 3.11+** (Primary for Logic & Scraping).
      * *Reason:* Best ecosystem for scraping (`BeautifulSoup`), API interaction (`Requests`), and Graph algorithms (`NetworkX`).
  * **API Framework:** **FastAPI**.
      * *Reason:* High performance, asynchronous (needed for concurrent scraping), and auto-generates Swagger documentation (Industry standard).
  * **Database:** **PostgreSQL**.
      * *Reason:* We need relational data (Courses have many Prerequisites) and ACID compliance.
  * **Data Structures:** **NetworkX** (for DAG implementation).
  * **Infrastructure:** **Docker** (Containerization) & **AWS EC2** (Deployment).
  * **Tools:** `Pytest` (Unit Testing), `APScheduler` (Background Jobs).

### **3. System Architecture**

The system is divided into three distinct modules (Microservices approach):

#### **Module A: The Ingestion Pipeline (The Crawler)**

  * **Source:** SFU Course Outlines API (`http://www.sfu.ca/bin/wcm/course-outlines`).
  * **Responsibility:**
    1.  Recursively crawl the API hierarchy: `Year -> Term -> Dept -> Course -> Section`.
    2.  Extract raw JSON metadata (Title, Professor, Schedule).
    3.  **Critical Task:** Extract the raw `prerequisites` string (e.g., "CMPT 120 or 125 and MATH 151").
  * **Constraint:** Must handle API rate limits and network failures gracefully.

#### **Module B: The Logic Engine (The Brain)**

  * **Responsibility:** Dependency Resolution.
  * **Key Feature:** **Recursive Descent Parser**.
      * Converts unstructured strings like `"CMPT 120 or 125"` into structured Boolean Logic Trees.
      * *Constraint:* Must handle "Implicit Departments" (e.g., where "125" implies "CMPT 125").
  * **Algorithm:** **Topological Sort / DAG Traversal**.
      * Input: User Transcript (List of completed courses).
      * Logic: Traverse the Graph to calculate `is_eligible(course_id)`.
      * Output: Boolean + Missing Requirements list.

#### **Module C: The Seat Watcher (The Worker)**

  * **Source:** SFU CourSys (HTML Scraping required).
  * **Responsibility:** Targeted Polling.
  * **Architecture:**
      * Database table `WatchedCourses` stores user subscriptions.
      * Background Worker (Daemon) wakes up every X minutes.
      * Checks *only* subscribed courses for `Enrollment Count`.
  * **Alerting:** Triggers an event (Log/Email) when `seats_available > 0`.

### **4. Data Schemas (JSON Models)**

**A. Raw Course Object (Internal Storage)**

```json
{
  "id": "CMPT-225-D100",
  "dept": "CMPT",
  "number": "225",
  "term": "Spring 2026",
  "prerequisites_raw": "CMPT 120 or 125, and MATH 151.",
  "prerequisites_logic": {
    "operator": "AND",
    "operands": [
      { "operator": "OR", "operands": ["CMPT 120", "CMPT 125"] },
      "MATH 151"
    ]
  }
}
```

**B. User Transcript Request**

```json
{
  "student_id": "user_123",
  "completed_courses": ["CMPT 120", "MATH 151", "MACM 101"]
}
```

### **5. Implementation Roadmap (12 Weeks)**

**Phase 1: The Core Logic (Data & Algorithms)**

  * **Week 1:** Build `SFU_API_Client`. Fetch and store all CMPT course JSONs.
  * **Week 2:** Implement `PrereqParser`. Use Regex to tokenize strings into logic objects.
  * **Week 3:** Build the Graph. Implement `CourseGraph` class using `NetworkX`.
  * **Week 4:** Implement `check_eligibility(transcript, course_id)` algorithm.

**Phase 2: The Distributed System (Scraper & DB)**

  * **Week 5:** Build `SeatScraper` using `BeautifulSoup` for CourSys.
  * **Week 6:** Init `PostgreSQL` via Docker. Design Schema.
  * **Week 7:** Implement `BackgroundScheduler` to run the scraper every 10 mins.
  * **Week 8:** Implement Notification Logic (Mock Email/Console Log).

**Phase 3: Productionization (Cloud & API)**

  * **Week 9:** Wrap logic in `FastAPI` endpoints.
  * **Week 10:** Connect Frontend (React) to the API.
  * **Week 11:** Dockerize the Application (`Dockerfile` + `docker-compose`).
  * **Week 12:** Deploy to AWS EC2 Free Tier.

### **6. Specific Constraints for AI Assistance**

  * **Code Style:** Follow PEP 8 standards. Type hinting is mandatory (e.g., `def fetch(url: str) -> dict:`).
  * **Error Handling:** Never crash on a bad HTTP request; log it and retry.
  * **Testing:** All logic functions (Parser, Graph Traversal) must have Unit Tests.

-----

### **Next Steps:**

This document serves as the architectural blueprint for the SFU Intelligent Course Engine. All implementation decisions should reference this design document to maintain consistency with the original vision.

**Current Status:** Design phase complete. Ready to begin Week 1 implementation (The Crawler).
