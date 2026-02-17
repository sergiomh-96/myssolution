# MYSSolution - B2B CRM Platform

A comprehensive, production-ready SaaS-style CRM web application built for business-to-business (B2B) usage with Next.js 16, Supabase, and TypeScript.

## Features

### Core Functionality

- **Role-Based Access Control (RBAC)**: 5 distinct user roles with granular permissions
  - Admin: Full system access and user management
  - Manager: Team oversight and approval authority
  - Sales Rep: Customer and offer management
  - Support Agent: Technical request handling
  - Viewer/Analyst: Read-only analytics access

- **Customer Management**: Comprehensive CRM with contact tracking, status management, and assignment workflows

- **Offers System**: Complete sales proposal lifecycle from draft to acceptance with multi-item pricing

- **Technical Support**: Priority-based ticket system with status tracking and assignment

- **Real-time Chat**: Internal messaging with channels, direct messages, and group chats powered by Supabase Realtime

- **Notifications**: Real-time alerts for important events and updates

- **Analytics Dashboard**: KPI visualizations and business insights with interactive charts

### Technical Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password
- **Real-time**: Supabase Realtime for chat and notifications
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Type Safety**: TypeScript throughout

## Database Schema

The application uses a comprehensive PostgreSQL schema with:

- User profiles with role-based permissions
- Customers with status tracking and assignment
- Offers with line items and approval workflow
- Technical requests with priority and resolution tracking
- Chat system (channels, messages, members)
- Notifications with real-time delivery
- Activity logs for audit trails

All tables implement Row Level Security (RLS) policies to enforce role-based access at the database level.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. The Supabase integration is already configured. Database migrations in `/scripts` have been executed.

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### First Steps

1. Create your first admin account at `/auth/sign-up`
2. After email confirmation, sign in at `/auth/login`
3. Access the dashboard at `/dashboard`

## Project Structure

```
app/
├── auth/              # Authentication pages (login, signup)
├── dashboard/         # Main application
│   ├── customers/     # Customer management
│   ├── offers/        # Offer management
│   ├── requests/      # Technical support
│   ├── chat/          # Real-time messaging
│   ├── analytics/     # Business insights
│   └── settings/      # Admin settings
components/
├── dashboard/         # Dashboard components
├── customers/         # Customer components
├── offers/           # Offer components
├── requests/         # Request components
├── chat/             # Chat components
└── settings/         # Settings components
lib/
├── supabase/         # Supabase client configuration
├── types/            # TypeScript type definitions
└── auth.ts           # Authentication utilities
scripts/              # Database migration scripts
```

## Role Permissions

| Feature | Admin | Manager | Sales Rep | Support Agent | Viewer |
|---------|-------|---------|-----------|---------------|--------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Customers | ✓ | ✓ | Own Only | - | - |
| Create Offers | ✓ | ✓ | ✓ | - | - |
| Approve Offers | ✓ | ✓ | - | - | - |
| Manage Requests | ✓ | ✓ | - | ✓ | - |
| Internal Chat | ✓ | ✓ | ✓ | ✓ | - |
| View Analytics | ✓ | ✓ | - | - | ✓ |
| User Management | ✓ | - | - | - | - |

## Security

- All authentication handled by Supabase Auth
- Row Level Security (RLS) policies on all tables
- Role-based access control at database and application level
- Secure session management with HTTP-only cookies
- SQL injection prevention through parameterized queries
- Input validation on all forms

## Design System

The application uses a professional B2B design system with:

- Clean, minimalistic interface
- Desktop-first responsive design
- Consistent color palette with semantic tokens
- Accessible components from Radix UI
- Professional typography with Geist font family

## Real-time Features

- Chat messages with instant delivery
- Notification alerts
- Unread message counters
- Live presence indicators

All powered by Supabase Realtime subscriptions.

## License

MIT
