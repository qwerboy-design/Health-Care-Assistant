-- HCA v0.2: server-owned, versioned health-report analysis metadata.
-- Apply after reviewing the migration in staging; this file is not applied automatically.
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS analysis_metadata JSONB NULL;

COMMENT ON COLUMN chat_messages.analysis_metadata IS
  'Server-owned de-identified health report analysis, model/source versions and review state; never raw report files.';
