-- Add type column to offer_items table
ALTER TABLE offer_items
ADD COLUMN type TEXT DEFAULT 'article' CHECK (type IN ('article', 'section_header', 'note'));

-- Set existing rows to 'article'
UPDATE offer_items SET type = 'article' WHERE type IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE offer_items
ALTER COLUMN type SET NOT NULL;
