
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+91", country: "IN" },
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+81", country: "JP" },
  { code: "+86", country: "CN" },
];

interface PhoneInputProps {
  onSubmit: (phoneNumber: string) => void;
  isLoading: boolean;
}

const PhoneInput = ({ onSubmit, isLoading }: PhoneInputProps) => {
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    onSubmit(fullNumber);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={countryCode}
          onValueChange={setCountryCode}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Code" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.code} {country.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          placeholder="Phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="flex-1"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !phoneNumber}
      >
        {isLoading ? (
          <span className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {isLoading ? "Sending code..." : "Send verification code"}
      </Button>
    </form>
  );
};

export default PhoneInput;
