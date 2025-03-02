
import { Label } from "@/components/ui/label";

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  description?: string;
}

export const RangeSlider = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  description
}: RangeSliderProps) => {
  const displayValue = step < 1 ? value.toFixed(1) : value.toString();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-white flex justify-between">
        <span>{label}</span>
        <span className="text-purple-400 font-semibold">{displayValue}</span>
      </Label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/70 w-6 text-center">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
        <span className="text-xs text-white/70 w-6 text-center">{max}</span>
      </div>
      {description && <p className="text-xs text-white/60">{description}</p>}
    </div>
  );
};
