import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LocationInputProps,
  LocationData,
  NominatimSearchResult,
  NominatimReverseResult,
} from '../types/location';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

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
          extratags: '1',
          namedetails: '1',
        });

        const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
          headers: {
            'User-Agent': 'VisaConnect/1.0', // Required by Nominatim
          },
        });

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const results: NominatimSearchResult[] = await response.json();
        return results.filter((result) => result.display_name);
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
          extratags: '1',
          namedetails: '1',
        });

        const response = await fetch(
          `${NOMINATIM_BASE_URL}/reverse?${params}`,
          {
            headers: {
              'User-Agent': 'VisaConnect/1.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Reverse geocoding request failed');
        }

        const result: NominatimReverseResult = await response.json();
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
            setSuggestions(results);
            setShowSuggestions(true);
          } catch (error) {
            console.error('Search error:', error);
            setSuggestions([]);
            setShowSuggestions(false);
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
    [searchLocations, debounceTimer]
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: NominatimSearchResult) => {
      const locationData: LocationData = {
        address: suggestion.display_name,
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

      setInputValue(locationData.address);
      onChange(locationData);
      setShowSuggestions(false);
    },
    [onChange]
  );

  // Get current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const result = await reverseGeocode(latitude, longitude);

          if (result) {
            const locationData: LocationData = {
              address: result.display_name,
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

            setInputValue(locationData.address);
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
          alert('Unable to get address for current location.');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        console.error('Error getting location:', error);
        alert('Unable to get your current location. Please enter manually.');
      }
    );
  }, [reverseGeocode, onChange]);

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
                {suggestion.display_name}
              </div>
              {suggestion.type && (
                <div className="text-xs text-gray-500 mt-1 capitalize">
                  {suggestion.type.replace(/_/g, ' ')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationInput;
