# 🎓 SFU Course Tracker

**🌐 Live Demo:** [sfucourseplanner.me](https://www.sfucourseplanner.me) | [sfu-course-tracker.vercel.app](https://sfu-course-tracker.vercel.app)

A full-stack web application for Simon Fraser University students to search, filter, and track course availability across **all 76 departments** with real-time data from official SFU APIs.

## ✨ Features

- 🔍 **Comprehensive Search**: Browse 3000+ courses across all 76 SFU departments
- 📊 **Real-time Data**: Course information fetched directly from official SFU APIs
- 🎯 **Smart Filtering**: Filter by department, course level, and availability
- 📱 **Responsive Design**: Seamless experience on desktop, tablet, and mobile
- 🔐 **User Authentication**: Secure JWT-based registration and login
- 📈 **Course Details**: View prerequisites, schedules, and enrollment info
- 🔔 **Seat Tracking**: Monitor course availability with watcher notifications

## � Documentation

- **[System Diagrams](DIAGRAMS.md)** - UML diagrams, ERD, architecture, and sequence diagrams
- **[API Documentation](https://api.sfucourseplanner.me/docs)** - Interactive Swagger/OpenAPI docs

## �🛠️ Tech Stack

### Frontend
- **React** with **TypeScript**
- **Vite** - Lightning-fast build tool
- **CSS3** - Modern responsive styling
- **Deployed on Vercel** with automatic SSL
- **Custom Domain**: sfucourseplanner.me (Namecheap)

### Backend
- **FastAPI** (Python 3.12) - High-performance async API
- **SQLite** with **SQLAlchemy ORM**
- **JWT Authentication** with bcrypt password hashing
- **Nginx** - Reverse proxy with Let's Encrypt SSL
- **Deployed on AWS EC2** with Docker
- **API Domain**: api.sfucourseplanner.me

### Infrastructure
- **Docker & Docker Compose** - Containerized deployment
- **GitHub Actions** - CI/CD pipeline
- **Let's Encrypt** - Free SSL certificates
- **Persistent Volumes** - Database preservation across deployments

## 📁 Project Structure

```
SFU-Course-Tracker/
├── backend/
│   ├── main.py                  # FastAPI application
│   ├── config.py                # Configuration & settings
│   ├── database.py              # Database connection
│   ├── models.py                # SQLAlchemy models
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile              # Backend container
│   ├── routers/                # API endpoints
│   │   ├── auth.py             # Authentication routes
│   │   ├── courses.py          # Course endpoints
│   │   ├── user.py             # User management
│   │   ├── watchers.py         # Seat tracking
│   │   └── prerequisites.py    # Prerequisite logic
│   ├── crawler/                # SFU API client
│   │   ├── sfu_api_client.py
│   │   └── test_crawler.py     # Data fetching script
│   ├── services/               # Background workers
│   │   └── worker.py           # Seat checking scheduler
│   └── data/
│       └── fall_2025_all_courses.json  # 76 departments
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Layout/
│   │   │   │   ├── ControlBar.tsx  # Search & filters
│   │   │   │   └── CourseList.tsx  # Course display
│   │   │   └── Auth/
│   │   ├── services/           # API client
│   │   │   └── api.ts
│   │   └── types/              # TypeScript definitions
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── prisma/
│   └── schema.prisma           # Database schema
├── docker-compose.yml          # Container orchestration
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- Docker & Docker Compose (recommended)

### Local Development with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/SFU-Course-Tracker.git
   cd SFU-Course-Tracker
   ```

2. **Start all services:**
   ```bash
   docker compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Manual Setup

#### Backend

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file:**
   ```env
   DATABASE_URL=sqlite:///./data/sfu_scheduler.db
   SECRET_KEY=your-secret-key-change-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

5. **Run backend:**
   ```bash
   python main.py
   ```

#### Frontend

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

## 🌐 Production Deployment

### Architecture Overview
```
[User Browser]
     ↓
[Vercel Frontend] → https://sfucourseplanner.me
     ↓ HTTPS
[AWS EC2 + Nginx] → https://api.sfucourseplanner.me
     ↓
[Docker: FastAPI + SQLite]
```

### Backend Deployment (AWS EC2)

1. **Launch EC2 instance:**
   - Ubuntu 22.04 LTS
   - t2.micro or larger
   - Security Groups: Allow ports 80, 443, 8000, 22

2. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose nginx certbot python3-certbot-nginx -y
   ```

3. **Clone repository:**
   ```bash
   git clone https://github.com/yourusername/SFU-Course-Tracker.git
   cd SFU-Course-Tracker
   ```

4. **Configure Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   ```nginx
   server {
       listen 80;
       server_name api.sfucourseplanner.me;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

5. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d api.sfucourseplanner.me
   ```

6. **Update `.env` with production values**

7. **Deploy with Docker:**
   ```bash
   docker compose up -d --build
   ```

### Frontend Deployment (Vercel)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set environment variables in Vercel Dashboard:**
   - Variable: `VITE_API_URL`
   - Value: `https://api.sfucourseplanner.me/api/v1`

4. **Add custom domain:**
   - Go to Vercel Dashboard → Project → Settings → Domains
   - Add: `sfucourseplanner.me` and `www.sfucourseplanner.me`
   - Update DNS in Namecheap as shown by Vercel

## 🗄️ Database Schema

### Models

**User**
- `id`: Integer (Primary Key)
- `email`: String (Unique)
- `password`: String (Hashed)
- `completed_courses`: JSON Array
- `created_at`: DateTime
- `updated_at`: DateTime

**Course**
- `id`: Integer (Primary Key)
- `dept`: String (e.g., "CMPT")
- `number`: String (e.g., "225")
- `title`: String
- `credits`: Integer
- `prerequisites`: String (JSON)

**Section**
- `id`: Integer (Primary Key)
- `course_id`: Foreign Key → Course
- `section_code`: String
- `instructor`: String
- `schedule`: String
- `enrollment_total`: Integer
- `enrollment_cap`: Integer

**Watcher**
- `id`: Integer (Primary Key)
- `user_id`: Foreign Key → User
- `section_id`: Foreign Key → Section
- `created_at`: DateTime

## 📊 API Documentation

Interactive API docs available at:
- **Local**: http://localhost:8000/docs
- **Production**: https://api.sfucourseplanner.me/docs

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get JWT token |
| GET | `/api/v1/courses` | Get all courses (with filters) |
| GET | `/api/v1/departments` | Get all 76 departments |
| GET | `/api/v1/user/me` | Get current user profile |
| PUT | `/api/v1/user/courses` | Update completed courses |
| POST | `/api/v1/watchers` | Add course watcher |
| GET | `/api/v1/watchers` | Get user's watchers |

## 🔄 Data Sources

Course data is fetched from official SFU APIs:
- **Course Outlines API**: `https://www.sfu.ca/bin/wcm/course-outlines`
- **Student Portal**: `https://courses.students.sfu.ca`

### Update Course Data

```bash
cd backend/crawler
python test_crawler.py
```

This will fetch latest course data for all 76 departments.

## 🔐 Environment Variables

### Backend (`.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `sqlite:///./data/sfu_scheduler.db` |
| `SECRET_KEY` | JWT secret (CHANGE IN PROD!) | - |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry (minutes) | `1440` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | - |

### Frontend (`.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📦 Docker Configuration

### Database Persistence

Database is persisted using Docker volumes to survive container restarts:

```yaml
volumes:
  - ./backend_data:/app/data  # Database files
  - ./backend:/app            # Source code (dev only)
```

### Rebuilding Containers

```bash
# Rebuild and restart
docker compose up -d --build

# View logs
docker compose logs -f backend

# Stop all services
docker compose down
```

## 🗺️ Roadmap

- [x] All 76 SFU departments
- [x] User authentication
- [x] Course search & filtering
- [x] Custom domain with SSL
- [x] Persistent database
- [ ] Email notifications for seat availability
- [ ] Course comparison tool
- [ ] Visual schedule builder
- [ ] RateMyProfessor integration
- [ ] Export schedule to calendar (ICS)
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Simon Fraser University for providing public course APIs
- FastAPI and React communities for excellent documentation
- Vercel and AWS for reliable hosting infrastructure

## 📧 Contact

For questions, issues, or suggestions, please:
- Open an issue on GitHub
- Visit the live site: [sfucourseplanner.me](https://www.sfucourseplanner.me)

---

**Built with ❤️ for SFU students by students**
