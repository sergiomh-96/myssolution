-- Add offer_number column to offers table
ALTER TABLE offers ADD COLUMN offer_number bigint;

-- Create a sequence for offer numbering (global)
CREATE SEQUENCE offer_number_seq;

-- Create a function to auto-generate offer_number on insert
CREATE OR REPLACE FUNCTION generate_offer_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number bigint;
BEGIN
  -- Get the maximum offer_number globally and add 1
  SELECT COALESCE(MAX(offer_number), 0) + 1 INTO next_number
  FROM offers
  WHERE offer_number IS NOT NULL;
  
  NEW.offer_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before insert
CREATE TRIGGER trigger_generate_offer_number
BEFORE INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION generate_offer_number();

