-- Migrate offer_status enum from English to Spanish values
-- Step 1: Add new Spanish enum values
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'borrador';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'enviada';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'aceptada';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'rechazada';

-- Step 2: Update existing rows to map old English values to new Spanish values
UPDATE offers SET status = 'borrador'  WHERE status = 'draft';
UPDATE offers SET status = 'enviada'   WHERE status = 'pending';
UPDATE offers SET status = 'aceptada'  WHERE status = 'approved';
UPDATE offers SET status = 'rechazada' WHERE status = 'rejected';
UPDATE offers SET status = 'rechazada' WHERE status = 'expired';
