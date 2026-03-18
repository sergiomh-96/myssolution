-- Create technical_requests table with RLS

CREATE TABLE IF NOT EXISTS public.technical_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  priority request_priority NOT NULL DEFAULT 'medium',
  status request_status NOT NULL DEFAULT 'open',
  category text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for technical_requests
-- Admins, managers can view all requests
-- Support agents can view requests assigned to them
-- Sales reps cannot view unless they created it
-- Viewers can view all
CREATE POLICY "technical_requests_select" ON public.technical_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager', 'viewer')
        OR (role = 'support_agent' AND (assigned_to = auth.uid() OR created_by = auth.uid()))
        OR (role = 'sales_rep' AND created_by = auth.uid())
      )
    )
  );

-- Admins, managers, sales reps, and support agents can create requests
CREATE POLICY "technical_requests_insert" ON public.technical_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'sales_rep', 'support_agent')
    )
    AND created_by = auth.uid()
  );

-- Admins, managers, and assigned support agents can update requests
CREATE POLICY "technical_requests_update" ON public.technical_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role = 'support_agent' AND assigned_to = auth.uid())
      )
    )
  );

-- Only admins can delete requests
CREATE POLICY "technical_requests_delete" ON public.technical_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_technical_requests_status ON public.technical_requests(status);
CREATE INDEX idx_technical_requests_priority ON public.technical_requests(priority);
CREATE INDEX idx_technical_requests_customer_id ON public.technical_requests(customer_id);
CREATE INDEX idx_technical_requests_created_by ON public.technical_requests(created_by);
CREATE INDEX idx_technical_requests_assigned_to ON public.technical_requests(assigned_to);
