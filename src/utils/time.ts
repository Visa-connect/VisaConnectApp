/**
 * Time formatting utilities for consistent time display across the application
 */

/**
 * Format options for time ago display
 */
export interface FormatTimeAgoOptions {
  /** Whether to include "ago" suffix (default: true) */
  includeAgo?: boolean;
  /** Whether to use short format (e.g., "5m" vs "5 minutes") (default: false) */
  useShortFormat?: boolean;
  /** Prefix to add (e.g., "Posted") (default: none) */
  prefix?: string;
  /** Whether to show weeks (default: true) */
  includeWeeks?: boolean;
}

/**
 * Formats a date string into a human-readable "time ago" format
 *
 * @param dateString - ISO date string to format
 * @param options - Formatting options
 * @returns Formatted time ago string
 *
 * @example
 * formatTimeAgo('2024-01-01T12:00:00Z') // "2 hours ago"
 * formatTimeAgo('2024-01-01T12:00:00Z', { useShortFormat: true }) // "2h ago"
 * formatTimeAgo('2024-01-01T12:00:00Z', { prefix: 'Posted' }) // "Posted 2 hours ago"
 */
export function formatTimeAgo(
  dateString: string,
  options: FormatTimeAgoOptions = {}
): string {
  const {
    includeAgo = true,
    useShortFormat = false,
    prefix = '',
    includeWeeks = true,
  } = options;

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Just now (less than 60 seconds)
  if (diffInSeconds < 60) {
    return prefix ? `${prefix} just now` : 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInSeconds / 3600);
  const diffInDays = Math.floor(diffInSeconds / 86400);
  const diffInWeeks = Math.floor(diffInDays / 7);

  const agoSuffix = includeAgo ? ' ago' : '';
  const prefixStr = prefix ? `${prefix} ` : '';

  // Minutes
  if (diffInMinutes < 60) {
    if (useShortFormat) {
      return `${prefixStr}${diffInMinutes}m${agoSuffix}`;
    }
    return `${prefixStr}${diffInMinutes} ${
      diffInMinutes === 1 ? 'minute' : 'minutes'
    }${agoSuffix}`;
  }

  // Hours
  if (diffInHours < 24) {
    if (useShortFormat) {
      return `${prefixStr}${diffInHours}h${agoSuffix}`;
    }
    return `${prefixStr}${diffInHours} ${
      diffInHours === 1 ? 'hour' : 'hours'
    }${agoSuffix}`;
  }

  // Days
  if (diffInDays < 7 || !includeWeeks) {
    if (useShortFormat) {
      return `${prefixStr}${diffInDays}d${agoSuffix}`;
    }
    return `${prefixStr}${diffInDays} ${
      diffInDays === 1 ? 'day' : 'days'
    }${agoSuffix}`;
  }

  // Weeks
  if (diffInWeeks < 4) {
    if (useShortFormat) {
      return `${prefixStr}${diffInWeeks}w${agoSuffix}`;
    }
    return `${prefixStr}${diffInWeeks} ${
      diffInWeeks === 1 ? 'week' : 'weeks'
    }${agoSuffix}`;
  }

  // For older dates, show the actual date
  return `${prefixStr}${date.toLocaleDateString()}`;
}

/**
 * Compact version of formatTimeAgo using short format
 * Useful for notifications and lists where space is limited
 *
 * @param dateString - ISO date string to format
 * @returns Compact time ago string (e.g., "5m ago", "2h ago", "3d ago")
 *
 * @example
 * formatTimeAgoCompact('2024-01-01T12:00:00Z') // "2h ago"
 */
export function formatTimeAgoCompact(dateString: string): string {
  return formatTimeAgo(dateString, { useShortFormat: true });
}

/**
 * Format time ago without "ago" suffix
 * Useful for inline displays or when context makes "ago" redundant
 *
 * @param dateString - ISO date string to format
 * @returns Time ago string without "ago" (e.g., "5 minutes", "2 hours", "3 days")
 *
 * @example
 * formatTimeAgoNoSuffix('2024-01-01T12:00:00Z') // "2 hours"
 */
export function formatTimeAgoNoSuffix(dateString: string): string {
  return formatTimeAgo(dateString, { includeAgo: false });
}

/**
 * Format time ago with "Posted" prefix
 * Commonly used for job postings and content creation times
 *
 * @param dateString - ISO date string to format
 * @returns Formatted string with "Posted" prefix
 *
 * @example
 * formatTimeAgoWithPosted('2024-01-01T12:00:00Z') // "Posted 2 hours ago"
 */
export function formatTimeAgoWithPosted(dateString: string): string {
  return formatTimeAgo(dateString, { prefix: 'Posted' });
}
