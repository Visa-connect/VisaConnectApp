# Firebase Storage Implementation Guide

## Overview

This document outlines the complete migration from Cloudinary to Firebase Storage for the VisaConnect application. The implementation follows a server-side architecture for better security and consistency.

## Architecture Decision

### Why Server-Side Firebase Storage?

1. **🔒 Security**: File validation happens on server, no client-side Firebase config exposure
2. **🏗️ Consistency**: Matches existing Firebase Auth pattern
3. **🛡️ Control**: Server enforces file size/type limits and upload quotas
4. **📱 Simplicity**: Frontend just sends files to API, no Firebase SDK needed

## Implementation Summary

### ✅ Completed Tasks

1. **Backend Firebase Storage Service** (`server/services/firebaseStorageService.ts`)

   - Handles all file uploads/downloads
   - Supports images (JPG, PNG, WebP) and documents (PDF, DOC, DOCX)
   - Proper file validation and error handling

2. **Updated API Endpoints** (`server/api/photo.ts`)

   - All photo endpoints now use Firebase Storage
   - Added new `/api/photo/upload-resume` endpoint
   - Updated delete endpoints to use Firebase file names

3. **Frontend Integration**

   - Updated `PostMeetupScreen` to use Firebase Storage
   - Implemented resume upload in `ApplyToJobScreen`
   - Updated `cloudinary.ts` to work with backend API

4. **Database Migration** (`005_migrate_to_firebase_storage.sql`)
   - Updated schema to support Firebase Storage
   - Added business logo fields
   - Created monitoring views and validation functions

## File Support

### Images (5MB limit)

- **Profile Photos**: User profile pictures
- **Meetup Photos**: Event images
- **Business Logos**: Company logos
- **Tips Photos**: Content images for tips/trips/advice

### Documents (10MB limit)

- **Resumes**: PDF, DOC, DOCX files for job applications

## API Endpoints

### Photo Upload Endpoints

- `POST /api/photo/upload-profile-photo` - Upload profile photo
- `POST /api/photo/upload-meetup-photo` - Upload meetup photo
- `POST /api/photo/upload-business-logo` - Upload business logo
- `POST /api/photo/upload-tips-photo` - Upload tips photo
- `POST /api/photo/upload-resume` - Upload resume/document

### Photo Delete Endpoints

- `DELETE /api/photo/delete-profile-photo` - Delete profile photo
- `DELETE /api/photo/delete-meetup-photo` - Delete meetup photo
- `DELETE /api/photo/delete-business-logo` - Delete business logo
- `DELETE /api/photo/delete-tips-photo` - Delete tips photo

## Database Schema

### Updated Tables

#### Users Table

- `profile_photo_url` - Firebase Storage URL
- `profile_photo_public_id` - Firebase Storage file name

#### Meetups Table

- `photo_url` - Firebase Storage URL
- `photo_public_id` - Firebase Storage file name

#### Businesses Table

- `business_logo_url` - Firebase Storage URL (new)
- `business_logo_file_name` - Firebase Storage file name (new)

#### Job Applications Table

- `resume_url` - Firebase Storage URL
- `resume_filename` - Original filename

#### Tips/Trips/Advice Photos Table

- `photo_url` - Firebase Storage URL
- `photo_public_id` - Firebase Storage file name

## Environment Variables

Add these to your `.env` file:

```env
# Firebase Storage
FIREBASE_STORAGE_BUCKET=your-bucket-name.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

## Migration Steps

### 1. Apply Database Migration

```bash
# Run the migration script
cd server
node scripts/migrate-to-firebase-storage.js

# Or manually apply the SQL
psql -d your_database_name -f db/migrations/005_migrate_to_firebase_storage.sql
```

### 2. Update Environment Variables

Add Firebase Storage configuration to your environment variables.

### 3. Test File Uploads

Test all file upload functionality:

- Profile photos
- Meetup photos
- Business logos
- Resume uploads

## Monitoring

### Storage Usage View

Query the `firebase_storage_usage` view to monitor storage:

```sql
SELECT * FROM firebase_storage_usage;
```

### Validation Functions

- `is_valid_firebase_storage_url(url)` - Validates Firebase Storage URLs
- `extract_firebase_file_name(url)` - Extracts file names from URLs

## Security Features

1. **File Type Validation**: Server validates file types before upload
2. **File Size Limits**: Enforced on both client and server
3. **Access Control**: All uploads require authentication
4. **Audit Trail**: All operations logged through backend API

## Error Handling

The implementation includes comprehensive error handling:

- File type validation errors
- File size limit errors
- Upload failure handling
- Delete operation error handling
- Network error recovery

## Performance Considerations

1. **File Size Limits**: 5MB for images, 10MB for documents
2. **Concurrent Uploads**: Handled by Firebase Storage
3. **CDN**: Firebase Storage provides global CDN
4. **Caching**: Browser caching for uploaded files

## Troubleshooting

### Common Issues

1. **Upload Failures**: Check Firebase Storage bucket configuration
2. **File Type Errors**: Verify file type validation on both client and server
3. **Size Limit Errors**: Check file size limits in multer configuration
4. **Authentication Errors**: Verify Firebase service account configuration

### Debug Commands

```sql
-- Check storage usage
SELECT * FROM firebase_storage_usage;

-- Check migration status
SELECT * FROM migration_log WHERE migration_name = '005_migrate_to_firebase_storage';

-- Validate URLs
SELECT profile_photo_url, is_valid_firebase_storage_url(profile_photo_url)
FROM users WHERE profile_photo_url IS NOT NULL;
```

## Future Enhancements

1. **Image Optimization**: Add image resizing/compression
2. **Thumbnail Generation**: Create thumbnails for images
3. **Batch Uploads**: Support multiple file uploads
4. **File Cleanup**: Automated cleanup of orphaned files
5. **Storage Analytics**: Detailed usage analytics

## Support

For issues or questions about the Firebase Storage implementation:

1. Check the troubleshooting section above
2. Review the migration logs
3. Verify environment variable configuration
4. Test with the monitoring views

## Conclusion

The Firebase Storage implementation provides a secure, scalable, and consistent file storage solution that integrates seamlessly with the existing VisaConnect architecture. The server-side approach ensures better security and control while maintaining a simple frontend interface.
