import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Use the existing Firebase Admin app (initialized in server/index.ts)
const getFirebaseApp = () => {
  const apps = getApps();
  if (apps.length === 0) {
    throw new Error(
      "Firebase Admin app not initialized. Make sure it's initialized in server/index.ts"
    );
  }
  return apps[0];
};

// Lazy initialization for bucket
let bucket: any = null;

const getFirebaseBucket = () => {
  if (!bucket) {
    bucket = getStorage(getFirebaseApp()).bucket();
  }
  return bucket;
};

export interface FileUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

export interface FileUploadOptions {
  maxSize?: number; // in MB
  allowedTypes?: string[];
  folder?: string;
}

// File type validation
const validateFileType = (
  mimetype: string,
  allowedTypes: string[]
): boolean => {
  return allowedTypes.includes(mimetype);
};

// File size validation
const validateFileSize = (size: number, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

// Generate unique filename
const generateFileName = (
  originalName: string,
  userId: string,
  folder: string
): string => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${folder}/${userId}_${timestamp}.${extension}`;
};

// Upload file to Firebase Storage
export const uploadFile = async (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  userId: string,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> => {
  try {
    const {
      maxSize = 10, // Default 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      folder = 'uploads',
    } = options;

    // Validate file type
    if (!validateFileType(mimetype, allowedTypes)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    // Validate file size
    if (!validateFileSize(buffer.length, maxSize)) {
      return {
        success: false,
        error: `File size must be less than ${maxSize}MB`,
      };
    }

    // Generate unique filename
    const fileName = generateFileName(originalName, userId, folder);

    // Create file reference
    const file = getFirebaseBucket().file(fileName);

    // Upload file
    await file.save(buffer, {
      metadata: {
        contentType: mimetype,
        metadata: {
          originalName,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${
      getFirebaseBucket().name
    }/${fileName}`;

    return {
      success: true,
      url: publicUrl,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

// Delete file from Firebase Storage
export const deleteFile = async (
  fileName: string
): Promise<FileUploadResult> => {
  try {
    const file = getFirebaseBucket().file(fileName);
    await file.delete();

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting file from Firebase Storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
};

// Specific upload functions for different file types

// Upload profile photo
export const uploadProfilePhoto = async (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  userId: string
): Promise<FileUploadResult> => {
  return uploadFile(buffer, originalName, mimetype, userId, {
    maxSize: 5, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    folder: 'profile-photos',
  });
};

// Upload meetup photo
export const uploadMeetupPhoto = async (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  userId: string
): Promise<FileUploadResult> => {
  return uploadFile(buffer, originalName, mimetype, userId, {
    maxSize: 5, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    folder: 'meetup-photos',
  });
};

// Upload business logo
export const uploadBusinessLogo = async (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  userId: string
): Promise<FileUploadResult> => {
  return uploadFile(buffer, originalName, mimetype, userId, {
    maxSize: 5, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    folder: 'business-logos',
  });
};

// Upload resume/document
export const uploadResume = async (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  userId: string
): Promise<FileUploadResult> => {
  return uploadFile(buffer, originalName, mimetype, userId, {
    maxSize: 10, // 10MB for documents
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    folder: 'resumes',
  });
};

// Upload tips/trips/advice photos
export const uploadTipsPhoto = async (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  userId: string
): Promise<FileUploadResult> => {
  return uploadFile(buffer, originalName, mimetype, userId, {
    maxSize: 10, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    folder: 'tips-photos',
  });
};

// Helper function to extract file name from Firebase Storage URL
export const extractFileNameFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName;
  } catch (error) {
    console.error('Error extracting file name from URL:', error);
    return null;
  }
};

// Helper function to get file extension
export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
