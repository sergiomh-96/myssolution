-- Create customers table with RLS

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  industry text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  status customer_status NOT NULL DEFAULT 'prospect',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
-- Admins and managers can view all customers
-- Sales reps can view customers assigned to them
-- Support agents can view customers they're working with (via requests)
-- Viewers can view all customers
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager', 'viewer')
        OR (role = 'sales_rep' AND (assigned_to = auth.uid() OR created_by = auth.uid()))
        OR (role = 'support_agent' AND id IN (
          SELECT DISTINCT assigned_to FROM public.technical_requests WHERE customer_id = customers.id
        ))
      )
    )
  );

-- Admins, managers, and sales reps can create customers
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'sales_rep')
    )
  );

-- Users can update customers they created or are assigned to
-- Admins and managers can update all
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role = 'sales_rep' AND (assigned_to = auth.uid() OR created_by = auth.uid()))
      )
    )
  );

-- Only admins can delete customers
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_assigned_to ON public.customers(assigned_to);
CREATE INDEX idx_customers_created_by ON public.customers(created_by);
CREATE INDEX idx_customers_company_name ON public.customers(company_name);
