-- Migration: Add context_note to commitments table
-- Sprint: Customer feedback quick wins (2026-06-10)
--
-- Adds a short context note to each commitment, extracted by the
-- post-processor at conversation time. Explains *why* the user
-- made the commitment so the tracker shows more than just a to-do.

ALTER TABLE commitments
ADD COLUMN IF NOT EXISTS context_note text DEFAULT NULL;

COMMENT ON COLUMN commitments.context_note IS
  'Brief context about why this commitment was made, extracted by the post-processor at conversation time.';
