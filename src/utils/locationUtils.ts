/**
 * Location formatting utilities
 */
import type { LocationData } from '../types/location';
export interface LocationObject {
  city?: string;
  state?: string;
  country?: string;
}

export type LocationInput = string | LocationObject | null | undefined;

/**
 * Formats a location input (string or object) into a readable string format
 * @param location - The location input (string or object with city, state, country)
 * @returns Formatted location string or empty string if no location
 */
export const formatLocationString = (location: LocationInput): string => {
  if (!location) return '';

  if (typeof location === 'string') {
    return location;
  }

  if (typeof location === 'object') {
    const parts = [location.city, location.state, location.country].filter(
      Boolean
    );

    return parts.join(', ');
  }

  return '';
};

/**
 * Formats a location input into a comma-separated string for form inputs
 * @param location - The location input (string or object with city, state, country)
 * @returns Formatted location string with proper comma handling
 */
export const formatLocationForForm = (location: LocationInput): string => {
  if (!location) return '';

  if (typeof location === 'string') {
    return location;
  }

  if (typeof location === 'object') {
    const parts = [location.city, location.state, location.country].filter(
      Boolean
    );

    return parts
      .join(', ')
      .replace(/^,\s*|,\s*$/g, '') // Remove leading/trailing commas
      .replace(/,\s*,/g, ','); // Remove double commas
  }

  return '';
};

/**
 * Parses a location string into an object with city, state, and country
 * @param locationString - The location string to parse (e.g., "City, State, Country")
 * @returns Object with city, state, and country properties
 */
export const parseLocationString = (locationString: string): LocationObject => {
  if (!locationString || typeof locationString !== 'string') {
    return {};
  }

  const parts = locationString
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    city: parts[0] || undefined,
    state: parts[1] || undefined,
    country: parts[2] || undefined,
  };
};

export const buildLocationData = (current?: LocationObject): LocationData => {
  const city = current?.city || '';
  const state = current?.state || '';
  const country = current?.country || '';
  return {
    address: [city, state].filter(Boolean).join(', '),
    city,
    state,
    country,
  };
};
