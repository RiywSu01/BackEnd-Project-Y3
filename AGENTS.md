# AGENTS.md — Hotel Booking REST API

This file provides instructions for AI agents (e.g., Claude) to understand the project structure, conventions, and requirements before generating or modifying code.

---

## Project Overview

A production-ready RESTful API for a **Hotel Booking System** built for ITCS258 Backend Application Development at Faculty of ICT, Mahidol University.

- **Language:** TypeScript
- **Framework:** NestJS
- **Database:** MySQL
- **ORM:** Prisma
- **Auth:** JWT (JSON Web Token)
- **Caching & Rate Limiting:** Redis
- **Testing:** Jest + Supertest
- **Containerization:** Docker & Docker Compose
- **API Docs:** Swagger / OpenAPI

---

## User Roles

| Role | Description |
|---|---|
| Guest | Unauthenticated user — can view/search rooms only |
| USER | Registered user — can manage own bookings |
| ADMIN | Full access — manages rooms and all bookings |

---

## Project Structure

```
src/
├── auth/                  # Login, signup, logout (JWT)
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── roles.guard.ts
│
├── users/                 # Profile view & update
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── rooms/                 # Room CRUD (Admin), listing (all)
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   └── rooms.module.ts
│
├── bookings/              # Booking creation & management
│   ├── bookings.controller.ts
│   ├── bookings.service.ts
│   └── bookings.module.ts
│
├── search/                # Room search by date & capacity
│   ├── search.controller.ts
│   ├── search.service.ts
│   └── search.module.ts
│
├── notifications/         # Booking event records
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── notifications.module.ts
│
├── health/                # Health check endpoint
│   ├── health.controller.ts
│   └── health.module.ts
│
├── prisma/                # Prisma service wrapper
│   ├── prisma.service.ts
│   └── prisma.module.ts
│
├── common/                # Shared utilities
│   ├── decorators/
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── interceptors/
│       └── logging.interceptor.ts
│
├── app.module.ts
└── main.ts
```

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int       @id @default(autoincrement())
  name      String
  email     String    @unique
  password  String
  role      Role      @default(USER)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  bookings      Booking[]
  notifications Notification[]
}

enum Role {
  USER
  ADMIN
}

model Room {
  id            Int        @id @default(autoincrement())
  name          String
  capacity      Int
  pricePerNight Decimal    @db.Decimal(10, 2)
  description   String?
  status        RoomStatus @default(ACTIVE)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  images   RoomImage[]
  bookings Booking[]
}

enum RoomStatus {
  ACTIVE
  DEACTIVATED
}

model RoomImage {
  id        Int      @id @default(autoincrement())
  roomId    Int
  url       String
  filename  String
  createdAt DateTime @default(now())

  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

model Booking {
  id          Int           @id @default(autoincrement())
  userId      Int
  roomId      Int
  checkIn     DateTime
  checkOut    DateTime
  status      BookingStatus @default(PENDING)
  totalPrice  Decimal       @db.Decimal(10, 2)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user          User           @relation(fields: [userId], references: [id])
  room          Room           @relation(fields: [roomId], references: [id])
  notifications Notification[]
}

enum BookingStatus {
  PENDING
  APPROVED
  CANCELLED
  PAID
}

model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int
  bookingId Int
  type      NotificationType
  message   String
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user    User    @relation(fields: [userId], references: [id])
  booking Booking @relation(fields: [bookingId], references: [id])
}

enum NotificationType {
  BOOKING_CREATED
  BOOKING_CANCELLED
}
```

---

## API Endpoints

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | /auth/signup | Guest | Register new user |
| POST | /auth/login | Guest | Login, returns JWT |
| POST | /auth/logout | USER, ADMIN | Logout |

### Users
| Method | Path | Access | Description |
|---|---|---|---|
| GET | /users/me | USER, ADMIN | View own profile |
| PATCH | /users/me | USER, ADMIN | Update own profile |

### Rooms
| Method | Path | Access | Description |
|---|---|---|---|
| GET | /rooms | Guest, USER, ADMIN | List all active rooms |
| GET | /rooms/:id | Guest, USER, ADMIN | Room detail with images |
| POST | /rooms | ADMIN | Create room |
| PATCH | /rooms/:id | ADMIN | Update room |
| DELETE | /rooms/:id | ADMIN | Delete/deactivate room |
| POST | /rooms/:id/images | ADMIN | Upload room image |

### Bookings
| Method | Path | Access | Description |
|---|---|---|---|
| POST | /bookings | USER | Create booking |
| GET | /bookings/me | USER | List own bookings |
| GET | /bookings/me/:id | USER | Own booking detail |
| GET | /bookings | ADMIN | List all bookings |
| PATCH | /bookings/:id/status | ADMIN | Update booking status |

### Search
| Method | Path | Access | Description |
|---|---|---|---|
| GET | /search/rooms | Guest, USER, ADMIN | Search by date range & capacity |

### Notifications
| Method | Path | Access | Description |
|---|---|---|---|
| GET | /notifications/me | USER, ADMIN | Get own notifications |
| PATCH | /notifications/:id/read | USER, ADMIN | Mark as read |

### Health
| Method | Path | Access | Description |
|---|---|---|---|
| GET | /health | Guest | System health check |

---

## Coding Conventions

### General
- Use **TypeScript** strictly — no `any` types unless unavoidable
- Use **async/await** — no raw `.then()` chains
- All business logic goes in **Service**, not Controller
- Controllers only handle HTTP request/response

### Naming
- Files: `kebab-case` (e.g., `booking.service.ts`)
- Classes: `PascalCase` (e.g., `BookingService`)
- Variables/functions: `camelCase` (e.g., `findAllBookings`)
- Database fields: `camelCase` in Prisma schema
- Env variables: `UPPER_SNAKE_CASE`

### DTOs
- Always use DTOs with `class-validator` decorators for request validation
- Example:
```typescript
export class CreateBookingDto {
  @IsInt()
  roomId: number

  @IsDateString()
  checkIn: string

  @IsDateString()
  checkOut: string
}
```

### Error Handling
- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`, `UnauthorizedException`
- Never expose raw DB errors to client
- Always return meaningful error messages

### Response Format
Success:
```json
{
  "message": "Booking created successfully",
  "data": { ... }
}
```
Error:
```json
{
  "statusCode": 400,
  "message": "Check-out date must be after check-in date"
}
```

### Security
- Never return `password` field in any response
- Hash passwords with **bcrypt** (minimum 10 rounds)
- Protect all non-public endpoints with `JwtAuthGuard`
- Protect admin endpoints with `RolesGuard`

---

## Authentication Flow

```
1. POST /auth/signup  → hash password → save user → return user (no password)
2. POST /auth/login   → verify password → return JWT access token
3. Request with JWT  → JwtAuthGuard validates token → attach user to request
4. Admin route       → RolesGuard checks role === ADMIN
```

JWT payload:
```json
{
  "sub": 1,
  "email": "user@example.com",
  "role": "USER"
}
```

---

## Business Logic Rules

### Booking Validation
- `checkIn` must be before `checkOut` (FR-19)
- `checkIn` must not be in the past
- No overlapping bookings for the same room (FR-20):
```typescript
// Check overlap query
WHERE roomId = :roomId
AND status NOT IN ('CANCELLED')
AND checkIn < :checkOut
AND checkOut > :checkIn
```

### Status Transitions (FR-21)
```
PENDING → APPROVED  (Admin only)
PENDING → CANCELLED (Admin or User)
APPROVED → PAID     (Admin only)
APPROVED → CANCELLED (Admin only)
```

### Room Search (FR-27, FR-28, FR-29)
- Filter by `capacity >= requested`
- Filter by `status = ACTIVE`
- Exclude rooms that have non-cancelled bookings overlapping the requested dates

---

## Caching Strategy (Redis)

| Endpoint | Cache TTL | Reason |
|---|---|---|
| GET /rooms | 60 seconds | Frequently accessed, rarely changes |
| GET /rooms/:id | 60 seconds | Room details change infrequently |
| GET /search/rooms | 30 seconds | High traffic, short TTL for freshness |

Cache invalidation: Clear room cache when Admin creates, updates, or deactivates a room.

---

## Rate Limiting Strategy (Redis)

| Endpoint | Limit | Window |
|---|---|---|
| POST /auth/login | 10 requests | per minute per IP |
| POST /auth/signup | 5 requests | per minute per IP |
| POST /bookings | 20 requests | per minute per user |

---

## Environment Variables

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/hotel_booking

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
PORT=3000
NODE_ENV=development
```

---

## Testing Strategy

### Unit Tests
- `bookings.service.spec.ts` — date validation, double booking check, status transitions
- `auth.service.spec.ts` — password hashing, token generation
- `rooms.service.spec.ts` — CRUD logic

### Integration Tests
- Test controllers with test DB
- Cover: signup/login, room CRUD (Admin), booking CRUD, search

### E2E Tests
- Full user flow: signup → login → search rooms → create booking → cancel booking
- Full admin flow: login → create room → view all bookings → approve booking

Run all tests:
```bash
npm test           # unit tests
npm run test:e2e   # e2e tests
npm run test:cov   # coverage report
```

---

## Docker Setup

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
      - redis

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: hotel_booking

  redis:
    image: redis:alpine
```

---

## Key Rules for AI Agents

When generating or modifying code for this project, always follow these rules:

1. **Never return `password` field** in any API response
2. **Always validate input** using DTOs + `class-validator`
3. **Always check role** before admin operations using `RolesGuard`
4. **Business logic in Service**, not Controller
5. **Use Prisma** for all database operations — no raw SQL
6. **Use NestJS exceptions** for error handling — never `throw new Error()`
7. **Add Swagger decorators** (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) to all controllers
8. **Invalidate Redis cache** when room data changes
9. **Record Notification** when booking is created or cancelled
10. **Follow the status transition rules** strictly — do not allow invalid transitions
