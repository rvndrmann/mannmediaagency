
import { useState } from "react";
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

  // Remove the plus sign and country code from the input value to get just the number
  const numberPart = value.replace(/^\+\d+/, '');

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    // Combine the new country code with existing number
    onChange(`+${country.value}${numberPart}`);
    setOpen(false);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow the input to show what user types
    const newNumber = e.target.value;
    // But only pass cleaned number to parent
    const cleanNumber = newNumber.replace(/[^\d]/g, '');
    onChange(`+${selectedCountry.value}${cleanNumber}`);
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
            >
              {selectedCountry.flag} +{selectedCountry.value}
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-gray-800 border border-gray-700 z-50">
            <Command className="bg-gray-800">
              <CommandInput 
                className="bg-gray-800 text-white placeholder:text-gray-400" 
                placeholder="Search country..." 
              />
              <CommandEmpty className="text-gray-400 p-2">No country found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {countries.map((country) => (
                  <CommandItem
                    key={country.value}
                    value={country.label}
                    onSelect={() => handleCountrySelect(country)}
                    className="text-white hover:bg-gray-700"
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
          enterKeyHint="done"
          autoComplete="tel"
          placeholder="Enter your phone number"
          value={numberPart}
          onChange={handleNumberChange}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 text-lg"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};
