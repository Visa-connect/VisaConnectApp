import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ResumeViewerProps {
  resumeUrl: string;
  resumeFileName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Validate if URL is from trusted Firebase Storage domain
const isValidResumeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);

    // Only allow HTTPS URLs
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    // Allow Firebase Storage domains
    const trustedDomains = [
      'storage.googleapis.com',
      'firebasestorage.googleapis.com',
      'visaconnectus-stage.firebasestorage.app', // Your staging bucket
      'visaconnectus.firebasestorage.app', // Your production bucket
    ];

    return trustedDomains.some((domain) => urlObj.hostname === domain);
  } catch (error) {
    // Invalid URL format
    return false;
  }
};

const ResumeViewer: React.FC<ResumeViewerProps> = ({
  resumeUrl,
  resumeFileName,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validate URL before rendering
  if (!isValidResumeUrl(resumeUrl)) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <svg
                  className="h-12 w-12 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Security Warning
              </h3>
              <p className="text-gray-600 mb-4">
                This resume link is from an untrusted source and cannot be
                displayed safely.
              </p>
              <div className="flex space-x-2 justify-center">
                <button
                  onClick={() => window.open(resumeUrl, '_blank')}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Open in New Tab (External)
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    setError(
      'Failed to load resume. The file may be corrupted or in an unsupported format.'
    );
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'Word Document';
      default:
        return 'Document';
    }
  };

  const isPdf = resumeFileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Resume: {resumeFileName}
              </h3>
              <p className="text-sm text-gray-500">
                {getFileType(resumeFileName)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="relative h-[80vh]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading resume...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center p-6">
                  <div className="text-red-500 mb-4">
                    <svg
                      className="h-12 w-12 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => window.open(resumeUrl, '_blank')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open in New Tab
                  </button>
                </div>
              </div>
            )}

            {isPdf ? (
              <iframe
                src={resumeUrl}
                className="w-full h-full border-0"
                onLoad={handleLoad}
                onError={handleError}
                title={`Resume: ${resumeFileName}`}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-6">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="h-16 w-16 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {getFileType(resumeFileName)}
                  </h4>
                  <p className="text-gray-600 mb-4">
                    This file type cannot be previewed in the browser.
                  </p>
                  <button
                    onClick={() => window.open(resumeUrl, '_blank')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download & Open
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Click outside or press ESC to close
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.open(resumeUrl, '_blank')}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Open in New Tab
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeViewer;
