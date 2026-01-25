# Archive Commodities

## Overview

Archive Commodities is a peer-to-peer marketplace application for buying and selling curated items. Users can list products for sale, browse available items, and complete purchases through Stripe checkout. The application features a modern, editorial-style design with an avant-garde minimalist aesthetic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES Modules
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` for shared types, `shared/models/auth.ts` for auth tables
- **Migrations**: Drizzle Kit with `db:push` command

### Authentication
- **Provider**: Replit Auth via OpenID Connect
- **Implementation**: Passport.js with openid-client strategy
- **Session Storage**: PostgreSQL sessions table
- **User Storage**: Users table with automatic upsert on login

### Key Design Decisions

1. **Monorepo Structure**: Client, server, and shared code in single repository with path aliases (@/, @shared/)
2. **Shared Schema**: Database schema and API contracts shared between frontend and backend via `shared/` directory
3. **Price Storage**: All prices stored in cents (integers) to avoid floating-point issues
4. **Product Images**: Using external URLs (Unsplash) for MVP; production would need file upload
5. **Type Safety**: End-to-end TypeScript with Zod validation at API boundaries

## External Dependencies

### Payment Processing
- **Stripe**: Integrated via Replit Connectors for payment processing
- **stripe-replit-sync**: Handles Stripe schema migrations and webhook processing
- **Webhook Handling**: Managed webhook endpoint at `/api/stripe/webhook` (registered before express.json())
- **Checkout Flow**: POST `/api/checkout` creates Stripe Checkout session with product price + $1 platform fee
- **Fulfillment**: POST `/api/checkout/complete` validates session metadata, amount, and idempotency before marking product sold
- **Security**: Session metadata validated to prevent product ID spoofing; amount verification ensures correct payment; stripeSessionId stored for idempotency

### Database
- **PostgreSQL**: Primary database accessed via DATABASE_URL environment variable
- **Connection**: Node pg Pool with Drizzle ORM wrapper

### Authentication Services
- **Replit OIDC**: OpenID Connect provider at replit.com/oidc
- **Session Secret**: Required SESSION_SECRET environment variable

### UI Components
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-styled component library (new-york style variant)
- **Lucide React**: Icon library

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit environment identifier (auto-provided)
- Stripe credentials via Replit Connectors