-- Create all enum types for MYSSolution CRM

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'sales_rep', 'support_agent', 'viewer');

-- Customer statuses
CREATE TYPE customer_status AS ENUM ('prospect', 'active', 'inactive');

-- Offer statuses
CREATE TYPE offer_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'expired');

-- Technical request priorities
CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Technical request statuses
CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');

-- Chat channel types
CREATE TYPE channel_type AS ENUM ('direct', 'group', 'department');
