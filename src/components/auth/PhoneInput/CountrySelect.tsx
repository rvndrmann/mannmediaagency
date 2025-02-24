
import React from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountryCode } from "@/utils/phoneValidation";

interface CountrySelectProps {
  selectedCountry: CountryCode;
  onSelect: (country: CountryCode) => void;
  countries: CountryCode[];
}

export const CountrySelect = ({ selectedCountry, onSelect, countries }: CountrySelectProps) => {
  const [open, setOpen] = React.useState(false);

  return (
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
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command className="bg-gray-800 rounded-md border border-gray-700">
          <CommandInput 
            placeholder="Search country..."
            className="bg-gray-800 text-white placeholder:text-gray-400 border-b border-gray-700"
          />
          <CommandEmpty className="text-gray-400 p-2">
            No country found.
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {countries.map((country) => (
              <CommandItem
                key={country.value}
                value={country.label}
                onSelect={() => {
                  onSelect(country);
                  setOpen(false);
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
  );
};
