
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { MetadataDisplay as MetadataDisplayType } from "./types";

interface MetadataFieldProps extends MetadataDisplayType {}

const MetadataField = ({ label, value, isMultiline }: MetadataFieldProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-purple-400">{label}</label>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-white/70" />
            )}
          </Button>
        )}
      </div>
      <div className="flex-1 text-white/90 bg-[#333333] p-2 rounded">
        {isMultiline ? (
          <div className="whitespace-pre-wrap">{value}</div>
        ) : (
          <div className="line-clamp-1">{value}</div>
        )}
      </div>
    </div>
  );
};

interface MetadataDisplayProps {
  fields: MetadataDisplayType[];
}

export const MetadataDisplay = ({ fields }: MetadataDisplayProps) => {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-semibold text-white/90">Generated Metadata</h3>
      <div className="space-y-4 bg-[#222222] p-4 rounded-lg">
        {fields.map((field) => (
          <MetadataField
            key={field.label}
            label={field.label}
            value={field.value}
            isMultiline={field.isMultiline}
          />
        ))}
      </div>
    </div>
  );
};
