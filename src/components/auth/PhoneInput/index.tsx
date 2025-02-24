
import { useState, useEffect } from "react";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "./CountrySelect";
import { countryCodes, validatePhoneNumber, formatPhoneNumber } from "@/utils/phoneValidation";
import type { CountryCode } from "@/utils/phoneValidation";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onValidityChange?: (isValid: boolean) => void;
}

export const PhoneInput = ({ value, onChange, error, onValidityChange }: PhoneInputProps) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(countryCodes[0]);
  const [localNumber, setLocalNumber] = useState("");
  const [localError, setLocalError] = useState("");
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    if (value) {
      const match = value.match(/^\+(\d+)/);
      if (match) {
        const countryCode = match[1];
        const country = countryCodes.find(c => value.startsWith(`+${c.value}`));
        if (country) {
          setSelectedCountry(country);
        }
      }
      const numberPart = value.replace(/^\+\d+/, '');
      setLocalNumber(numberPart);
    }
  }, [value]);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    const formattedNumber = formatPhoneNumber(country.value, localNumber);
    onChange(formattedNumber);
    
    const validationError = validatePhoneNumber(localNumber, country, isTouched);
    setLocalError(validationError);
    onValidityChange?.(!validationError && localNumber.length >= country.minLength);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^0-9]/g, '');
    setLocalNumber(newNumber);
    
    const formattedNumber = formatPhoneNumber(selectedCountry.value, newNumber);
    onChange(formattedNumber);
    
    const validationError = validatePhoneNumber(newNumber, selectedCountry, isTouched);
    setLocalError(validationError);
    onValidityChange?.(!validationError && newNumber.length >= selectedCountry.minLength);
  };

  const handleBlur = () => {
    setIsTouched(true);
    const validationError = validatePhoneNumber(localNumber, selectedCountry, true);
    setLocalError(validationError);
    onValidityChange?.(!validationError && localNumber.length >= selectedCountry.minLength);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone" className="text-white">Phone Number</Label>
      <div className="flex gap-2">
        <CountrySelect
          selectedCountry={selectedCountry}
          onSelect={handleCountrySelect}
          countries={countryCodes}
        />
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={selectedCountry.maxLength}
          placeholder={`${selectedCountry.minLength} digits required`}
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          className={cn(
            "flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400",
            (isTouched && (localError || error)) && "border-red-500"
          )}
        />
      </div>
      {isTouched && (error || localError) && (
        <p className="text-sm text-red-500">{error || localError}</p>
      )}
      <p className="text-sm text-gray-400">
        Format: +{selectedCountry.value} followed by {selectedCountry.minLength} digits
      </p>
    </div>
  );
};
