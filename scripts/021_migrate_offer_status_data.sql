-- Step 2: Update existing rows from English to Spanish values
-- Must run AFTER 020 is committed
UPDATE offers SET status = 'borrador'  WHERE status = 'draft';
UPDATE offers SET status = 'enviada'   WHERE status = 'pending';
UPDATE offers SET status = 'aceptada'  WHERE status = 'approved';
UPDATE offers SET status = 'rechazada' WHERE status = 'rejected';
UPDATE offers SET status = 'rechazada' WHERE status = 'expired';
