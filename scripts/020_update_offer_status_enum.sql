-- Step 1: Add new Spanish enum values (must be committed before use)
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'borrador';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'enviada';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'aceptada';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'rechazada';
