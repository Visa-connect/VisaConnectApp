-- Add is_active column to reports to control active visibility of a report
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_reports_is_active ON reports(is_active);

