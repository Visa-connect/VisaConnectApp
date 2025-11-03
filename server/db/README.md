# Database Migrations

This directory contains database migration scripts for the VisaConnect application.

## Recent Migrations

### Migrate to Firebase Storage

**File**: `005_migrate_to_firebase_storage.sql`

**Date**: Current

**Description**: Migrates from Cloudinary to Firebase Storage for all file uploads

**Changes**:

- Updated column comments to clarify Firebase Storage usage
- Added business logo fields to businesses table
- Created indexes for new business logo fields
- Added Firebase Storage URL validation functions
- Created monitoring view for storage usage
- Added migration logging system

**To Apply**:

```bash
psql -d your_database_name -f 005_migrate_to_firebase_storage.sql
```

**Backend Changes Required**:

- Updated `firebaseStorageService.ts` for server-side file handling
- Updated `photo.ts` API endpoints to use Firebase Storage
- Added resume upload functionality
- Updated all photo upload/delete functions

**Frontend Changes Required**:

- Updated `cloudinary.ts` to work with backend API
- Updated `PostMeetupScreen` for Firebase Storage
- Updated `ApplyToJobScreen` for resume uploads
- Removed client-side Firebase Storage SDK

**Notes**:

- All file uploads now go through backend API
- Supports images (JPG, PNG, WebP) and documents (PDF, DOC, DOCX)
- File size limits: 5MB for images, 10MB for documents
- Better security with server-side validation
- Consistent with existing Firebase Auth architecture
