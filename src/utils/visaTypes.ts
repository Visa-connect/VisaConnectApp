export const visaTypes = [
  { value: '', label: 'Select visa type' },
  { value: 'h2b', label: 'H2B' },
  { value: 'j1', label: 'J1' },
  { value: 'h1b', label: 'H1B' },
  { value: 'f1', label: 'F1' },
  { value: 'o1', label: 'O1' },
  { value: 'not a current visa holder', label: 'Not a current visa holder' },
];

export const startDateOptions = [
  { value: '', label: 'Select availability' },
  { value: 'immediately', label: 'Immediately - right now' },
  { value: 'soon', label: 'Soon - within 2 weeks' },
  { value: 'later', label: 'Later - longer than a month' },
];

/**
 * Helper function to determine visa type selection
 * Checks if user's visa type exists in predefined options
 * Returns the visa type if it matches, or 'other' if it's custom
 */
export const getUserVisaType = (userVisaType?: string): string => {
  if (!userVisaType) return '';
  const predefinedTypes = visaTypes.map((type) => type.value);
  return predefinedTypes.includes(userVisaType) ? userVisaType : 'other';
};
