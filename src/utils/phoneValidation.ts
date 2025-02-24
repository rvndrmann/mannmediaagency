
export interface CountryCode {
  value: string;
  label: string;
  flag: string;
  minLength: number;
  maxLength: number;
}

export const countryCodes: CountryCode[] = [
  { value: "91", label: "India", flag: "🇮🇳", minLength: 10, maxLength: 10 },
  { value: "1", label: "United States", flag: "🇺🇸", minLength: 10, maxLength: 10 },
  { value: "44", label: "United Kingdom", flag: "🇬🇧", minLength: 10, maxLength: 10 },
  { value: "61", label: "Australia", flag: "🇦🇺", minLength: 9, maxLength: 9 },
  { value: "86", label: "China", flag: "🇨🇳", minLength: 11, maxLength: 11 },
  { value: "81", label: "Japan", flag: "🇯🇵", minLength: 10, maxLength: 10 },
  { value: "82", label: "South Korea", flag: "🇰🇷", minLength: 9, maxLength: 10 },
  { value: "65", label: "Singapore", flag: "🇸🇬", minLength: 8, maxLength: 8 }
];

export const validatePhoneNumber = (number: string, country: CountryCode, isTouched: boolean): string => {
  if (!isTouched) return ""; // Don't show errors until the input is touched
  
  const cleanNumber = number.replace(/[^\d]/g, '');
  
  // Only validate if the user has entered something or if they've finished typing
  if (cleanNumber.length > 0 && cleanNumber.length < country.minLength) {
    return `Enter at least ${country.minLength} digits`;
  }
  
  if (cleanNumber.length > country.maxLength) {
    return `Number cannot exceed ${country.maxLength} digits`;
  }
  
  return "";
};

export const formatPhoneNumber = (countryCode: string, number: string): string => {
  const cleanNumber = number.replace(/[^\d]/g, '');
  return `+${countryCode}${cleanNumber}`;
};
