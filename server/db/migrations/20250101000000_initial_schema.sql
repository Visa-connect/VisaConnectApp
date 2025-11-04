-- Initial database schema
-- This migration creates all the base tables for the application

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    visa_type VARCHAR(50),
    current_location JSONB, -- {city, state, country}
    occupation VARCHAR(255), -- Job title/role
    employer VARCHAR(255), -- Company name
    
    -- Optional profile fields (can be filled in later)
    interests TEXT[], -- Array of interests
    nationality VARCHAR(100),
    languages TEXT[], -- Array of languages
    first_time_in_us_year INTEGER,
    first_time_in_us_location VARCHAR(255),
    first_time_in_us_visa VARCHAR(100),
    job_discovery_method VARCHAR(255),
    visa_change_journey TEXT,
    other_us_jobs TEXT[], -- Array of other US jobs
    hobbies TEXT[], -- Array of hobbies
    favorite_state VARCHAR(100),
    preferred_outings TEXT[], -- Array of preferred outings
    has_car BOOLEAN,
    offers_rides BOOLEAN,
    relationship_status VARCHAR(100),
    road_trips BOOLEAN,
    favorite_place VARCHAR(255),
    travel_tips TEXT,
    willing_to_guide BOOLEAN,
    mentorship_interest BOOLEAN,
    job_boards TEXT[], -- Array of job boards
    visa_advice TEXT,
    
    -- Profile photo fields
    profile_photo_url VARCHAR(500), -- URL to the profile photo
    profile_photo_public_id VARCHAR(255), -- Cloudinary public ID for deletion
    
    -- Additional profile fields
    bio TEXT, -- User bio/description
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create meetup categories table
CREATE TABLE IF NOT EXISTS meetup_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create meetups table
CREATE TABLE IF NOT EXISTS meetups (
    id SERIAL PRIMARY KEY,
    creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES meetup_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(500) NOT NULL,
    meetup_date TIMESTAMP NOT NULL,
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    photo_url VARCHAR(500),
    photo_public_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create meetup interests table (for tracking who's interested)
CREATE TABLE IF NOT EXISTS meetup_interests (
    id SERIAL PRIMARY KEY,
    meetup_id INTEGER NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(meetup_id, user_id) -- Prevent duplicate interests
);

-- Create meetup reports table
CREATE TABLE IF NOT EXISTS meetup_reports (
    id SERIAL PRIMARY KEY,
    meetup_id INTEGER NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    reporter_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create business categories table
CREATE TABLE IF NOT EXISTS business_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES business_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    website VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name) -- Prevent duplicate business names per user
);

-- Tips, Trips, and Advice tables
CREATE TABLE IF NOT EXISTS tips_trips_advice (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('tip', 'trip', 'advice')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos for Tips, Trips, and Advice posts (multiple photos per post)
CREATE TABLE IF NOT EXISTS tips_trips_advice_photos (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES tips_trips_advice(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_public_id VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments for Tips, Trips, and Advice posts
CREATE TABLE IF NOT EXISTS tips_trips_advice_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES tips_trips_advice(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Likes for Tips, Trips, and Advice posts
CREATE TABLE IF NOT EXISTS tips_trips_advice_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES tips_trips_advice(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_visa_type ON users(visa_type);
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIN(current_location);
CREATE INDEX IF NOT EXISTS idx_users_occupation ON users(occupation);
CREATE INDEX IF NOT EXISTS idx_users_employer ON users(employer);
CREATE INDEX IF NOT EXISTS idx_users_interests ON users USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_users_profile_photo_url ON users(profile_photo_url);
CREATE INDEX IF NOT EXISTS idx_users_profile_photo_public_id ON users(profile_photo_public_id);
CREATE INDEX IF NOT EXISTS idx_users_bio ON users(bio);
CREATE INDEX IF NOT EXISTS idx_users_nationality ON users(nationality);
CREATE INDEX IF NOT EXISTS idx_users_languages ON users USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_users_first_time_in_us_year ON users(first_time_in_us_year);
CREATE INDEX IF NOT EXISTS idx_users_job_discovery_method ON users(job_discovery_method);
CREATE INDEX IF NOT EXISTS idx_users_hobbies ON users USING GIN(hobbies);
CREATE INDEX IF NOT EXISTS idx_users_favorite_state ON users(favorite_state);
CREATE INDEX IF NOT EXISTS idx_users_preferred_outings ON users USING GIN(preferred_outings);
CREATE INDEX IF NOT EXISTS idx_users_has_car ON users(has_car);
CREATE INDEX IF NOT EXISTS idx_users_offers_rides ON users(offers_rides);
CREATE INDEX IF NOT EXISTS idx_users_relationship_status ON users(relationship_status);
CREATE INDEX IF NOT EXISTS idx_users_road_trips ON users(road_trips);
CREATE INDEX IF NOT EXISTS idx_users_favorite_place ON users(favorite_place);
CREATE INDEX IF NOT EXISTS idx_users_willing_to_guide ON users(willing_to_guide);
CREATE INDEX IF NOT EXISTS idx_users_mentorship_interest ON users(mentorship_interest);
CREATE INDEX IF NOT EXISTS idx_users_job_boards ON users USING GIN(job_boards);
CREATE INDEX IF NOT EXISTS idx_users_visa_advice ON users(visa_advice);

CREATE INDEX IF NOT EXISTS idx_meetups_creator_id ON meetups(creator_id);
CREATE INDEX IF NOT EXISTS idx_meetups_category_id ON meetups(category_id);
CREATE INDEX IF NOT EXISTS idx_meetups_meetup_date ON meetups(meetup_date);
CREATE INDEX IF NOT EXISTS idx_meetups_is_active ON meetups(is_active);
CREATE INDEX IF NOT EXISTS idx_meetups_created_at ON meetups(created_at);
CREATE INDEX IF NOT EXISTS idx_meetups_title ON meetups USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_meetups_description ON meetups USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_meetups_location ON meetups USING GIN(to_tsvector('english', location));
CREATE INDEX IF NOT EXISTS idx_meetups_photo_url ON meetups(photo_url);
CREATE INDEX IF NOT EXISTS idx_meetups_photo_public_id ON meetups(photo_public_id);

CREATE INDEX IF NOT EXISTS idx_meetup_interests_meetup_id ON meetup_interests(meetup_id);
CREATE INDEX IF NOT EXISTS idx_meetup_interests_user_id ON meetup_interests(user_id);

CREATE INDEX IF NOT EXISTS idx_meetup_reports_meetup_id ON meetup_reports(meetup_id);
CREATE INDEX IF NOT EXISTS idx_meetup_reports_reporter_id ON meetup_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_meetup_reports_status ON meetup_reports(status);

CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name);
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses(verified);

CREATE INDEX IF NOT EXISTS idx_tips_trips_advice_creator_id ON tips_trips_advice(creator_id);
CREATE INDEX IF NOT EXISTS idx_tips_trips_advice_post_type ON tips_trips_advice(post_type);
CREATE INDEX IF NOT EXISTS idx_tips_trips_advice_active ON tips_trips_advice(is_active);
CREATE INDEX IF NOT EXISTS idx_tips_trips_advice_photos_post_id ON tips_trips_advice_photos(post_id);
CREATE INDEX IF NOT EXISTS idx_tips_trips_advice_photos_order ON tips_trips_advice_photos(post_id, display_order);
CREATE INDEX IF NOT EXISTS idx_tips_comments_post_id ON tips_trips_advice_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_tips_comments_user_id ON tips_trips_advice_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_tips_likes_post_id ON tips_trips_advice_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_tips_likes_user_id ON tips_trips_advice_likes(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_meetups_updated_at ON meetups;
DROP TRIGGER IF EXISTS update_meetup_reports_updated_at ON meetup_reports;
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
DROP TRIGGER IF EXISTS update_business_categories_updated_at ON business_categories;

-- Create triggers to automatically update updated_at
-- Drop triggers if they exist, then create them
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meetups_updated_at ON meetups;
CREATE TRIGGER update_meetups_updated_at 
    BEFORE UPDATE ON meetups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meetup_reports_updated_at ON meetup_reports;
CREATE TRIGGER update_meetup_reports_updated_at 
    BEFORE UPDATE ON meetup_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at 
    BEFORE UPDATE ON businesses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_categories_updated_at ON business_categories;
CREATE TRIGGER update_business_categories_updated_at 
    BEFORE UPDATE ON business_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for tips_trips_advice
CREATE OR REPLACE FUNCTION update_tips_trips_advice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_tips_trips_advice_updated_at ON tips_trips_advice;

CREATE TRIGGER trigger_update_tips_trips_advice_updated_at
    BEFORE UPDATE ON tips_trips_advice
    FOR EACH ROW
    EXECUTE FUNCTION update_tips_trips_advice_updated_at();

-- Update trigger for tips_trips_advice_comments
CREATE OR REPLACE FUNCTION update_tips_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_tips_comments_updated_at ON tips_trips_advice_comments;

CREATE TRIGGER trigger_update_tips_comments_updated_at
    BEFORE UPDATE ON tips_trips_advice_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_tips_comments_updated_at();

-- Insert default meetup categories
INSERT INTO meetup_categories (name, description) VALUES
    ('Social & Networking', 'Casual meetups for networking and socializing'),
    ('Professional Development', 'Career-focused events, workshops, and seminars'),
    ('Cultural Exchange', 'Events celebrating different cultures and traditions'),
    ('Outdoor & Adventure', 'Hiking, sports, and outdoor activities'),
    ('Food & Dining', 'Restaurant visits, cooking classes, and food tours'),
    ('Language Exchange', 'Practice different languages with native speakers'),
    ('Study Groups', 'Academic and professional study sessions'),
    ('Travel & Exploration', 'Group trips and travel planning'),
    ('Hobbies & Interests', 'Shared hobby activities and workshops'),
    ('Community Service', 'Volunteering and community outreach events')
ON CONFLICT (name) DO NOTHING;

-- Insert sample business categories (optional)
-- These can be used to categorize businesses in the future
INSERT INTO business_categories (name, description) VALUES
    ('Technology', 'Software, hardware, and IT services'),
    ('Healthcare', 'Medical services and health-related businesses'),
    ('Education', 'Schools, training, and educational services'),
    ('Food & Beverage', 'Restaurants, cafes, and food services'),
    ('Retail', 'Shopping and consumer goods'),
    ('Professional Services', 'Legal, consulting, and business services'),
    ('Manufacturing', 'Production and manufacturing businesses'),
    ('Real Estate', 'Property and real estate services'),
    ('Transportation', 'Logistics and transportation services'),
    ('Entertainment', 'Media, events, and entertainment services')
ON CONFLICT (name) DO NOTHING;