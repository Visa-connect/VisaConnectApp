import { useState, useRef, useCallback } from 'react';
import { compressImages, CompressionResult } from '../utils/imageCompression';

export interface CompressedPhoto {
  file: File;
  preview: string;
  compression?: CompressionResult;
}

export interface ImageCompressionConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maxSizeKB?: number;
}

const DEFAULT_CONFIG: Required<ImageCompressionConfig> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: 'jpeg',
  maxSizeKB: 2048,
};

export const useImageCompression = (config: ImageCompressionConfig = {}) => {
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);

  const cleanupPreviewUrls = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
  }, []);

  const compressFiles = useCallback(
    async (files: File[] | FileList): Promise<CompressedPhoto[]> => {
      const fileArray = Array.from(files);

      if (fileArray.length === 0) {
        return [];
      }

      setCompressing(true);
      setCompressionProgress(0);

      try {
        const compressionResults = await compressImages(
          fileArray,
          { ...DEFAULT_CONFIG, ...config },
          (completed, total) => {
            if (total > 0) {
              setCompressionProgress(Math.round((completed / total) * 100));
            }
          }
        );

        const compressedPhotos = compressionResults.map((result) => {
          const previewUrl = URL.createObjectURL(result.file);
          previewUrlsRef.current.push(previewUrl);
          return {
            file: result.file,
            preview: previewUrl,
            compression: result,
          };
        });

        return compressedPhotos;
      } catch (error) {
        throw error;
      } finally {
        setCompressing(false);
        setCompressionProgress(0);
      }
    },
    [config]
  );

  return {
    compressFiles,
    compressing,
    compressionProgress,
    previewUrlsRef,
    cleanupPreviewUrls,
  };
};
