-- Add is_pvp_modified column to offer_items table
ALTER TABLE offer_items
ADD COLUMN IF NOT EXISTS is_pvp_modified BOOLEAN DEFAULT FALSE;

-- Update existing rows to false
UPDATE offer_items SET is_pvp_modified = FALSE WHERE is_pvp_modified IS NULL;
