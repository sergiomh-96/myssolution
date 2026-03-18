-- Create table to store customer profile assignments
-- This allows multiple profiles (sales reps, managers, etc.) to be assigned to a single customer

CREATE TABLE IF NOT EXISTS customer_profile_assignments (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(customer_id, profile_id)
);

-- Enable RLS
ALTER TABLE customer_profile_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read assignments"
  ON customer_profile_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert assignments"
  ON customer_profile_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete assignments"
  ON customer_profile_assignments FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_customer_profile_assignments_customer_id 
  ON customer_profile_assignments(customer_id);

CREATE INDEX idx_customer_profile_assignments_profile_id 
  ON customer_profile_assignments(profile_id);
