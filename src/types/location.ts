// Location-related type definitions

export interface LocationData {
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  placeId?: string;
}

export interface LocationInputProps {
  value: string;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  allowCurrentLocation?: boolean;
  showMap?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
}

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
