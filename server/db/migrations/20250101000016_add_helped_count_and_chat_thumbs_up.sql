-- Migration: Add helped_count column to users table and create chat_thumbs_up table
-- This enables tracking of thumbs-up events in chat conversations

-- Add helped_count column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS helped_count INTEGER DEFAULT 0;

-- Create chat_thumbs_up table to track thumbs-up events
CREATE TABLE IF NOT EXISTS chat_thumbs_up (
    id SERIAL PRIMARY KEY,
    thumbs_up_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    giver_id VARCHAR(255) NOT NULL, -- Firebase UID of the user giving the thumbs-up
    receiver_id VARCHAR(255) NOT NULL, -- Firebase UID of the user receiving the thumbs-up
    chat_message_id VARCHAR(255) NOT NULL, -- ID of the chat message that was thumbs-upped
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent self-likes
    CONSTRAINT no_self_like CHECK (giver_id != receiver_id),

    -- Prevent multiple likes from the same giver to the same receiver
    -- (one thumbs-up per giver-receiver pair, regardless of message)
    CONSTRAINT unique_thumbs_up_per_giver_receiver UNIQUE (giver_id, receiver_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_thumbs_up_giver_id ON chat_thumbs_up(giver_id);
CREATE INDEX IF NOT EXISTS idx_chat_thumbs_up_receiver_id ON chat_thumbs_up(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_thumbs_up_chat_message_id ON chat_thumbs_up(chat_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_thumbs_up_created_at ON chat_thumbs_up(created_at);

-- Add comments for documentation
COMMENT ON COLUMN users.helped_count IS 'Count of unique users who have given this user a thumbs-up in chat';
COMMENT ON TABLE chat_thumbs_up IS 'Tracks thumbs-up events in chat conversations with deduplication';
COMMENT ON COLUMN chat_thumbs_up.thumbs_up_id IS 'Unique UUID identifier for the thumbs-up event';
COMMENT ON COLUMN chat_thumbs_up.giver_id IS 'Firebase UID of the user giving the thumbs-up';
COMMENT ON COLUMN chat_thumbs_up.receiver_id IS 'Firebase UID of the user receiving the thumbs-up';
COMMENT ON COLUMN chat_thumbs_up.chat_message_id IS 'ID of the chat message that was thumbs-upped';
