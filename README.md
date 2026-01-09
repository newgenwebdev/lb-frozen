# LB Frozen E-commerce Platform

A complete e-commerce platform built with Medusa.js 2.0, Next.js 16, and React 19.

## Project Structure

```
lb-frozen/
├── server/             # Backend API (Medusa.js 2.0)
├── storepage/          # Customer storefront (Next.js)
├── admin/              # Admin dashboard (Next.js)
├── .clauderules        # AI assistant rules
├── GUIDELINES.md       # Development standards
└── package.json        # Monorepo scripts
```

## Projects Overview

| Project | Description | Port |
|---------|-------------|------|
| `server` | Backend API with Medusa.js 2.0, PostgreSQL, MikroORM | 9000 |
| `storepage` | Customer-facing storefront | 3000 |
| `admin` | Staff admin dashboard | 3001 |

**Package Manager:** pnpm (all projects)

## Tech Stack

### Backend (server)
- Medusa.js 2.10.2
- Node.js 22.x
- TypeScript 5.7
- PostgreSQL
- MikroORM
- Redis (caching)
- MinIO (file storage)

### Storepage (storepage)
- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Medusa JS SDK

### Admin (admin)
- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)
- Zod (validation)
- Axios

## Getting Started

### Prerequisites

- Node.js 22.x
- PostgreSQL 15+
- Redis (optional)
- MinIO (optional)
- pnpm (`npm install -g pnpm`)

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:newgenwebdev/lb-frozen.git
   cd lb-frozen
   ```

2. Install dependencies for all projects:
   ```bash
   pnpm install:all
   ```

   Or install individually:
   ```bash
   cd server && pnpm install
   cd storepage && pnpm install
   cd admin && pnpm install
   ```

3. Set up environment variables:
   ```bash
   # Copy example env files (if available) or create them
   cp server/.env.example server/.env
   cp storepage/.env.example storepage/.env
   cp admin/.env.example admin/.env
   ```

4. Configure environment variables in each `.env` file.

### Running Development Servers

From the root directory:

```bash
# Terminal 1 - Backend (port 9000)
pnpm dev:server

# Terminal 2 - Storepage (port 3000)
pnpm dev:storepage

# Terminal 3 - Admin (port 3001)
pnpm dev:admin
```

Or run from each project directory:

```bash
cd server && pnpm dev
cd storepage && pnpm dev
cd admin && pnpm dev
```

### URLs

| Service | URL |
|---------|-----|
| Backend API | http://localhost:9000 |
| API Documentation | http://localhost:9000/docs |
| Customer Storefront | http://localhost:3000 |
| Admin Dashboard | http://localhost:3001 |

## Key Features

- **Membership System**: Customer loyalty tiers with benefits
- **Points System**: Reward points for purchases
- **PWP (Purchase with Purchase)**: Special promotional items
- **Multi-currency**: Support for multiple currencies and regions
- **File Storage**: MinIO-based image/file management

## Environment Variables

### Server (server/.env)
```env
DATABASE_URL=postgres://user:password@localhost:5432/lb_frozen
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:3001
```

### Storepage (storepage/.env)
```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=pk_...
```

### Admin (admin/.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

## Development Guidelines

See [GUIDELINES.md](./GUIDELINES.md) for detailed development standards and conventions.

For AI assistant rules, see [.clauderules](./.clauderules).

## License

UNLICENSED - Private repository
