# 🎓 SFU Course Prerequisite Tracker

A full-stack web application that helps Simon Fraser University (SFU) CS students track their completed courses and discover which courses they're eligible to take next based on prerequisite requirements.

## 🚀 Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Course Management**: View all available CMPT courses with their prerequisites
- **Progress Tracking**: Mark courses as completed and save your academic progress
- **Smart Eligibility Detection**: Automatically calculates which courses you can take based on:
  - AND prerequisites (must complete all required courses)
  - OR prerequisites (must complete at least one course from each group)
- **Responsive Design**: Clean, modern UI that works on desktop and mobile devices

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js** - RESTful API server
- **TypeScript** - Type-safe development
- **Prisma ORM** - Database modeling and migrations
- **PostgreSQL** - Relational database
- **JWT** - Secure authentication
- **bcrypt** - Password hashing

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **HTML5 & CSS3** - Responsive design with modern styling

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ttn54/SFU-Course-Tracker.git
cd SFU-Course-Tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/sfu_tracker?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
```

Replace `username` and `password` with your PostgreSQL credentials.

### 4. Set Up the Database

Create the database:

```bash
createdb sfu_tracker
```

Run Prisma migrations:

```bash
npx prisma migrate dev
```

### 5. Seed the Database

Populate the database with course data:

```bash
npm run seed
```

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

#### Register a New User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "token": "jwt-token-here"
}
```

### User Endpoints

#### Get Current User Profile
```http
GET /api/user/me
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Completed Courses
```http
PUT /api/user/courses
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "completedCourses": ["CMPT 120", "CMPT 125", "MACM 101"]
}
```

### Course Endpoints

#### Get All Courses
```http
GET /api/courses
```

#### Get Eligible Courses
```http
GET /api/courses/eligible
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🗄️ Database Schema

### User Model
```prisma
model User {
  id               Int      @id @default(autoincrement())
  email            String   @unique
  password         String
  completedCourses String[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### Course Model
```prisma
model Course {
  id              Int      @id @default(autoincrement())
  code            String   @unique
  name            String
  prerequisites   String[]  // AND prerequisites
  prerequisitesOr String[]  // OR prerequisites (groups separated by |)
}
```

## 🧮 Prerequisite Logic

The eligibility algorithm handles complex prerequisite requirements:

1. **AND Prerequisites**: All courses in the `prerequisites` array must be completed
2. **OR Prerequisites**: For each group in `prerequisitesOr`, at least one course from that group must be completed

**Example:** CMPT 295 requires:
- `prerequisites: ["MACM 101"]` - Must complete MACM 101
- `prerequisitesOr: ["CMPT 125|CMPT 128", "CMPT 127|CMPT 129"]` - Must complete (CMPT 125 OR 128) AND (CMPT 127 OR 129)

## 📁 Project Structure

```
SFU-Course-Tracker/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Seed data
│   └── migrations/             # Database migrations
├── src/
│   ├── server.ts               # Express server setup
│   ├── controllers/            # Request handlers
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   └── courseController.ts
│   ├── routes/                 # API routes
│   │   ├── authRoutes.ts
│   │   ├── userRoutes.ts
│   │   └── courseRoutes.ts
│   ├── middleware/
│   │   └── auth.ts             # JWT authentication
│   └── utils/
│       └── prisma.ts           # Prisma client
├── public/                     # Frontend files
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env                        # Environment variables
├── package.json
└── tsconfig.json
```

## 🚦 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run seed` - Seed the database with course data
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations

## 🔒 Security Features

- Passwords are hashed using **bcrypt** before storage
- JWT tokens for stateless authentication
- Protected routes with middleware authentication
- Input validation on all endpoints

## 🎯 Future Enhancements

- [ ] Add more SFU departments (MATH, MACM, STAT, etc.)
- [ ] Course recommendation system
- [ ] Degree progress tracking
- [ ] Export academic plan to PDF
- [ ] Integration with SFU's official course catalog API

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

ISC

## 👤 Author

**ttn54**
- GitHub: [@ttn54](https://github.com/ttn54)

## 🙏 Acknowledgments

- Course data based on SFU's Computing Science program requirements
- Built as a portfolio project

---

**Note:** This is an independent project and is not officially affiliated with Simon Fraser University.
