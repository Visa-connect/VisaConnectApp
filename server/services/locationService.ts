// Nominatim API response types
export interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
    county?: string;
    suburb?: string;
    road?: string;
    house_number?: string;
  };
}

export interface NominatimReverseResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
    county?: string;
    suburb?: string;
    road?: string;
    house_number?: string;
  };
}

// Nominatim API base URL
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Simple in-memory cache with TTL (Time To Live)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class LocationCache {
  private cache: Map<string, CacheEntry<NominatimSearchResult[]>>;
  private ttl: number; // Time to live in milliseconds (5 minutes)

  constructor(ttl: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key: string): NominatimSearchResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: NominatimSearchResult[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Create a singleton cache instance
const searchCache = new LocationCache(5 * 60 * 1000); // 5 minutes TTL

/**
 * Search for locations using Nominatim API
 * @param query - Search query string
 * @returns Array of search results
 */
export async function searchLocations(
  query: string
): Promise<NominatimSearchResult[]> {
  if (query.length < 3) return [];

  // Check cache first
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '10',
      addressdetails: '1',
      extratags: '0', // Disable extra tags to reduce clutter
      namedetails: '0', // Disable name details to reduce clutter
      countrycodes: 'us', // Limit to USA only
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'VisaConnect/1.0 (support@visaconnect.app)', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    const results = (await response.json()) as NominatimSearchResult[];

    // Filter results to ensure they're in the USA
    const filteredResults = results.filter((result) => {
      // Ensure we have a display name and the result is in the USA
      if (!result.display_name) return false;

      // Check if the address indicates it's in the USA
      const address = result.address;
      if (address) {
        return (
          address.country === 'United States' ||
          address.country === 'USA' ||
          address.country === 'US' ||
          result.display_name.includes('United States') ||
          result.display_name.includes(', USA') ||
          result.display_name.includes(', US')
        );
      }

      // If no address details, include it (countrycodes should have filtered it)
      return true;
    });

    // Cache the results
    searchCache.set(cacheKey, filteredResults);

    return filteredResults;
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to get address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Reverse geocoding result or null
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<NominatimReverseResult | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      addressdetails: '1',
      extratags: '0', // Disable extra tags to reduce clutter
      namedetails: '0', // Disable name details to reduce clutter
      countrycodes: 'us', // Limit to USA only
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': 'VisaConnect/1.0 (support@visaconnect.app)',
      },
    });

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const result = (await response.json()) as NominatimReverseResult;

    // Verify the result is in the USA
    const address = result.address;
    if (address) {
      const isUSA =
        address.country === 'United States' ||
        address.country === 'USA' ||
        address.country === 'US' ||
        result.display_name.includes('United States') ||
        result.display_name.includes(', USA') ||
        result.display_name.includes(', US');

      if (!isUSA) {
        console.warn(
          'Reverse geocoding result is not in USA:',
          result.display_name
        );
        return null;
      }
    }

    return result;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
}
