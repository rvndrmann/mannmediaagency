
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Define countries directly in the component to ensure data is always available
const countries = [
  { value: "91", label: "India", flag: "🇮🇳", minLength: 10, maxLength: 10 },
  { value: "1", label: "United States", flag: "🇺🇸", minLength: 10, maxLength: 10 },
  { value: "44", label: "United Kingdom", flag: "🇬🇧", minLength: 10, maxLength: 10 },
  { value: "61", label: "Australia", flag: "🇦🇺", minLength: 9, maxLength: 9 },
  { value: "86", label: "China", flag: "🇨🇳", minLength: 11, maxLength: 11 },
  { value: "81", label: "Japan", flag: "🇯🇵", minLength: 10, maxLength: 10 },
  { value: "82", label: "South Korea", flag: "🇰🇷", minLength: 9, maxLength: 10 },
  { value: "65", label: "Singapore", flag: "🇸🇬", minLength: 8, maxLength: 8 },
  { value: "971", label: "UAE", flag: "🇦🇪", minLength: 9, maxLength: 9 },
  { value: "966", label: "Saudi Arabia", flag: "🇸🇦", minLength: 9, maxLength: 9 },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onValidityChange?: (isValid: boolean) => void;
}

export const PhoneInput = ({ value, onChange, error, onValidityChange }: PhoneInputProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [localNumber, setLocalNumber] = useState("");
  const [localError, setLocalError] = useState("");

  // Validate phone number based on country rules
  const validatePhoneNumber = (number: string, country: typeof countries[0]) => {
    if (!number) return "Phone number is required";
    if (number.length < country.minLength) {
      return `Phone number must be at least ${country.minLength} digits for ${country.label}`;
    }
    if (number.length > country.maxLength) {
      return `Phone number cannot exceed ${country.maxLength} digits for ${country.label}`;
    }
    return "";
  };

  // Sync local number and country code from parent value
  useEffect(() => {
    if (value) {
      const match = value.match(/^\+(\d+)/);
      if (match) {
        const countryCode = match[1];
        const country = countries.find(c => {
          // Find the longest matching country code prefix
          return value.startsWith(`+${c.value}`);
        });
        if (country) {
          setSelectedCountry(country);
        }
      }
      
      // Extract local number part
      const numberPart = value.replace(/^\+\d+/, '');
      setLocalNumber(numberPart);
      
      // Validate the complete number
      const validationError = validatePhoneNumber(numberPart, selectedCountry);
      setLocalError(validationError);
      onValidityChange?.(!validationError);
    }
  }, [value, onValidityChange]);

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    const cleanNumber = localNumber.replace(/[^\d]/g, '');
    const formattedNumber = `+${country.value}${cleanNumber}`;
    onChange(formattedNumber);
    
    // Revalidate with new country rules
    const validationError = validatePhoneNumber(cleanNumber, country);
    setLocalError(validationError);
    onValidityChange?.(!validationError);
    setOpen(false);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^0-9]/g, ''); // Only allow digits
    setLocalNumber(newNumber);
    const formattedNumber = `+${selectedCountry.value}${newNumber}`;
    onChange(formattedNumber);
    
    // Validate the new number
    const validationError = validatePhoneNumber(newNumber, selectedCountry);
    setLocalError(validationError);
    onValidityChange?.(!validationError);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone" className="text-white">Phone Number</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[120px] justify-between bg-white/10 border-white/20 text-white hover:bg-white/20"
              aria-label="Select country code"
            >
              {selectedCountry.flag} +{selectedCountry.value}
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[200px] p-0 z-[100]"
            sideOffset={8}
            align="start"
          >
            <Command className="bg-gray-800 rounded-md border border-gray-700">
              <CommandInput 
                className="bg-gray-800 text-white placeholder:text-gray-400 border-b border-gray-700" 
                placeholder="Search country..." 
              />
              <CommandEmpty className="text-gray-400 p-2">No country found.</CommandEmpty>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country.value}
                    value={country.label}
                    onSelect={() => handleCountrySelect(country)}
                    className="text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountry.value === country.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {country.flag} {country.label} (+{country.value})
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={selectedCountry.maxLength}
          enterKeyHint="done"
          autoComplete="tel-national"
          placeholder={`${selectedCountry.minLength} digits required`}
          value={localNumber}
          onChange={handleNumberChange}
          className={cn(
            "flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 text-lg",
            localError && "border-red-500"
          )}
          aria-label="Phone number"
          aria-invalid={!!localError}
        />
      </div>
      {(error || localError) && (
        <p className="text-sm text-red-500 mt-1">{error || localError}</p>
      )}
      <p className="text-sm text-gray-400 mt-1">
        Format: +{selectedCountry.value} followed by {selectedCountry.minLength} digits
      </p>
    </div>
  );
};
