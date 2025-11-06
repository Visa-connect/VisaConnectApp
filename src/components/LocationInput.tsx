import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LocationInputProps,
  LocationData,
  NominatimSearchResult,
  NominatimReverseResult,
} from '../types/location';
import { MapPinIcon } from '@heroicons/react/24/outline';

// Nominatim API base URL
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter location',
  allowCurrentLocation = true,
  showMap = false,
  required = false,
  disabled = false,
  className = '',
  label,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string>('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Format display name for search results
  const formatSearchDisplayName = useCallback(
    (result: NominatimSearchResult): string => {
      const address = result.address;
      const type = result.type;

      // For cities/towns, use city, state format
      if (type === 'city' || type === 'town' || type === 'village') {
        if (address) {
          const city = address.city || address.town || address.village;
          const state = address.state;
          if (city && state) {
            return `${city}, ${state}`;
          }
        }
      }

      // For addresses, use city, state format
      if (type === 'house' || type === 'building' || type === 'street') {
        if (address) {
          const city =
            address.city || address.town || address.village || address.suburb;
          const state = address.state;
          if (city && state) {
            return `${city}, ${state}`;
          }
        }
      }

      // For all other types (places, attractions, etc.), use place name + city, state format
      const placeName = result.display_name.split(',')[0].trim();

      // Try to get city and state from address object
      if (address) {
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.suburb ||
          address.county;
        const state = address.state;
        if (city && state) {
          // Avoid duplication: if placeName is the same as city, just use city, state
          if (placeName.toLowerCase() === city.toLowerCase()) {
            return `${city}, ${state}`;
          }
          // Otherwise, use place name + city, state (e.g., "Central Park, New York, NY")
          return `${placeName}, ${city}, ${state}`;
        }
      }

      // Fallback: try to extract city, state from display_name for places
      const parts = result.display_name.split(',');

      if (parts.length >= 3) {
        const state = parts[parts.length - 2].trim(); // Second to last part is usually state
        const city = parts[parts.length - 3].trim(); // Third to last part is usually city
        if (city && state && state.length <= 3) {
          // State abbreviations are usually 2-3 chars
          // Avoid duplication: if placeName is the same as city, just use city, state
          if (placeName.toLowerCase() === city.toLowerCase()) {
            return `${city}, ${state}`;
          }
          return `${placeName}, ${city}, ${state}`;
        }
      }

      // Additional fallback: try to extract city, state from display_name for any result
      if (parts.length >= 2) {
        const state = parts[parts.length - 2].trim(); // Second to last part is usually state
        if (placeName && state && state.length <= 3) {
          // State abbreviations are usually 2-3 chars
          return `${placeName}, ${state}`;
        }
      }

      // Final comprehensive fallback: look for any state-like pattern
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        // Check if this part looks like a state (2-3 chars, all caps or title case)
        if (
          part.length >= 2 &&
          part.length <= 3 &&
          (part === part.toUpperCase() ||
            part === part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        ) {
          const city = parts[i - 1]?.trim();
          if (city) {
            // Avoid duplication: if placeName is the same as city, just use city, state
            if (placeName.toLowerCase() === city.toLowerCase()) {
              return `${city}, ${part}`;
            }
            return `${placeName}, ${city}, ${part}`;
          }
        }
      }

      // Final fallback: return the first part of display_name
      return placeName;
    },
    []
  );

  // Format display name for reverse geocoding results
  const formatReverseDisplayName = useCallback(
    (result: NominatimReverseResult): string => {
      const address = result.address;

      // Try to use city, state format
      if (address) {
        const city =
          address.city || address.town || address.village || address.suburb;
        const state = address.state;
        if (city && state) {
          return `${city}, ${state}`;
        }
      }

      // Fallback: try to extract city, state from display_name
      const parts = result.display_name.split(',');
      if (parts.length >= 2) {
        const city = parts[0].trim();
        const state = parts[parts.length - 2].trim(); // Second to last part is usually state
        if (city && state && state.length <= 3) {
          // State abbreviations are usually 2-3 chars
          return `${city}, ${state}`;
        }
      }

      // Final fallback: return the first part of display_name
      return result.display_name.split(',')[0].trim();
    },
    []
  );

  // Deduplicate search results by consolidating entries with same name/city/state
  const deduplicateResults = useCallback(
    (results: NominatimSearchResult[]): NominatimSearchResult[] => {
      const seen = new Map<string, NominatimSearchResult>();

      results.forEach((result) => {
        const formattedName = formatSearchDisplayName(result);
        const key = formattedName.toLowerCase().trim();

        if (seen.has(key)) {
          // If we already have this location, combine the types
          const existing = seen.get(key)!;
          const existingTypes = existing.type ? [existing.type] : [];
          const newTypes = result.type ? [result.type] : [];
          const combinedTypes = Array.from(
            new Set([...existingTypes, ...newTypes])
          );

          // Create a new result with combined type information
          const combinedResult: NominatimSearchResult = {
            ...existing,
            type: combinedTypes.join(', '), // Combine types with comma
            // Keep the result with higher importance score if available
            importance: Math.max(
              existing.importance || 0,
              result.importance || 0
            ),
          };

          seen.set(key, combinedResult);
        } else {
          seen.set(key, result);
        }
      });

      return Array.from(seen.values());
    },
    [formatSearchDisplayName]
  );

  // Search locations using Nominatim
  const searchLocations = useCallback(
    async (query: string): Promise<NominatimSearchResult[]> => {
      if (query.length < 3) return [];

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

        const results: NominatimSearchResult[] = await response.json();
        return results.filter((result) => {
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
      } catch (error) {
        console.error('Error searching locations:', error);
        return [];
      }
    },
    []
  );

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(
    async (
      lat: number,
      lng: number
    ): Promise<NominatimReverseResult | null> => {
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

        const response = await fetch(
          `${NOMINATIM_BASE_URL}/reverse?${params}`,
          {
            headers: {
              'User-Agent': 'VisaConnect/1.0 (support@visaconnect.app)',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Reverse geocoding request failed');
        }

        const result: NominatimReverseResult = await response.json();

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
        return null;
      }
    },
    []
  );

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setError(''); // Clear any existing errors

      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (newValue.length >= 3) {
        setIsLoading(true);

        // Set new timer for debounced search
        const timer = setTimeout(async () => {
          try {
            const results = await searchLocations(newValue);
            const deduplicatedResults = deduplicateResults(results);
            setSuggestions(deduplicatedResults);
            setShowSuggestions(true);
          } catch (error) {
            console.error('Search error:', error);
            setSuggestions([]);
            setShowSuggestions(false);
            setError('Unable to search for locations. Please try again.');
          } finally {
            setIsLoading(false);
          }
        }, 300); // 300ms debounce

        setDebounceTimer(timer);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
      }
    },
    [searchLocations, deduplicateResults, debounceTimer]
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: NominatimSearchResult) => {
      const formattedName = formatSearchDisplayName(suggestion);

      const locationData: LocationData = {
        address: formattedName,
        coordinates: {
          lat: parseFloat(suggestion.lat),
          lng: parseFloat(suggestion.lon),
        },
        placeId: suggestion.place_id.toString(),
      };

      // Extract address components
      if (suggestion.address) {
        const addr = suggestion.address;
        locationData.city =
          addr.city || addr.town || addr.village || addr.suburb;
        locationData.state = addr.state || addr.county;
        locationData.country = addr.country;
        locationData.postalCode = addr.postcode;
      }

      setInputValue(formattedName);
      onChange(locationData);
      setShowSuggestions(false);
    },
    [onChange, formatSearchDisplayName]
  );

  // Get current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setError(''); // Clear any existing errors
    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const result = await reverseGeocode(latitude, longitude);

          if (result) {
            const formattedName = formatReverseDisplayName(result);

            const locationData: LocationData = {
              address: formattedName,
              coordinates: {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
              },
              placeId: result.place_id.toString(),
            };

            // Extract address components
            if (result.address) {
              const addr = result.address;
              locationData.city =
                addr.city || addr.town || addr.village || addr.suburb;
              locationData.state = addr.state || addr.county;
              locationData.country = addr.country;
              locationData.postalCode = addr.postcode;
            }

            setInputValue(formattedName);
            onChange(locationData);
          } else {
            // Fallback: just use coordinates
            const locationData: LocationData = {
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              coordinates: { lat: latitude, lng: longitude },
            };
            setInputValue(locationData.address);
            onChange(locationData);
          }
        } catch (error) {
          console.error('Error getting address for current location:', error);
          setError('Unable to get address for current location.');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        console.error('Error getting location:', error);
        setError('Unable to get your current location. Please enter manually.');
      }
    );
  }, [reverseGeocode, onChange, formatReverseDisplayName]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPinIcon className="h-5 w-5 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          // TODO: Refactor to use consistent app styling pattern or reusable Input component
          // Current styling doesn't match app standards (rounded-xl, focus:ring-sky-300, etc.)
          // This requires updating ALL inputs across the app - handle in separate branch
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}

          {allowCurrentLocation && (
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={disabled || isGettingLocation}
              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Use current location"
            >
              {isGettingLocation ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <MapPinIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="text-sm text-gray-900">
                {formatSearchDisplayName(suggestion)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationInput;
