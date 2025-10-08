/**
 * Phone Input Component with Country Code Selector
 * Supports international phone numbers with validation
 */

import React, { useState } from 'react';

// Country codes with dial codes (matching backend)
export const COUNTRY_CODES = {
  US: { code: '+1', name: 'United States', flag: '🇺🇸' },
  GB: { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  CA: { code: '+1', name: 'Canada', flag: '🇨🇦' },
  IN: { code: '+91', name: 'India', flag: '🇮🇳' },
  MX: { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  BR: { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  DE: { code: '+49', name: 'Germany', flag: '🇩🇪' },
  FR: { code: '+33', name: 'France', flag: '🇫🇷' },
  IT: { code: '+39', name: 'Italy', flag: '🇮🇹' },
  ES: { code: '+34', name: 'Spain', flag: '🇪🇸' },
  AU: { code: '+61', name: 'Australia', flag: '🇦🇺' },
  JP: { code: '+81', name: 'Japan', flag: '🇯🇵' },
  CN: { code: '+86', name: 'China', flag: '🇨🇳' },
  KR: { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  NG: { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  ZA: { code: '+27', name: 'South Africa', flag: '🇿🇦' },
} as const;

export type CountryCode = keyof typeof COUNTRY_CODES;

interface PhoneInputProps {
  value: string;
  onChange: (phone: string, countryCode: CountryCode) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  placeholder = 'Enter phone number',
  disabled = false,
  required = false,
  className = '',
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Format phone number as user types
  const formatPhoneNumber = (input: string, country: CountryCode): string => {
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');

    // Apply US/Canada formatting: (XXX) XXX-XXXX
    if (country === 'US' || country === 'CA') {
      if (digitsOnly.length <= 3) {
        return digitsOnly;
      } else if (digitsOnly.length <= 6) {
        return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
      } else {
        return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
          3,
          6
        )}-${digitsOnly.slice(6, 10)}`;
      }
    }

    // Default: just return digits with spaces every 3 digits
    return digitsOnly.replace(/(\d{3})(?=\d)/g, '$1 ');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input, selectedCountry);
    onChange(formatted, selectedCountry);
  };

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchTerm('');
    // Reformat existing number with new country
    if (value) {
      const formatted = formatPhoneNumber(value, country);
      onChange(formatted, country);
    }
  };

  // Filter countries based on search
  const filteredCountries = Object.entries(COUNTRY_CODES).filter(
    ([code, info]) =>
      info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      info.code.includes(searchTerm) ||
      code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        {/* Country Code Selector */}
        <div className="relative w-32">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed bg-white flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>{COUNTRY_CODES[selectedCountry].flag}</span>
              <span className="text-sm font-medium">
                {COUNTRY_CODES[selectedCountry].code}
              </span>
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-80 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Country List */}
              <div className="overflow-y-auto max-h-60">
                {filteredCountries.map(([code, info]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleCountrySelect(code as CountryCode)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
                  >
                    <span className="text-lg">{info.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {info.name}
                      </div>
                      <div className="text-xs text-gray-500">{info.code}</div>
                    </div>
                    {selectedCountry === code && (
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="flex-1">
          <input
            type="tel"
            value={value}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Helper Text */}
      <p className="mt-1 text-xs text-gray-500">
        {COUNTRY_CODES[selectedCountry].name} phone number
      </p>
    </div>
  );
};

export default PhoneInput;
