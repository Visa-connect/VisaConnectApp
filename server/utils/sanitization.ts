/**
 * Output Sanitization Utility
 *
 * Provides functions to sanitize user-generated content before sending it
 * in API responses. Prevents XSS attacks by escaping HTML entities and
 * removing potentially dangerous content.
 *
 * Note: This is server-side sanitization. Client-side should also sanitize
 * user input, but server-side sanitization is the primary defense.
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Escapes HTML entities in a string to prevent XSS attacks
 *
 * @param str - The string to escape
 * @returns Escaped string with HTML entities encoded
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Removes potentially dangerous HTML tags and attributes
 * Uses sanitize-html library for robust HTML sanitization
 * that handles malformed HTML, nested tags, and various bypass attempts
 *
 * @param str - The string to sanitize
 * @returns Sanitized string with HTML tags removed (plain text only)
 */
export function stripHtmlTags(str: string | null | undefined): string {
  if (!str) {
    return '';
  }

  // Use sanitize-html to strip all HTML tags and return plain text
  // This handles malformed HTML, nested tags, line breaks, and various bypass attempts
  // Setting allowedTags to [] removes all tags, leaving only text content
  return sanitizeHtml(str, {
    allowedTags: [], // No tags allowed - strip everything
    allowedAttributes: {}, // No attributes allowed
  });
}

/**
 * Sanitizes a string by escaping HTML or removing dangerous content
 *
 * @param str - The string to sanitize
 * @param options - Sanitization options
 * @param options.escapeHtml - If true, escape HTML entities (mutually exclusive with stripHtmlTags)
 * @param options.stripHtmlTags - If true, strip all HTML tags (mutually exclusive with escapeHtml)
 * @param options.maxLength - Maximum length of the sanitized string
 * @param options.trim - Whether to trim whitespace (default: true)
 * @returns Sanitized string
 * @throws Error if both escapeHtml and stripHtmlTags are true
 *
 * Note: escapeHtml and stripHtmlTags are mutually exclusive. If both are true,
 * stripHtmlTags takes precedence (more secure as it removes all HTML).
 * If neither is specified, defaults to stripHtmlTags: true for security.
 */
export function sanitizeString(
  str: string | null | undefined,
  options: {
    escapeHtml?: boolean;
    stripHtmlTags?: boolean;
    maxLength?: number;
    trim?: boolean;
  } = {}
): string {
  if (!str) {
    return '';
  }

  let sanitized = str;

  // Trim if requested (default: true)
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Enforce mutual exclusivity: stripHtmlTags takes precedence if both are true
  const shouldEscape =
    options.escapeHtml === true && options.stripHtmlTags !== true;
  const shouldStrip =
    options.stripHtmlTags === true ||
    (options.escapeHtml !== true && options.stripHtmlTags !== false);

  // Apply sanitization in correct order: escape first (if needed), then strip (if needed)
  // Order: trim → (escape OR strip) → limit length
  if (shouldEscape) {
    // Escape HTML entities first to neutralize any malicious HTML
    sanitized = escapeHtml(sanitized);
  } else if (shouldStrip) {
    // Strip HTML tags (removes all HTML, so escaping is unnecessary)
    sanitized = stripHtmlTags(sanitized);
  }

  // Limit length if requested
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes an object by sanitizing all string properties
 *
 * @param obj - The object to sanitize
 * @param fields - Optional list of fields to sanitize (if not provided, sanitizes all string fields)
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T | null | undefined,
  fields?: string[],
  options: {
    escapeHtml?: boolean;
    stripHtmlTags?: boolean;
    maxLength?: number;
  } = {}
): T | null {
  if (!obj) {
    return null;
  }

  // Use Record<string, any> for mutation, then cast back to T
  const sanitized: Record<string, any> = { ...obj };

  // If fields are specified, only sanitize those fields
  if (fields && fields.length > 0) {
    for (const field of fields) {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = sanitizeString(sanitized[field], options);
      }
    }
  } else {
    // Otherwise, sanitize all string fields
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitizeString(sanitized[key], options);
      } else if (Array.isArray(sanitized[key])) {
        // Recursively sanitize array elements
        sanitized[key] = sanitizeArray(sanitized[key], options);
      } else if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null &&
        !(sanitized[key] instanceof Date)
      ) {
        // Recursively sanitize nested objects (but preserve Date objects)
        sanitized[key] = sanitizeObject(sanitized[key], undefined, options);
      }
      // Date objects are preserved as-is (they will be serialized to ISO strings by JSON.stringify)
    }
  }

  return sanitized as T;
}

/**
 * Sanitizes an array by sanitizing all string elements and objects
 *
 * @param arr - The array to sanitize
 * @param options - Sanitization options
 * @returns Sanitized array
 */
export function sanitizeArray<T>(
  arr: T[] | null | undefined,
  options: {
    escapeHtml?: boolean;
    stripHtmlTags?: boolean;
    maxLength?: number;
  } = {}
): T[] {
  if (!arr || !Array.isArray(arr)) {
    return [];
  }

  return arr.map((item) => {
    if (typeof item === 'string') {
      return sanitizeString(item, options) as T;
    } else if (Array.isArray(item)) {
      return sanitizeArray(item, options) as T;
    } else if (
      typeof item === 'object' &&
      item !== null &&
      !(item instanceof Date)
    ) {
      return sanitizeObject(item, undefined, options) as T;
    }
    // Date objects and other primitives are preserved as-is
    return item;
  });
}

/**
 * Sanitizes user-generated content in posts (title, description)
 *
 * @param post - The post object to sanitize
 * @returns Sanitized post object
 */
export function sanitizePost(post: {
  title?: string;
  description?: string;
  [key: string]: any;
}): typeof post {
  return (
    sanitizeObject(post, ['title', 'description'], {
      stripHtmlTags: true, // Strip HTML tags (more secure than escaping)
      maxLength: 10000, // Reasonable max length for posts
    }) || post
  );
}

/**
 * Sanitizes user-generated content in comments
 *
 * @param comment - The comment object to sanitize
 * @returns Sanitized comment object
 */
export function sanitizeComment(comment: {
  content?: string;
  [key: string]: any;
}): typeof comment {
  return (
    sanitizeObject(comment, ['content'], {
      stripHtmlTags: true, // Strip HTML tags (more secure than escaping)
      maxLength: 5000, // Reasonable max length for comments
    }) || comment
  );
}

/**
 * Sanitizes user-generated content in chat messages
 *
 * @param message - The message object to sanitize
 * @returns Sanitized message object
 */
export function sanitizeMessage(message: {
  content?: string;
  [key: string]: any;
}): typeof message {
  return (
    sanitizeObject(message, ['content'], {
      stripHtmlTags: true, // Strip HTML tags (more secure than escaping)
      maxLength: 10000, // Reasonable max length for messages
    }) || message
  );
}

/**
 * Sanitizes user-generated content in API responses
 * Recursively sanitizes all user-generated fields in the response
 *
 * @param data - The response data to sanitize
 * @param userGeneratedFields - List of fields that contain user-generated content
 * @returns Sanitized response data
 */
export function sanitizeResponse<T>(
  data: T,
  userGeneratedFields: string[] = [
    'title',
    'description',
    'content',
    'message',
    'comment',
  ]
): T {
  if (!data) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data) as T;
  }

  if (Array.isArray(data)) {
    return sanitizeArray(data) as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    return sanitizeObject(
      data as Record<string, any>,
      userGeneratedFields
    ) as T;
  }

  return data;
}

/**
 * Sanitizes error messages to prevent information disclosure
 * Only returns safe, user-friendly error messages
 *
 * @param error - The error object or message
 * @param userFriendlyMessage - Optional user-friendly message to return instead
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(
  error: unknown,
  userFriendlyMessage?: string
): string {
  if (userFriendlyMessage) {
    return sanitizeString(userFriendlyMessage);
  }

  if (error instanceof Error) {
    // Only return the message, not the stack trace
    return sanitizeString(error.message);
  }

  if (typeof error === 'string') {
    return sanitizeString(error);
  }

  return 'An error occurred';
}
