-- Create offers table with RLS

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status offer_status NOT NULL DEFAULT 'draft',
  valid_until date,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offers
-- Admins and managers can view all offers
-- Sales reps can view offers they created or are assigned to
-- Viewers can view all offers
CREATE POLICY "offers_select" ON public.offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager', 'viewer')
        OR (role = 'sales_rep' AND (created_by = auth.uid() OR assigned_to = auth.uid()))
      )
    )
  );

-- Admins, managers, and sales reps can create offers
CREATE POLICY "offers_insert" ON public.offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'sales_rep')
    )
    AND created_by = auth.uid()
  );

-- Users can update offers they created
-- Admins and managers can update all offers
CREATE POLICY "offers_update" ON public.offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role = 'sales_rep' AND created_by = auth.uid())
      )
    )
  );

-- Only admins can delete offers
CREATE POLICY "offers_delete" ON public.offers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_offers_customer_id ON public.offers(customer_id);
CREATE INDEX idx_offers_created_by ON public.offers(created_by);
CREATE INDEX idx_offers_assigned_to ON public.offers(assigned_to);
CREATE INDEX idx_offers_valid_until ON public.offers(valid_until);
