
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Common country codes with flags
const countries = [
  { value: "91", label: "India", flag: "🇮🇳" },
  { value: "1", label: "United States", flag: "🇺🇸" },
  { value: "44", label: "United Kingdom", flag: "🇬🇧" },
  { value: "61", label: "Australia", flag: "🇦🇺" },
  { value: "86", label: "China", flag: "🇨🇳" },
  { value: "81", label: "Japan", flag: "🇯🇵" },
  { value: "82", label: "South Korea", flag: "🇰🇷" },
  { value: "65", label: "Singapore", flag: "🇸🇬" },
  { value: "971", label: "UAE", flag: "🇦🇪" },
  { value: "966", label: "Saudi Arabia", flag: "🇸🇦" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const PhoneInput = ({ value, onChange, error }: PhoneInputProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [localNumber, setLocalNumber] = useState("");

  // Sync local number and country code from parent value
  useEffect(() => {
    if (value) {
      // Extract country code and find matching country
      const match = value.match(/^\+(\d+)/);
      if (match) {
        const countryCode = match[1];
        const country = countries.find(c => value.startsWith(`+${c.value}`));
        if (country) {
          setSelectedCountry(country);
        }
      }
      
      // Extract local number part
      const numberPart = value.replace(/^\+\d+/, '');
      setLocalNumber(numberPart);
    }
  }, [value]);

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    // Combine the new country code with existing local number
    const cleanNumber = localNumber.replace(/[^\d]/g, '');
    onChange(`+${country.value}${cleanNumber}`);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^0-9]/g, ''); // Only allow digits
    setLocalNumber(newNumber);
    onChange(`+${selectedCountry.value}${newNumber}`);
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
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {countries.map((country) => (
                  <CommandItem
                    key={country.value}
                    value={country.value}
                    onSelect={() => {
                      handleCountrySelect(country);
                      // Small delay before closing to ensure touch events register
                      setTimeout(() => setOpen(false), 100);
                    }}
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
          maxLength={15}
          enterKeyHint="done"
          autoComplete="tel-national"
          placeholder="Enter your phone number"
          value={localNumber}
          onChange={handleNumberChange}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 text-lg"
          aria-label="Phone number"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};
