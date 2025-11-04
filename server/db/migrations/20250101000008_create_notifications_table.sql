-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    action_url VARCHAR(500),
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Add foreign key constraint (assuming users table exists)
-- ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id 
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'In-app notification system for user interactions';
COMMENT ON COLUMN notifications.user_id IS 'Recipient of the notification';
COMMENT ON COLUMN notifications.type IS 'Category: meetup_interest, job_applicant, chat_message, meetup_updated, etc.';
COMMENT ON COLUMN notifications.title IS 'Brief headline for the notification';
COMMENT ON COLUMN notifications.message IS 'Full notification content';
COMMENT ON COLUMN notifications.data IS 'Additional context data as JSON (job_id, meetup_id, etc.)';
COMMENT ON COLUMN notifications.action_url IS 'Direct link to relevant page';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when read (NULL = unread)';
COMMENT ON COLUMN notifications.created_at IS 'When notification was created';
