
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OutputFormatSelectorProps {
  outputFormat: string;
  onOutputFormatChange: (value: string) => void;
}

export const OutputFormatSelector = ({
  outputFormat,
  onOutputFormatChange
}: OutputFormatSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-white">
        Output Format: <span className="text-purple-400">{outputFormat.toUpperCase()}</span>
      </Label>
      <Select value={outputFormat} onValueChange={onOutputFormatChange}>
        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
          <SelectValue placeholder="Select format" />
        </SelectTrigger>
        <SelectContent className="bg-[#1A1F2C] border-gray-700 text-white z-[100]">
          <SelectItem value="png" className="text-white hover:bg-gray-800 cursor-pointer">PNG</SelectItem>
          <SelectItem value="jpg" className="text-white hover:bg-gray-800 cursor-pointer">JPG</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
