# 🏨 Hotel Booking REST API

A production-ready RESTful API for a Hotel Booking System built with NestJS, TypeScript, Prisma, and MySQL.

> ITCS258 Backend Application Development — Faculty of ICT, Mahidol University

---

## 👥 Team Members

| Name | Student ID | Responsibilities |
|---|---|---|
| [Name 1] | [ID] | Core API, Rooms, Bookings |
| [Name 2] | [ID] | Auth, RBAC, Security, Caching |
| [Name 3] | [ID] | Testing, Docker, Deployment |

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Running with Docker](#running-with-docker)
- [API Documentation](#api-documentation)
- [API Usage Examples](#api-usage-examples)
- [Caching & Rate Limiting](#caching--rate-limiting)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known Issues & Limitations](#known-issues--limitations)

---

## Project Overview

This API powers a hotel booking platform supporting three user types:

- **Guest** — Can browse and search rooms without an account
- **Regular User** — Can register, login, and manage their own bookings
- **Admin** — Can manage all rooms and all bookings in the system

### Key Features

- JWT-based authentication with role-based access control (RBAC)
- Room management with image support
- Booking system with double-booking prevention
- Room search by date range and capacity
- Notification recording for booking events
- Redis caching and rate limiting
- Swagger/OpenAPI documentation
- Dockerized for production deployment

---

## Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript |
| Framework | NestJS |
| Database | MySQL |
| ORM | Prisma |
| Authentication | JWT (JSON Web Token) |
| Caching & Rate Limiting | Redis |
| Testing | Jest + Supertest |
| Containerization | Docker & Docker Compose |
| API Documentation | Swagger / OpenAPI |

---

## Architecture

```
src/
├── auth/                  # Login, signup, logout
├── users/                 # Profile view & update
├── rooms/                 # Room CRUD (Admin), listing (all)
├── bookings/              # Booking creation & management
├── search/                # Room search by date & capacity
├── notifications/         # Booking event records
├── health/                # Health check endpoint
├── prisma/                # Prisma service wrapper
├── common/                # Shared guards, filters, decorators
├── app.module.ts
└── main.ts
```

### Request Flow

```
Client Request
     ↓
Controller  (receive & validate request)
     ↓
Guard       (JWT auth + Role check)
     ↓
Service     (business logic)
     ↓
Prisma      (database operations)
     ↓
Response
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js >= 18
- npm >= 9
- MySQL 8
- Redis
- Docker & Docker Compose (for containerized setup)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/hotel-booking-api.git
cd hotel-booking-api

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env
# Then fill in your values in .env

# 4. Run database migrations
npx prisma migrate dev

# 5. (Optional) Seed the database
npx prisma db seed
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/hotel_booking

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
PORT=3000
NODE_ENV=development
```

> ⚠️ Never commit your real `.env` file. Only `.env.example` should be in the repository.

---

## Running the App

### Development (without Docker)

```bash
# Start in development mode (with hot reload)
npm run start:dev

# Start in production mode
npm run start:prod

# Build the project
npm run build
```

API will be available at: `http://localhost:3000`

### Development (with Docker)

```bash
# Start all services (API + MySQL + Redis)
docker compose up

# Start in background
docker compose up -d

# Stop all services
docker compose down

# Rebuild after code changes
docker compose up --build
```

---

## Running with Docker

### Build Docker Image

```bash
docker build -t hotel-booking-api .
```

### Run with Docker Compose

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f api

# Stop everything
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v
```

### Services

| Service | Port | Description |
|---|---|---|
| api | 3000 | NestJS REST API |
| db | 3306 | MySQL Database |
| redis | 6379 | Redis Cache |

---

## API Documentation

Swagger UI is available at:

```
http://localhost:3000/api/docs
```

Or on the deployed server:

```
https://your-deployed-url.com/api/docs
```

The documentation covers all endpoints including request/response schemas, authentication requirements, and example values.

---

## API Usage Examples

### 1. Sign Up

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Search Available Rooms

```bash
curl "http://localhost:3000/search/rooms?checkIn=2026-05-01&checkOut=2026-05-05&capacity=2"
```

### 4. Create a Booking (requires JWT)

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 1,
    "checkIn": "2026-05-01T14:00:00Z",
    "checkOut": "2026-05-05T12:00:00Z"
  }'
```

### Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@hotel.com | admin1234 |
| Regular User | user@hotel.com | user1234 |

---

## Caching & Rate Limiting

### Caching Strategy (Redis)

| Endpoint | TTL | Reason |
|---|---|---|
| `GET /rooms` | 60 seconds | Frequently accessed, changes infrequently |
| `GET /rooms/:id` | 60 seconds | Room details are stable |
| `GET /search/rooms` | 30 seconds | High traffic, shorter TTL for availability freshness |

Cache is automatically invalidated when an Admin creates, updates, or deactivates a room.

### Rate Limiting Strategy

| Endpoint | Limit | Window | Reason |
|---|---|---|---|
| `POST /auth/login` | 10 requests | per minute per IP | Prevent brute force attacks |
| `POST /auth/signup` | 5 requests | per minute per IP | Prevent spam accounts |
| `POST /bookings` | 20 requests | per minute per user | Prevent booking spam |

---

## Testing

### Run All Tests

```bash
# Unit tests
npm test

# Unit tests with coverage report
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode (during development)
npm run test:watch
```

### Test Structure

```
test/
├── unit/
│   ├── auth.service.spec.ts         # Password hashing, token generation
│   ├── bookings.service.spec.ts     # Date validation, double booking, status transitions
│   └── rooms.service.spec.ts        # Room CRUD logic
├── integration/
│   ├── auth.controller.spec.ts      # Signup, login endpoints
│   ├── rooms.controller.spec.ts     # Room CRUD as Admin
│   └── bookings.controller.spec.ts  # Booking creation, conflict prevention
└── e2e/
    ├── user-flow.e2e-spec.ts        # Signup → Login → Search → Book → Cancel
    └── admin-flow.e2e-spec.ts       # Login → Create Room → View Bookings → Approve
```

### Test Results

```
Test Suites: ___ passed, ___ total
Tests:       ___ passed, ___ total
Coverage:    ___%
```

> Run `npm run test:cov` to generate the latest coverage report.

---

## API Testing Document

### Overview

This project implements three levels of automated testing to ensure correctness, reliability, and maintainability.

---

### Unit Tests

Unit tests cover core business logic in isolation without hitting the database.

| Test File | What is Tested |
|---|---|
| `auth.service.spec.ts` | Password hashing, JWT token generation |
| `bookings.service.spec.ts` | Date validation, double-booking prevention, status transitions |
| `rooms.service.spec.ts` | Room creation, update, deactivation logic |

#### Test Cases — Bookings Service

| # | Test Case | Expected Result |
|---|---|---|
| 1 | checkIn is before checkOut | Pass — booking is valid |
| 2 | checkIn is after checkOut | Fail — throw BadRequestException |
| 3 | checkIn equals checkOut | Fail — throw BadRequestException |
| 4 | checkIn is in the past | Fail — throw BadRequestException |
| 5 | Room is available for dates | Pass — booking created |
| 6 | Room already booked for overlapping dates | Fail — throw ConflictException |
| 7 | PENDING → APPROVED (Admin) | Pass — status updated |
| 8 | PENDING → CANCELLED (Admin or User) | Pass — status updated |
| 9 | APPROVED → PAID (Admin) | Pass — status updated |
| 10 | PAID → PENDING (invalid transition) | Fail — throw BadRequestException |

#### Test Cases — Auth Service

| # | Test Case | Expected Result |
|---|---|---|
| 1 | Register with valid data | Pass — user created, password hashed |
| 2 | Register with duplicate email | Fail — throw ConflictException |
| 3 | Login with correct credentials | Pass — returns JWT token |
| 4 | Login with wrong password | Fail — throw UnauthorizedException |

---

### Integration Tests

Integration tests verify that API endpoints work correctly end-to-end with a test database.

| Test File | What is Tested |
|---|---|
| `auth.controller.spec.ts` | POST /auth/signup, POST /auth/login |
| `rooms.controller.spec.ts` | Room CRUD endpoints as Admin |
| `bookings.controller.spec.ts` | Booking creation, conflict prevention, status updates |

#### Test Cases — Auth Endpoints

| # | Method | Path | Input | Expected Status |
|---|---|---|---|---|
| 1 | POST | /auth/signup | Valid name/email/password | 201 Created |
| 2 | POST | /auth/signup | Missing email | 400 Bad Request |
| 3 | POST | /auth/signup | Duplicate email | 409 Conflict |
| 4 | POST | /auth/login | Correct credentials | 200 OK + token |
| 5 | POST | /auth/login | Wrong password | 401 Unauthorized |

#### Test Cases — Rooms Endpoints (Admin)

| # | Method | Path | Input | Expected Status |
|---|---|---|---|---|
| 1 | POST | /rooms | Valid room data (Admin) | 201 Created |
| 2 | POST | /rooms | No auth token | 401 Unauthorized |
| 3 | POST | /rooms | Regular User token | 403 Forbidden |
| 4 | PATCH | /rooms/:id | Valid update (Admin) | 200 OK |
| 5 | DELETE | /rooms/:id | Valid id (Admin) | 200 OK |
| 6 | GET | /rooms | No token (Guest) | 200 OK |

#### Test Cases — Bookings Endpoints

| # | Method | Path | Input | Expected Status |
|---|---|---|---|---|
| 1 | POST | /bookings | Valid dates + available room | 201 Created |
| 2 | POST | /bookings | Overlapping dates | 409 Conflict |
| 3 | POST | /bookings | checkOut before checkIn | 400 Bad Request |
| 4 | POST | /bookings | No auth token | 401 Unauthorized |
| 5 | GET | /bookings/me | Valid user token | 200 OK |
| 6 | GET | /bookings | Admin token | 200 OK (all bookings) |
| 7 | GET | /bookings | User token | 403 Forbidden |
| 8 | PATCH | /bookings/:id/status | Admin approves booking | 200 OK |

---

### End-to-End (E2E) Tests

E2E tests simulate realistic user flows from start to finish.

#### Flow 1: Regular User Booking Flow

```
1. POST /auth/signup          → 201 Created
2. POST /auth/login           → 200 OK, receive token
3. GET  /search/rooms         → 200 OK, see available rooms
4. POST /bookings             → 201 Created, status = PENDING
5. GET  /bookings/me          → 200 OK, booking appears in list
6. GET  /bookings/me/:id      → 200 OK, booking detail correct
7. PATCH /bookings/:id/status → User cancels → 200 OK, status = CANCELLED
8. GET  /notifications/me     → 200 OK, BOOKING_CANCELLED event recorded
```

#### Flow 2: Admin Management Flow

```
1. POST /auth/login           → Login as Admin → 200 OK, receive token
2. POST /rooms                → Create new room → 201 Created
3. POST /rooms/:id/images     → Upload image → 201 Created
4. GET  /rooms/:id            → Room detail includes image → 200 OK
5. GET  /bookings             → View all bookings → 200 OK
6. PATCH /bookings/:id/status → Approve booking → 200 OK, status = APPROVED
7. PATCH /bookings/:id/status → Mark as Paid → 200 OK, status = PAID
8. PATCH /rooms/:id           → Deactivate room → 200 OK, status = DEACTIVATED
```

---

### Running Tests

```bash
# Run unit tests
npm test

# Run unit tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test && npm run test:e2e
```

### Test Results

```
Unit Tests:
  Test Suites: ___ passed, ___ total
  Tests:       ___ passed, ___ total

E2E Tests:
  Test Suites: ___ passed, ___ total
  Tests:       ___ passed, ___ total

Coverage:      ___%
```

> ⚠️ Fill in actual results after running `npm run test:cov`

---

## Deployment

### Deployed URL

```
https://your-deployed-url.com
```

### Deployment Environment

- **Platform:** [e.g., AWS EC2 / Railway / Render / DigitalOcean]
- **OS:** Ubuntu 22.04
- **Docker:** Yes

### Deployment Steps

```bash
# 1. SSH into the server
ssh user@your-server-ip

# 2. Clone the repository
git clone https://github.com/your-repo/hotel-booking-api.git
cd hotel-booking-api

# 3. Set up environment variables
cp .env.example .env
nano .env  # fill in production values

# 4. Build and start with Docker Compose
docker compose -f docker-compose.prod.yml up -d --build

# 5. Run database migrations
docker compose exec api npx prisma migrate deploy

# 6. Verify health check
curl https://your-deployed-url.com/health
```

### Health Check

```bash
GET /health

# Response
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-04-22T10:00:00Z"
}
```

---

## Known Issues & Limitations

- Image upload currently stores file metadata only; actual file storage uses local disk (not cloud storage like S3)
- Payment processing is not implemented — `PAID` status must be set manually by Admin
- No email notifications — notifications are stored in DB for frontend polling only

---

## License

This project is for educational purposes only — ITCS258, Faculty of ICT, Mahidol University.
