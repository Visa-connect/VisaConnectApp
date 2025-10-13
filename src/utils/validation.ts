/**
 * Shared validation utilities for consistent validation across the application
 */

/**
 * Standard email validation regex pattern
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates if an email address is in the correct format
 * @param email - The email address to validate
 * @returns true if the email format is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validates if a password meets minimum requirements
 * @param password - The password to validate
 * @returns true if the password meets requirements, false otherwise
 */
export const isValidPassword = (password: string): boolean => {
  // Minimum 6 characters
  return password.length >= 6;
};

/**
 * Validates if a string is not empty or just whitespace
 * @param value - The string to validate
 * @returns true if the string has content, false otherwise
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validates if a phone number is in a valid format
 * @param phone - The phone number to validate
 * @returns true if the phone number format is valid, false otherwise
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  // Check if it's between 10-15 digits (international format)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

/**
 * Common validation error messages
 */
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required.',
  EMAIL_INVALID: 'Invalid email address.',
  PASSWORD_REQUIRED: 'Password is required.',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters.',
  FIELD_REQUIRED: 'This field is required.',
  PHONE_INVALID: 'Invalid phone number format.',
} as const;
