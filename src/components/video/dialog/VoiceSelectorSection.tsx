import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VoiceSelectorSectionProps {
  voice: string;
  onVoiceChange: (voice: string) => void;
}

export const VoiceSelectorSection = ({ voice, onVoiceChange }: VoiceSelectorSectionProps) => {
  const { data: voices, isLoading } = useQuery({
    queryKey: ["voices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("choose voice")
        .select("id, name");

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="voice" className="text-xl text-primary">
        Choose Voice
      </Label>
      <Select onValueChange={onVoiceChange} value={voice} disabled={isLoading}>
        <SelectTrigger id="voice">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {voices?.map((voiceOption) => (
            <SelectItem key={voiceOption.id} value={voiceOption.id.toString()}>
              {voiceOption.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};