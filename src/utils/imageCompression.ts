/**
 * Image compression utilities for optimizing photos before upload
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  maxSizeKB?: number; // Maximum file size in KB
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    original: { width: number; height: number };
    compressed: { width: number; height: number };
  };
}

/**
 * Compress an image file with the specified options
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    format = 'jpeg',
    maxSizeKB = 2048, // 2MB default
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // ✅ STEP 1: Revoke immediately - image is loaded, URL no longer needed
      URL.revokeObjectURL(img.src);

      try {
        // Store original dimensions
        const originalDimensions = {
          width: img.width,
          height: img.height,
        };

        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with specified format and quality
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // If the compressed image is still too large, reduce quality
            let finalBlob = blob;

            if (blob.size > maxSizeKB * 1024 && quality > 0.1) {
              finalBlob = await compressWithReducedQuality(
                canvas,
                format,
                quality,
                maxSizeKB * 1024
              );
            }

            // Create new File object
            const compressedFile = new File([finalBlob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: finalBlob.size,
              compressionRatio: Math.round(
                ((file.size - finalBlob.size) / file.size) * 100
              ),
              dimensions: {
                original: originalDimensions,
                compressed: { width, height },
              },
            });
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      // ✅ STEP 2: Also revoke on error to prevent memory leak
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    // ✅ STEP 3: Create blob URL and assign (executes last, triggers loading)
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Calculate scaling factor
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scale = Math.min(widthRatio, heightRatio, 1); // Don't upscale

  if (scale < 1) {
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  return { width, height };
};

/**
 * Compress image with progressively reduced quality until size target is met
 */
const compressWithReducedQuality = async (
  canvas: HTMLCanvasElement,
  format: string,
  initialQuality: number,
  targetSizeBytes: number
): Promise<Blob> => {
  let quality = initialQuality;
  let blob: Blob | null = null;

  // Reduce quality in steps until we meet the size target
  while (quality > 0.1 && (!blob || blob.size > targetSizeBytes)) {
    const currentQuality = quality; // Capture current quality value
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => resolve(result),
        `image/${format}`,
        currentQuality
      );
    });

    if (blob && blob.size <= targetSizeBytes) {
      break;
    }

    quality -= 0.1;
  }

  if (!blob) {
    throw new Error('Failed to compress image to target size');
  }

  return blob;
};

/**
 * Compress multiple images with progress callback
 */
export const compressImages = async (
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (
    completed: number,
    total: number,
    result?: CompressionResult
  ) => void
): Promise<CompressionResult[]> => {
  const results: CompressionResult[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await compressImage(files[i], options);
      results.push(result);
      onProgress?.(i + 1, files.length, result);
    } catch (error) {
      console.error(`Failed to compress image ${i + 1}:`, error);
      // Return original file if compression fails
      results.push({
        file: files[i],
        originalSize: files[i].size,
        compressedSize: files[i].size,
        compressionRatio: 0,
        dimensions: {
          original: { width: 0, height: 0 },
          compressed: { width: 0, height: 0 },
        },
      });
      onProgress?.(i + 1, files.length);
    }
  }

  return results;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
