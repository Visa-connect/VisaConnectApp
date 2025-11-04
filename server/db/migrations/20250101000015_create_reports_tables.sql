-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    report_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    reporter_id VARCHAR(255) NOT NULL, -- Firebase UID of the user who reported
    target_type VARCHAR(50) NOT NULL, -- 'job' or 'meetup'
    target_id VARCHAR(255) NOT NULL, -- ID of the job or meetup being reported
    reason TEXT NOT NULL, -- Reason for the report
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'removed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one open report per reporter per target
    CONSTRAINT unique_open_report_per_reporter UNIQUE (reporter_id, target_type, target_id) 
        DEFERRABLE INITIALLY DEFERRED
);

-- TODO: Add audit trail table for report actions
-- This would track admin actions, notes, and provide complete audit history
-- Fields needed: id, report_id, action, admin_id, notes, timestamp

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target_type ON reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_target_id ON reports(target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status_target_type ON reports(status, target_type);

-- Add comments for documentation
COMMENT ON TABLE reports IS 'Stores user reports for jobs and meetups';
COMMENT ON COLUMN reports.report_id IS 'Unique UUID identifier for the report';
COMMENT ON COLUMN reports.reporter_id IS 'Firebase UID of the user who created the report';
COMMENT ON COLUMN reports.target_type IS 'Type of content being reported: job or meetup';
COMMENT ON COLUMN reports.target_id IS 'ID of the specific job or meetup being reported';
COMMENT ON COLUMN reports.reason IS 'User-provided reason for the report';
COMMENT ON COLUMN reports.status IS 'Current status: pending, resolved, or removed';

