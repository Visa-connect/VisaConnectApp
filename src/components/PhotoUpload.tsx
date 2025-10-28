import React, { useState, useRef, useCallback } from 'react';
import { PhotoIcon, PencilIcon } from '@heroicons/react/24/outline';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoChange: (file: File) => void;
  onPhotoRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  accept?: string;
  maxSize?: number; // in MB
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhotoUrl,
  onPhotoChange,
  onPhotoRemove,
  size = 'md',
  className = '',
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 5, // 5MB default
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Size configurations
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      setError('');

      // Validate file type
      if (!accept.includes(file.type)) {
        setError('Please select a valid image file (JPG, PNG, or WebP)');
        return;
      }

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File size must be less than ${maxSize}MB`);
        return;
      }

      // Validate image dimensions (optional - can be enhanced later)
      const img = new Image();
      img.onload = () => {
        if (img.width < 100 || img.height < 100) {
          setError('Image must be at least 100x100 pixels');
          return;
        }
        onPhotoChange(file);
      };
      img.onerror = () => {
        setError('Invalid image file');
      };
      img.src = URL.createObjectURL(file);
    },
    [accept, maxSize, onPhotoChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPhotoRemove) {
      onPhotoRemove();
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Photo Display/Upload Area */}
      <div
        className={`${
          sizeClasses[size]
        } rounded-full border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : currentPhotoUrl
            ? 'border-gray-300 hover:border-gray-400'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {currentPhotoUrl ? (
          // Show current photo
          <div className="relative w-full h-full">
            <img
              src={currentPhotoUrl}
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
            {/* Remove button overlay */}
            {onPhotoRemove && (
              <button
                onClick={handleRemove}
                className="absolute -top-1 -right-1 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border-2 border-black"
                aria-label="Remove photo"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          // Show upload placeholder - centered content
          <div className="flex flex-col items-center justify-center text-gray-400 text-center">
            <PhotoIcon className={iconSizes[size]} />
            <span className="text-xs mt-1">
              {isDragOver ? 'Drop here' : 'Click to upload'}
            </span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <div className="mt-2 text-xs text-red-600 text-center max-w-full">
          {error}
        </div>
      )}

      {/* Upload hint */}
      {!currentPhotoUrl && !error && (
        <div className="mt-2 text-xs text-gray-500 text-center max-w-full">
          Drag & drop or click to upload
          <br />
          Max size: {maxSize}MB
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
