-- Create offer_assignments table for multi-user assignment
CREATE TABLE IF NOT EXISTS offer_assignments (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(offer_id, user_id)
);

-- Enable RLS
ALTER TABLE offer_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read offer_assignments" ON offer_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert offer_assignments" ON offer_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete offer_assignments" ON offer_assignments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_offer_assignments_offer_id ON offer_assignments(offer_id);
CREATE INDEX idx_offer_assignments_user_id ON offer_assignments(user_id);
