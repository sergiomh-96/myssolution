-- Create activity_log table for audit trail

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_log
-- Admins and managers can view all activity
-- Users can view their own activity
-- Viewers can view all activity
CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'viewer')
    )
  );

-- All authenticated users can insert activity logs
CREATE POLICY "activity_log_insert" ON public.activity_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- No updates or deletes allowed (immutable audit log)

-- Create indexes
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_resource_type ON public.activity_log(resource_type);
CREATE INDEX idx_activity_log_resource_id ON public.activity_log(resource_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
