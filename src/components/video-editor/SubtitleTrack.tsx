
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Edit2, Trash2 } from "lucide-react";

interface SubtitleTrackProps {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  onUpdate: (id: string, text: string, startTime: number, endTime: number) => void;
  onDelete: (id: string) => void;
}

export function SubtitleTrack({
  id,
  text,
  startTime,
  endTime,
  onUpdate,
  onDelete,
}: SubtitleTrackProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [editStartTime, setEditStartTime] = useState(startTime);
  const [editEndTime, setEditEndTime] = useState(endTime);

  const handleSave = () => {
    onUpdate(id, editText, editStartTime, editEndTime);
    setIsEditing(false);
  };

  return (
    <Card className="p-4">
      {isEditing ? (
        <div className="space-y-4">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Subtitle text"
          />
          <div className="flex gap-4">
            <Input
              type="number"
              value={editStartTime}
              onChange={(e) => setEditStartTime(Number(e.target.value))}
              placeholder="Start time (s)"
            />
            <Input
              type="number"
              value={editEndTime}
              onChange={(e) => setEditEndTime(Number(e.target.value))}
              placeholder="End time (s)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{text}</p>
            <p className="text-sm text-gray-500">
              {startTime}s - {endTime}s
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

