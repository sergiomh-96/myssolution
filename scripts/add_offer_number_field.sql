-- Add offer_number column to offers table
ALTER TABLE offers ADD COLUMN offer_number bigint;

-- Create a sequence for offer numbering per user
CREATE SEQUENCE offer_number_seq;

-- Create a function to auto-generate offer_number on insert
CREATE OR REPLACE FUNCTION generate_offer_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number bigint;
BEGIN
  -- Get the count of offers created by this user in the current year
  SELECT COUNT(*) + 1 INTO next_number
  FROM offers
  WHERE created_by = NEW.created_by
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  NEW.offer_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before insert
CREATE TRIGGER trigger_generate_offer_number
BEFORE INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION generate_offer_number();
