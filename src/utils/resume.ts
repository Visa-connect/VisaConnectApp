// Validate if URL is from trusted Firebase Storage domain
export const isValidResumeUrl = (url: string): boolean => {
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
      'visaconnectus-stage.firebasestorage.app',
      'visaconnectus.firebasestorage.app',
    ];

    return trustedDomains.some((domain) => urlObj.hostname === domain);
  } catch (error) {
    // Invalid URL format
    return false;
  }
};

// Derive a display file name from a Firebase or generic URL
export const getResumeFileName = (resumeUrl: string): string => {
  try {
    const url = new URL(resumeUrl);

    // Handle Firebase Storage pattern: .../o/<encoded path>
    if (url.pathname.includes('/o/')) {
      const afterO = url.pathname.split('/o/')[1] || '';
      const decodedPath = decodeURIComponent(afterO);
      const segments = decodedPath.split('/');
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment.includes('.')) {
        return lastSegment;
      }
    }

    // Fallback to last path segment from generic URLs
    const lastPathPart = url.pathname.split('/').pop() || '';
    if (lastPathPart && lastPathPart.includes('.')) {
      return decodeURIComponent(lastPathPart);
    }

    // Final fallback: generic name without assuming extension
    return 'resume';
  } catch {
    return 'resume';
  }
};

// Matches markdown-style resume links: [View Resume](http(s)://...)
export const RESUME_LINK_REGEX = /\[View Resume\]\((https?:\/\/[^)]+)\)/g;
