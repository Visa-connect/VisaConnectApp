/**
 * Phone number validation and formatting utilities
 * Supports E.164 format for international phone numbers
 */

// Common country codes with their dial codes
export const COUNTRY_CODES = {
  US: { code: '+1', name: 'United States', pattern: /^[2-9]\d{9}$/ },
  GB: { code: '+44', name: 'United Kingdom', pattern: /^\d{10}$/ },
  CA: { code: '+1', name: 'Canada', pattern: /^[2-9]\d{9}$/ },
  IN: { code: '+91', name: 'India', pattern: /^\d{10}$/ },
  MX: { code: '+52', name: 'Mexico', pattern: /^\d{10}$/ },
  BR: { code: '+55', name: 'Brazil', pattern: /^\d{10,11}$/ },
  DE: { code: '+49', name: 'Germany', pattern: /^\d{10,11}$/ },
  FR: { code: '+33', name: 'France', pattern: /^\d{9}$/ },
  IT: { code: '+39', name: 'Italy', pattern: /^\d{9,10}$/ },
  ES: { code: '+34', name: 'Spain', pattern: /^\d{9}$/ },
  AU: { code: '+61', name: 'Australia', pattern: /^\d{9}$/ },
  JP: { code: '+81', name: 'Japan', pattern: /^\d{10}$/ },
  CN: { code: '+86', name: 'China', pattern: /^\d{11}$/ },
  KR: { code: '+82', name: 'South Korea', pattern: /^\d{9,10}$/ },
  NG: { code: '+234', name: 'Nigeria', pattern: /^\d{10}$/ },
  ZA: { code: '+27', name: 'South Africa', pattern: /^\d{9}$/ },
} as const;

export type CountryCode = keyof typeof COUNTRY_CODES;

/**
 * Validates and formats a phone number to E.164 format
 * @param phoneNumber - The phone number to validate
 * @param countryCode - Optional country code (defaults to US)
 * @returns Formatted phone number in E.164 format or null if invalid
 */
export function formatToE164(
  phoneNumber: string,
  countryCode: CountryCode = 'US'
): string | null {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  const country = COUNTRY_CODES[countryCode];
  if (!country) {
    return null;
  }

  // If phone already starts with country code, validate it
  if (phoneNumber.startsWith('+')) {
    const withoutPlus = phoneNumber.substring(1).replace(/\D/g, '');
    const dialCode = country.code.substring(1);

    if (withoutPlus.startsWith(dialCode)) {
      const localNumber = withoutPlus.substring(dialCode.length);
      if (country.pattern.test(localNumber)) {
        return `+${withoutPlus}`;
      }
    }
    return null;
  }

  // Validate local number format
  if (!country.pattern.test(digitsOnly)) {
    return null;
  }

  // Return E.164 format: +[country code][local number]
  return `${country.code}${digitsOnly}`;
}

/**
 * Validates if a phone number is in valid E.164 format
 * @param phoneNumber - The phone number to validate
 * @returns True if valid E.164 format
 */
export function isValidE164(phoneNumber: string): boolean {
  // E.164 format: +[1-3 digits country code][up to 15 digits]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Extracts country code from E.164 formatted phone number
 * @param e164Number - Phone number in E.164 format
 * @returns Country code or null if not found
 */
export function extractCountryCode(e164Number: string): CountryCode | null {
  if (!e164Number.startsWith('+')) {
    return null;
  }

  // Check each country code
  for (const [code, info] of Object.entries(COUNTRY_CODES)) {
    if (e164Number.startsWith(info.code)) {
      return code as CountryCode;
    }
  }

  return null;
}

/**
 * Formats E.164 phone number for display (human-readable)
 * @param e164Number - Phone number in E.164 format
 * @returns Formatted display string
 */
export function formatForDisplay(e164Number: string): string {
  if (!isValidE164(e164Number)) {
    return e164Number;
  }

  const countryCode = extractCountryCode(e164Number);
  if (!countryCode) {
    return e164Number;
  }

  const country = COUNTRY_CODES[countryCode];
  const localNumber = e164Number.substring(country.code.length);

  // Format US/Canada numbers as (XXX) XXX-XXXX
  if (countryCode === 'US' || countryCode === 'CA') {
    return `${country.code} (${localNumber.slice(0, 3)}) ${localNumber.slice(
      3,
      6
    )}-${localNumber.slice(6)}`;
  }

  // Default format: +XX XXX XXX XXXX
  return `${country.code} ${localNumber}`;
}

/**
 * Sanitizes phone number input (removes invalid characters)
 * @param input - Raw phone number input
 * @returns Sanitized string with only valid characters
 */
export function sanitizePhoneInput(input: string): string {
  // Allow digits, plus sign at start, spaces, hyphens, and parentheses
  // eslint-disable-next-line no-useless-escape
  return input.replace(/[^\d\s\-\(\)\+]/g, '');
}

/**
 * Validates phone number length constraints
 * @param phoneNumber - The phone number to validate
 * @returns True if length is valid (max 20 chars for E.164)
 */
export function isValidLength(phoneNumber: string): boolean {
  return phoneNumber.length >= 10 && phoneNumber.length <= 20;
}
