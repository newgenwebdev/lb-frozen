# LB Frozen Server

Backend API for the LB Frozen e-commerce platform, built with Medusa.js 2.0.

## Tech Stack

- **Framework**: Medusa.js 2.10.2
- **Runtime**: Node.js 22.x
- **Language**: TypeScript 5.7.2
- **Database**: PostgreSQL 15+ (MikroORM)
- **Cache**: Redis
- **File Storage**: MinIO
- **Search**: Meilisearch
- **Email**: Resend
- **Payments**: Stripe

## Prerequisites

- Node.js 22.x
- pnpm 9.x
- PostgreSQL 15+
- Redis (optional, falls back to simulated)
- MinIO (optional, falls back to local storage)
- Meilisearch (optional)

## Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.template .env

# Configure your .env file with database credentials
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/lb_frozen

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# CORS
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:3001

# Stripe
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# MinIO (optional)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=lb-frozen

# Resend (optional)
RESEND_API_KEY=re_...

# Meilisearch (optional)
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=masterKey
```

## Development

```bash
# Initialize database (run migrations and seed)
pnpm ib

# Start development server
pnpm dev
```

The server runs on **port 9000** by default.

- API: http://localhost:9000
- Admin Dashboard: http://localhost:9000/app
- API Documentation: http://localhost:9000/docs

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm ib` | Initialize backend (migrations + seed) |
| `pnpm seed` | Seed database with sample data |
| `pnpm seed:orders` | Seed sample orders |
| `pnpm email:dev` | Preview email templates (port 3002) |

## Project Structure

```
src/
├── api/                    # API route handlers
│   ├── admin/              # Admin endpoints (/admin/*)
│   ├── store/              # Store endpoints (/store/*)
│   ├── docs/               # Swagger documentation
│   └── webhooks/           # Webhook handlers
├── modules/                # Custom business modules
│   ├── membership/         # Membership system
│   ├── points/             # Points/rewards system
│   ├── tier-config/        # Membership tiers
│   ├── promo/              # Promotions (coupons, PWP)
│   ├── article/            # Blog/journal articles
│   ├── banner/             # Homepage banners
│   ├── shipment/           # Shipping options
│   ├── return/             # Return requests
│   ├── minio-file/         # File storage
│   └── email-notifications/# Email templates
├── workflows/              # Multi-step business operations
├── services/               # Shared services
├── scripts/                # Executable scripts
├── utils/                  # Utility functions
└── migrations/             # Database migrations
```

## Custom Modules

### Membership System
- Customer membership management
- Tier-based benefits (Bronze, Silver, Gold, Platinum)
- Membership promotions

### Points System
- Earn points on purchases
- Redeem points for discounts
- Points transaction history
- Configurable earning rates

### Promotions
- Coupon codes with various discount types
- Purchase With Purchase (PWP) deals
- Member-exclusive promotions

### Content Management
- Blog articles with rich content
- Homepage banner management

## API Endpoints

### Store API (`/store/*`)
Customer-facing endpoints for the storefront:
- Products, categories, collections
- Cart and checkout
- Customer authentication
- Orders and order history
- Membership status and points
- Coupon validation and application

### Admin API (`/admin/*`)
Staff-facing endpoints for management:
- Product and inventory management
- Order processing and fulfillment
- Customer management
- Membership and points administration
- Analytics and reporting
- Content management (articles, banners)
- Promotions management

## Authentication

### Store Authentication
Uses Medusa's built-in `/store/auth` endpoints with session-based or JWT authentication.

### Admin Authentication
Custom JWT-based authentication. All custom admin endpoints must include auth check:

```typescript
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Handler logic
}
```

## Database Migrations

```bash
# Generate new migration
pnpm medusa migrations generate src/modules/<module-name>

# Run migrations
pnpm medusa migrations run

# Or use the init-backend script
pnpm ib
```

## Testing

```bash
pnpm test
```

## Production Build

```bash
# Build the project
pnpm build

# Start production server
pnpm start
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check database user permissions

### CORS Errors
- Verify `STORE_CORS` and `ADMIN_CORS` in `.env`
- Ensure frontend URLs match exactly (including protocol)

### Module Service Errors
If you see "service.list is not a function":
- Service class names must use `{Model}ModuleService` suffix
- Method signatures are `(filters, config)` not `({ filters: {...} })`

## Related Projects

- [lb-frozen-storepage](../storepage) - Customer storefront (port 3000)
- [lb-frozen-admin](../admin) - Admin dashboard (port 3001)

## License

MIT
