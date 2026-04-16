# **ITCS258 Backend Application Development**



## Unit Project: Hotel Booking REST API System
A production-ready RESTful API for managing hotel room bookings, built with **NestJS**, **Prisma ORM**, and **MySQL**. Features JWT authentication, role-based access control (RBAC), in-memory caching, global rate limiting, event-driven notifications, full Docker containerization, and deployment to a provided or public server (e.g., cloud VM or platform).

## Team Members
* Supawit Sirikulpiboon 6688166
* Passakorn Piboonmahachotikul 6688173
* Poschapat	Phetcharawut 6688209

---

## 📋 Table of Contents

- [Project Overview & Architecture](#-project-overview--architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Section 1 — Local Development](#-section-1--local-development)
- [Section 2 — Docker / Server Deployment](#-section-2--docker--server-deployment)
- [API Documentation](#-api-documentation)
- [API Usage Examples](#-api-usage-examples)
- [Caching Strategy](#-caching-strategy)
- [Rate Limiting Strategy](#-rate-limiting-strategy)
- [Performance Benchmark Results](#-performance-benchmark-results)
- [Limitations & Known Issues](#-limitations--known-issues)

---

## 🏗️ Project Overview & Architecture



### Local Development Architecture
```
 ┌──────────┐           ┌──────────────────────────┐           ┌──────────┐
 │  Client  │   :3000   │       NestJS API         │           │  MySQL   │
 │ (Browser/│──────────▶│                          │──────────▶│  8.0     │
 │  Postman)│           │  ┌──────────┐ ┌─────────┐│           │(localhost│
 └──────────┘           │  │ In-Memory│ │Throttler││           │  :3306)  │
                        │  │  Cache   │ │  Guard  ││           └──────────┘
                        │  └──────────┘ └─────────┘│
                        └──────────────────────────┘
```
> In **local development**, your client connects directly to NestJS on port `3000`. No Nginx or Docker is required — just Node.js and a MySQL database.

___
### Docker / Production Architecture
```
                        ┌──────────────────────────────────────────────────────┐
                        │              Docker Compose Network                  │
                        │                                                      │
 ┌──────────┐    :80    │  ┌─────────┐  :3000   ┌─────────┐    ┌─────────┐     │
 │  Client  │──────────▶│  │  Nginx  │─────────▶│ NestJS  │───▶│ MySQL   │     │
 │ (Browser/│           │  │  Proxy  │          │   API   │    │  8.0    │     │
 │  Postman)│           │  └─────────┘          │┌──────┐ │    └─────────┘     │
 └──────────┘           │                       ││Cache │ │    ┌─────────┐     │
                        │                       │└──────┘ │    │  Redis  │     │
                        │                       └─────────┘    │  7.x    │     │
                        |                                      └─────────┘     |
                        └──────────────────────────────────────────────────────┘
```
> In **Docker/production**, Nginx on port `80` reverse-proxies `/api/*` to the internal NestJS container.

### Key Features

| Feature | Description |
|---------|-------------|
| **Authentication** | JWT-based login/register with bcrypt password hashing (12 salt rounds) |
| **Authorization** | Role-based access control (`USER` / `ADMIN`) via custom guards |
| **Room Management** | Full CRUD for hotel rooms (Admin) with image URL support |
| **Booking System** | Create, view, and manage bookings with date validation and conflict detection |
| **Notifications** | Event-driven notifications via `@nestjs/event-emitter` on booking create/cancel |
| **Caching** | In-memory cache with `@nestjs/cache-manager` on public read endpoints (60s TTL) |
| **Rate Limiting** | Global `@nestjs/throttler` guard (60 req/60s) with stricter limits on auth endpoints |
| **Health Check** | `/api/health` endpoint using `@nestjs/terminus` for Docker and monitoring tools |
| **API Docs** | Auto-generated Swagger UI at `/api/docs` |
| **Containerization** | Multi-stage Dockerfile with non-root user, Docker Compose orchestration |

### Data Model (Prisma Schema)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    users     │     │    rooms     │     │   bookings   │     │  notifications   │
├──────────────┤     ├──────────────┤     ├──────────────┤     ├──────────────────┤
│ id (PK)      │     │ id (PK)      │     │ Booking_ID   │     │ id (PK)          │
│ username (U) │     │ name         │     │ Room_ID      │     │ username         │
│ userPassword │     │ description  │     │ username     │     │ message          │
│ email (U)    │     │ capacity     │     │ check_in     │     │ is_read          │
│ roles (ENUM) │     │ price/night  │     │ check_out    │     │ create_at        │
│              │     │ image_url    │     │ status (ENUM)│     │                  │
│              │     │ is_active    │     └──────────────┘     └──────────────────┘
│              │     │ start_date   │
│              │     │ end_date     │     Enums:
│              │     │ created_at   │       users_roles     → USER | ADMIN
│              │     │ updated_at   │       bookings_status → Pending | Approved
└──────────────┘     └──────────────┘                          | Cancelled | Paid
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | NestJS 11 (Node.js 20) |
| **Language** | TypeScript 5 |
| **ORM** | Prisma 7 with `@prisma/adapter-mariadb` |
| **Database** | MySQL 8.0 |
| **Cache** | In-memory (`cache-manager` 7.x) |
| **Auth** | Passport + JWT (`@nestjs/jwt`) + bcrypt |
| **Validation** | `class-validator` + `class-transformer` |
| **Docs** | Swagger (`@nestjs/swagger`) |
| **Rate Limiting** | `@nestjs/throttler` 6.x |
| **Health Check** | `@nestjs/terminus` |
| **Events** | `@nestjs/event-emitter` |
| **Containerization** | Docker + Docker Compose + Nginx |
| **Testing** | Jest + Supertest + autocannon |

---

## 📁 Project Structure

```
nest-hotel-booking-system/
├── src/
│   ├── auth/                  # Authentication module (login, register, logout)
│   │   ├── decorators/        # @GetUser, @Roles custom decorators
│   │   ├── dto/               # LoginDto
│   │   ├── guards/            # JwtAuthGuard, RolesGuard
│   │   └── strategies/        # JWT Passport strategy
│   ├── bookings/              # Booking management module
│   │   └── dto/               # CreateBookingDto, UpdateBookingDto
│   ├── health/                # Health check endpoint (@SkipThrottle)
│   ├── prisma/                # Prisma service (database connection)
│   ├── rooms/                 # Room management module
│   │   └── dto/               # CreateRoomDto, UpdateRoomDto, UpdateRoomImageDto
│   ├── user/                  # User profile management module
│   │   └── dto/               # CreateUserDto, UpdateUserDto, ChangePasswordDto
│   ├── app.module.ts          # Root module (Cache, Throttler, EventEmitter config)
│   └── main.ts                # Bootstrap (global prefix, Swagger, ValidationPipe)
├── test/
│   ├── app.e2e-spec.ts                  # End-to-end tests (21 test cases)
│   ├── Cache-RateLimiting_Benchmark.js  # autocannon benchmark script
│   ├── performance_test.sh              # curl-based performance test
│   └── jest-e2e.json                    # E2E Jest configuration
├── prisma/
│   └── schema.prisma          # Database schema definition
├── database/
│   └── HotelBookingSystem_DB.sql  # Initial seed data (rooms, admin user)
├── nginx/
│   └── nginx.conf             # Reverse proxy config (/api/ → NestJS)
├── Dockerfile                 # Multi-stage build (builder → production)
├── docker-compose.yml         # Service orchestration (Nginx, API, MySQL, Redis)
├── .env.example               # Environment variable template
└── package.json               # Dependencies and npm scripts
```

---

## 💻 Section 1 — Local Development

### Prerequisites

- **Node.js** 20+ and **npm** (check: `node -v`)
- **MySQL** 8.0 running locally (or via Docker for just the database)

### Step 1: Install Dependencies

```bash
git clone <repository-url>
cd nest-hotel-booking-system
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit the `.env` file — for **local development** you only need these two variables:

```env
# Local Database Connection
DATABASE_URL=mysql://YOUR_USER:YOUR_PASSWORD@localhost:3306/HotelBookingSystem_DB

# JWT Secret (any string you want)
JWT_SECRET=your_jwt_secret_key_here
```

> If you get a MariaDB adapter error, append `?allowPublicKeyRetrieval=true` to the `DATABASE_URL`.

### Step 3: Setup Database

```bash
# Generate the Prisma client
npx prisma generate

# Push the schema to your MySQL database (creates all tables)
npx prisma db push
```

### Step 4: Start the Server

```bash
# Standard start
npm run start

# Development mode (auto-reload on file changes)
npm run start:dev

# Debug mode
npm run start:debug
```

The server starts at:
- **API**: `http://localhost:3000/api/`
- **Swagger Docs**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/api/health`

### Step 5: Stop the Server

Press `Ctrl + C` in the terminal where the server is running.

---

### Running Tests (Local)

#### Unit Tests — 11 suites, 111 tests

Unit tests test each service and controller in isolation with mocked dependencies. **No running server or database is required.**

```bash
# Run all unit tests
npm test

# Run with watch mode (re-runs on file changes)
npm run test:watch

# Run with coverage report
npm run test:cov

# Run a single test file
npm test -- src/rooms/rooms.service.spec.ts
```

**Expected output:**
```
PASS  src/app.controller.spec.ts               (1 test)
PASS  src/auth/auth.controller.spec.ts          (5 tests)
PASS  src/auth/auth.service.spec.ts             (13 tests)
PASS  src/bookings/bookings.controller.spec.ts  (5 tests)
PASS  src/bookings/bookings.service.spec.ts     (15 tests)
PASS  src/health/health.controller.spec.ts      (2 tests)
PASS  src/prisma/prisma.service.spec.ts         (1 test)
PASS  src/rooms/rooms.controller.spec.ts        (8 tests)
PASS  src/rooms/rooms.service.spec.ts           (19 tests)
PASS  src/user/user.controller.spec.ts          (3 tests)
PASS  src/user/user.service.spec.ts             (19 tests)

Test Suites: 11 passed, 11 total
Tests:       111 passed, 111 total
```

#### E2E Tests — 1 suite, 21 tests

E2E tests use Supertest to send real HTTP requests through the full NestJS application with mocked database. **No running server or database is required** (the test creates its own app instance).

```bash
npm run test:e2e
```

**Test Flows:**

| Flow | Tests | What It Covers |
|------|-------|----------------|
| **Flow 1: User Journey** | 7 | register → login → browse rooms → create booking → list bookings → view profile → logout |
| **Flow 2: Admin Journey** | 7 | login → create room → verify room → edit room → list bookings → approve booking → disable room |
| **Flow 3: Authorization** | 3 | USER can't access admin endpoints, unauthenticated can't access protected routes |
| **Flow 4: Cache & Rate Limit** | 4 | Cache works on GET /rooms, not on bookings; throttle on login; health skips throttle |

**Expected output:**
```
PASS  test/app.e2e-spec.ts
  Hotel Booking API (e2e)
    Flow 1: User Journey         — 7 tests ✓
    Flow 2: Admin Journey        — 7 tests ✓
    Authorization enforcement    — 3 tests ✓
    Caching & Rate Limiting      — 4 tests ✓

Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
```

#### Performance & Benchmark Tests

> ⚠️ **Prerequisite:** The server must be running (`npm run start`) before running these.

```bash
# autocannon benchmark — cache comparison + rate limit verification
# Includes a 62-second cooldown for accurate rate limit results
node test/Cache-RateLimiting_Benchmark.js http://localhost:3000

# curl-based functional test (no extra dependencies needed)
bash test/performance_test.sh http://localhost:3000
```

---

## 🐳 Section 2 — Docker/Server Deployment

### Prerequisites

- **Docker** 20+ (check: `docker -v`)
- **Docker Compose** v2+ (check: `docker compose version`)

### Architecture

```
docker-compose.yml orchestrates 4 services:

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Nginx   │────▶│   API    │────▶│  MySQL   │     │  Redis   │
  │  :80     │     │  :3000   │     │  :3306   │     │  :6379   │
  │ (public) │     │(internal)│     │(internal)│     │(internal)│
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

- **Nginx** — Public entry point (port 80), reverse-proxies `/api/*` → NestJS
- **API** — NestJS application (no host port — **only accessible through Nginx**)
- **MySQL** — Database with health check and seed data auto-loading on first boot
- **Redis** — Available for future session/queue management

### Step 1: Clone the project & Configure Environment

```bash
git clone <repository-url>
cp .env.example .env
```

Edit the `.env` file — for **Docker** you need the full configuration:

```env
# JWT
JWT_SECRET=your_jwt_secret_key_here

# Docker Configuration
PORT=3000
NODE_ENV=production

# Database Credentials
MYSQL_ROOT_PASSWORD=your_mysql_root_password
MYSQL_DATABASE=HotelBookingSystem_DB
MYSQL_USER=ProjectBE_ADMIN
MYSQL_PASSWORD=your_mysql_user_password

# Service Hosts & Ports (Docker internal network names)
DB_HOST=mysql
DB_PORT=3306
MYSQL_HOST_PORT=3307
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_HOST_PORT=6379

# Docker Connection String (uses container name "mysql" as host)
DOCKER_DATABASE_URL=mysql://ProjectBE_ADMIN:your_mysql_user_password@mysql:3306/HotelBookingSystem_DB
```

### Step 2: Build and Start All Services

```bash
# Build images and start all containers in detached mode
docker compose up --build -d
```

This will:
1. Build the NestJS app using the multi-stage Dockerfile
2. Start MySQL and wait for it to be healthy
3. Auto-load `database/HotelBookingSystem_DB.sql` into MySQL on first boot
4. Start Redis and wait for it to be healthy
5. Start the NestJS API (runs `prisma db push` then `node dist/src/main.js`)
6. Start Nginx reverse proxy

### Step 3: Verify Services

```bash
# Check all containers are running and healthy
docker compose ps

# Test the API through Nginx
curl http://localhost/api/health

# View API logs
docker compose logs -f api
```

The services are available at:
- **API (through Nginx)**: `http://localhost/api/`
- **Swagger Docs**: `http://localhost/api/docs`
- **Health Check**: `http://localhost/api/health`
- **MySQL (direct access)**: `localhost:3307` (mapped port)
- **Redis (direct access)**: `localhost:6379`

### Step 4: Stop All Services

```bash
# Stop all containers (data is preserved in Docker volumes)
docker compose down

# Stop and DELETE all data (reset database completely)
docker compose down -v
```

### Rebuilding After Code Changes

```bash
# Rebuild and restart only the API container
docker compose up --build -d api

# Rebuild everything from scratch
docker compose down
docker compose up --build -d
```

### Database Re-seeding

Seed data (`database/HotelBookingSystem_DB.sql`) only loads on the **first startup** when the MySQL data volume is empty. To re-seed:

```bash
docker compose down -v        # Remove all volumes (deletes all data!)
docker compose up --build -d  # Fresh start with seed data
```

### Dockerfile Explained

The Dockerfile uses a **two-stage build** for a smaller, more secure production image:

| Stage | What Happens | Included in Final Image? |
|-------|-------------|--------------------------|
| **Stage 1: Builder** | `npm ci` → `prisma generate` → `npm run build` (compiles TypeScript) | ❌ No (discarded) |
| **Stage 2: Production** | `npm ci --omit=dev` → copies compiled `dist/` from builder → runs as non-root `appuser` | ✅ Yes |

**Security:** The production container runs as a non-root user (`appuser`) to prevent privilege escalation.

---

### Running Tests (Docker / Server)

#### Unit & E2E Tests Inside Docker

```bash
# Run unit tests inside the running API container
docker compose exec api npm test

# Run E2E tests inside the container
docker compose exec api npm run test:e2e
```

#### Performance Tests Against Docker

> The server must be running via Docker (`docker compose up -d`).

```bash
# autocannon benchmark against Nginx (port 80)
node test/Cache-RateLimiting_Benchmark.js http://localhost

# curl-based test against Nginx (port 80)
bash test/performance_test.sh http://localhost
```

> **Note:** When testing against Docker, use `http://localhost` (port 80, Nginx) instead of `http://localhost:3000` (which is not exposed in Docker).

### Useful Docker Commands

```bash
# View real-time API logs
docker compose logs -f api

# Open a shell inside the API container
docker compose exec api sh

# Check MySQL connectivity
docker compose exec mysql mysqladmin ping -h localhost -u root -p<password>

# View Nginx access logs
docker compose logs -f nginx
```

---

## 📖 API Documentation

### Swagger UI

Once the server is running, visit the interactive Swagger documentation:
- **Local:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Docker:** [http://localhost/api/docs](http://localhost/api/docs)

### Endpoint Reference

#### 🔐 Auth (`/api/auth`)

| Method | Endpoint | Auth | Role | Rate Limit | Description |
|--------|----------|------|------|------------|-------------|
| `POST` | `/api/auth/register` | ❌ | — | **10 req/60s** | Register a new user |
| `POST` | `/api/auth/login` | ❌ | — | **10 req/60s** | Login and receive JWT |
| `POST` | `/api/auth/logout` | ✅ JWT | Any | 60 req/60s | Invalidate JWT token |

#### 🛏️ Rooms (`/api/rooms`)

| Method | Endpoint | Auth | Role | Rate Limit | Cached | Description |
|--------|----------|------|------|------------|--------|-------------|
| `GET` | `/api/rooms` | ❌ | — | 60 req/60s | ✅ 60s | List all rooms |
| `GET` | `/api/rooms/:id` | ❌ | — | 60 req/60s | ✅ 60s | Get room by ID |
| `GET` | `/api/rooms/search` | ✅ JWT | USER | 60 req/60s | ✅ 30s | Search rooms (date, capacity) |
| `POST` | `/api/rooms` | ✅ JWT | ADMIN | 60 req/60s | ❌ | Create a new room |
| `PATCH` | `/api/rooms/:id/edit` | ✅ JWT | ADMIN | 60 req/60s | ❌ | Edit room details |
| `DELETE` | `/api/rooms/:id/delete` | ✅ JWT | ADMIN | 60 req/60s | ❌ | Delete a room |
| `PATCH` | `/api/rooms/:id/disable` | ✅ JWT | ADMIN | 60 req/60s | ❌ | Deactivate a room |
| `PATCH` | `/api/rooms/:id/enable` | ✅ JWT | ADMIN | 60 req/60s | ❌ | Reactivate a room |
| `POST` | `/api/rooms/:id/upload-image` | ✅ JWT | ADMIN | 60 req/60s | ❌ | Update room image URL |

#### 📅 Bookings (`/api/bookings`)

| Method | Endpoint | Auth | Role | Rate Limit | Cached | Description |
|--------|----------|------|------|------------|--------|-------------|
| `POST` | `/api/bookings/CreateRoom` | ✅ JWT | USER | 60 req/60s | ❌ | Create a booking |
| `GET` | `/api/bookings/ListAllMyBooking` | ✅ JWT | USER | 60 req/60s | ❌ | List user's own bookings |
| `GET` | `/api/bookings/:id/ListMyBooking` | ✅ JWT | USER | 60 req/60s | ❌ | Get single booking detail |
| `GET` | `/api/bookings/ListAllBooking` | ✅ JWT | ADMIN | 60 req/60s | ❌ | List all system bookings |
| `PATCH` | `/api/bookings/:id/:status/ChangeStatus` | ✅ JWT | ADMIN | 60 req/60s | ❌ | Change booking status |

#### 👤 User (`/api/user`)

| Method | Endpoint | Auth | Role | Rate Limit | Description |
|--------|----------|------|------|------------|-------------|
| `GET` | `/api/user/profile` | ✅ JWT | USER/ADMIN | 60 req/60s | Get own profile (no password) |
| `PATCH` | `/api/user/update-profile` | ✅ JWT | USER/ADMIN | 60 req/60s | Update own profile |
| `PATCH` | `/api/user/change-password` | ✅ JWT | USER/ADMIN | 60 req/60s | Change own password |

#### ❤️ Health Check (`/api/health`)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/api/health` | ❌ | **Exempt** (`@SkipThrottle`) | Database connectivity check |

---

## 💡 API Usage Examples

> Replace `http://localhost:3000` with `http://localhost` when running through Docker/Nginx.

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "SecureP@ss123",
    "email": "john@example.com"
  }'
```

**Response (201):**
```json
{
  "message": "User registered successfully.",
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "roles": "USER"
  }
}
```

### Login and Get JWT Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "SecureP@ss123"
  }'
```

**Response (200):**
```json
{
  "message": "Login successful.",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "roles": "USER"
  }
}
```

### List All Rooms (Public — Cached 60s)

```bash
curl http://localhost:3000/api/rooms
```

### Create a Booking (User Only)

```bash
curl -X POST http://localhost:3000/api/bookings/CreateRoom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "Room_ID": 1,
    "check_in": "2026-06-01T14:00:00Z",
    "check_out": "2026-06-05T14:00:00Z"
  }'
```

### Create a Room (Admin Only)

```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "name": "Deluxe Suite",
    "capacity": 2,
    "price_per_night": 1500,
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-12-31T00:00:00Z"
  }'
```

### Approve a Booking (Admin Only)

```bash
curl -X PATCH http://localhost:3000/api/bookings/1/Approved/ChangeStatus \
  -H "Authorization: Bearer <admin_token>"
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

**Response (200):**
```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

---

## 🗄️ Caching Strategy

This project uses **NestJS `CacheModule`** with an **in-memory store** to cache responses for frequently-read, shared data. Caching reduces database load by serving repeated requests directly from memory.

### Configuration (`app.module.ts`)

```ts
CacheModule.register({
  isGlobal: true,
  ttl: 60000, // 60 seconds default TTL
  max: 100,   // max 100 cached entries in memory
})
```

The cache key is the **request URL**. Responses are evicted automatically after their TTL expires.

### ✅ Endpoints WITH Caching

| Endpoint | TTL | Why Cached |
|----------|-----|------------|
| `GET /api/rooms` | 60s | **Public, shared data.** Room list is read by all users and only changes when an Admin creates/edits a room. Safe to cache because the data is identical for every visitor. |
| `GET /api/rooms/:id` | 60s | **Public, shared data.** Individual room details change rarely. Caching avoids repeated DB lookups for the same room. |
| `GET /api/rooms/search` | 30s | **Query-based data.** Search results depend on query params (date range, capacity). Shorter TTL because room availability changes more often than room details. |

**How caching works:**
```
Request #1:  Client → NestJS → Prisma → Database → cache stored → Response
Request #2+: Client → NestJS → cache hit (instant) → Response  (DB skipped)
         ... after 60s TTL expires, cache is cleared, next request hits DB again
```

### ❌ Endpoints WITHOUT Caching — and Why

| Endpoint | Why NOT Cached |
|----------|----------------|
| `GET /api/bookings/ListAllBooking` | **Admin needs real-time data.** Bookings change constantly. Stale cache = admin sees outdated booking statuses. |
| `GET /api/bookings/ListAllMyBooking` | **Per-user data + data leakage risk.** Cache key is the URL, not the JWT user. Two users hitting the same URL would get **each other's bookings** from the cache. |
| `GET /api/bookings/:id/ListMyBooking` | **Same data leakage risk** as above. User-specific data must always be fetched fresh. |
| `GET /api/user/profile` | **User-specific data.** All users share the same URL path — caching would expose one user's profile to another. |
| All `POST / PATCH / DELETE` | **Write operations must never be cached.** Caching a mutation response would return a stale "success" for an operation that was never actually executed. |

> **Rule of thumb:**
> - ✅ Cache: data that is **public**, **shared across all users**, and **rarely written**
> - ❌ Don't cache: data that is **per-user**, **frequently changing**, or **admin-sensitive**

---

## 🚦 Rate Limiting Strategy

This project uses **`@nestjs/throttler`** to protect the API from abuse, brute-force attacks, and traffic spikes. A global `ThrottlerGuard` is registered as an `APP_GUARD`, meaning **every endpoint is automatically rate-limited** unless explicitly overridden.

### Configuration (`app.module.ts`)

```ts
ThrottlerModule.forRoot([
  {
    name: 'default',
    ttl: 60000, // 60-second sliding window
    limit: 60,  // max 60 requests per window per IP
  },
])
```

### Rate Limit Rules per Endpoint

| Endpoint | Limit | Type | Reason |
|----------|-------|------|--------|
| All endpoints (default) | **60 req / 60s** | Global — automatic | Prevents general abuse and traffic spikes |
| `POST /api/auth/login` | **10 req / 60s** | `@Throttle()` override | Prevents brute-force password attacks |
| `POST /api/auth/register` | **10 req / 60s** | `@Throttle()` override | Prevents spam account creation |
| `GET /api/health` | **No limit** | `@SkipThrottle()` exempt | Monitoring tools ping this constantly; rate limiting would cause false alerts |

> **Important:** Endpoints without an explicit `@Throttle()` decorator still inherit the default 60 req/60s limit. No endpoint is unprotected (except `/health`).

### How Rate Limiting Improves System Stability

**1. Prevents Server Overload**

Without rate limiting, a flood of requests exhaust the database connection pool and degrade response times for everyone. With throttling, excess requests are rejected at the guard level — **before reaching the service or database** — at near-zero cost.

```
Normal user  → passes through (< 60 req/min) → service → database → response
Abusive bot  → blocked at 60 req/min         → 429 returned instantly → no DB hit
```

**2. Brute-Force Protection on Login**

The login endpoint requires no prior authentication, making it a common attack target. The strict **10 req/60s** limit on `POST /api/auth/login` means an attacker can only attempt 10 passwords per minute per IP.

**3. Two Layers of Protection on Admin Endpoints**

Sensitive endpoints like `DELETE /api/rooms/:id` are protected by **both**:
- `JwtAuthGuard` — blocks requests without valid JWT (returns `401`)
- `ThrottlerGuard` — blocks excessive requests even with valid tokens (returns `429`)

**4. Response When Limit is Exceeded**

```json
HTTP 429 Too Many Requests
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## 📊 Performance Benchmark Results

Benchmarked using **autocannon** (10 connections × 5 seconds per phase).

### Cache Performance — `GET /api/rooms`

#### 🖥️ Local Development (direct NestJS on port 3000)

| Metric | No Cache (DB hit) | With Cache (memory) | Improvement |
|--------|-------------------|---------------------|-------------|
| **Req/sec** | 4,522 req/s | 5,724 req/s | **+26.6%** |
| **Avg latency** | 1.68 ms | 1.28 ms | **-23.8%** |
| **P99 latency** | 6 ms | 4 ms | **-33.3%** |
| **Max latency** | 145 ms | 20 ms | **-86.2%** |

#### 🐳 Docker on Lab Server / Nginx (reverse proxy on port 80)

| Metric | No Cache (DB hit) | With Cache (memory) | Improvement |
|--------|-------------------|---------------------|-------------|
| **Req/sec** | ? req/s | ? req/s | **?%** |
| **Avg latency** | ? ms | ? ms | **?%** |
| **P99 latency** | ? ms | ? ms | **?%** |
| **Max latency** | ? ms | ? ms | **?%** |



### Rate Limit Verification

Tested after a 62-second cooldown to ensure clean throttler state.

#### 🖥️ Local (port 3000)

| Endpoint | Configured Limit | Sent | Passed | Blocked (429) |
|----------|-----------------|------|--------|---------------|
| `GET /api/rooms` (global) | 60 / 60s | 80 | **60** | **20** |
| `POST /api/auth/login` (strict) | 10 / 60s | 20 | **10** | **10** |

#### 🐳 Docker / Nginx on Lab Server (port 80)

| Endpoint | Configured Limit | Sent | Passed | Blocked (429) |
|----------|-----------------|------|--------|---------------|
| `GET /api/rooms` (global) | 60 / 60s | 80 | **?** | **?** |
| `POST /api/auth/login` (strict) | 10 / 60s | 20 | **?** | **?** |

> Rate limiting works identically in both environments — the `ThrottlerGuard` runs inside the NestJS process regardless of whether requests arrive directly or via Nginx.

---

## ⚠️ Limitations & Known Issues

### Current Limitations

| Limitation | Detail |
|------------|--------|
| **In-memory cache only** | Cache is stored in the NestJS process memory. It resets on every restart and is **not shared** across multiple server instances. For multi-instance deployments, switch to Redis-backed `cache-manager-redis-store`. |
| **In-memory rate limiter** | Throttler counts are stored in memory. Restarting the server resets all rate limit counters. For production, use `@nestjs/throttler-storage-redis` to persist counters across restarts. |
| **JWT blacklist not persistent** | Logged-out tokens are stored in an in-memory `Set`. If the server restarts, all blacklisted tokens become valid again until they expire naturally. Consider using Redis for token blacklisting. |
| **No pagination** | `GET /api/rooms` and `GET /api/bookings/ListAllBooking` return all records. Large datasets may cause slow responses and high memory usage. |
| **Single-IP throttling** | Rate limiting is per-IP. Behind a reverse proxy (Nginx), all clients may share the same IP unless `X-Forwarded-For` headers are properly configured. |
| **No image file storage** | The `upload-image` endpoint stores a **URL string** in the database — it does not handle actual file uploads or storage. Image hosting must be handled separately (e.g., S3, Cloudinary). |

### Known Issues

| Issue | Detail |
|-------|--------|
| **Benchmark 429 warnings** | The `Cache-RateLimiting_Benchmark.js` shows `⚠ Warning: First response was HTTP 429` during the cache benchmark phase. This is **expected** — the benchmark sends tens of thousands of requests which triggers rate limiting. The 62-second cooldown before the rate limit tests ensures accurate results. |
| **MariaDB adapter errors** | When the database connection is unstable (e.g., slow WiFi), `@prisma/adapter-mariadb` may throw `LengthMismatch` or pool timeout errors. Ensure a stable network connection or use `?allowPublicKeyRetrieval=true` in the `DATABASE_URL`. |
| **Seed data loads once** | `database/seed.sql` only executes on the first MySQL container startup. To re-seed, you must remove the Docker volume: `docker compose down -v`. |
