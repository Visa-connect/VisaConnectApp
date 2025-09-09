# Database Migrations

This directory contains database migration scripts for the VisaConnect application.

## Recent Migrations

### Add Meetup Photo URL Fields

**File**: `add-meetup-photo-url.sql`

**Date**: Current

**Description**: Adds photo support to meetups table

**Changes**:

- Added `photo_url` VARCHAR(500) field to store meetup image URLs
- Added `photo_public_id` VARCHAR(255) field to store Cloudinary public IDs for photo management
- Created indexes on both fields for performance
- Added column comments for documentation

**To Apply**:

```bash
psql -d your_database_name -f add-meetup-photo-url.sql
```

**Backend Changes Required**:

- Updated `Meetup` interface in `meetupService.ts`
- Updated `CreateMeetupRequest` and `UpdateMeetupRequest` interfaces
- Modified `createMeetup`, `getMeetup`, and `searchMeetups` methods
- Updated API endpoint to handle photo fields

**Frontend Changes Required**:

- Updated `Meetup` interface in `meetupService.ts`
- Updated `CreateMeetupRequest` interface
- Modified `PostMeetupScreen` to handle photo uploads
- Updated `MeetupsScreen` and `MeetupDetailsScreen` to display photos

**Notes**:

- Photo fields are optional and can be null
- `photo_public_id` is used for Cloudinary integration to enable photo deletion
- Frontend currently uses placeholder URLs for testing; actual Cloudinary integration needed
