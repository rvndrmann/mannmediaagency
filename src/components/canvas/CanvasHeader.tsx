
import { useState } from "react";
import { CanvasProject } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import {
  Download,
  Save,
  MoreHorizontal,
  FileVideo,
  Share2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CanvasHeaderProps {
  project: CanvasProject;
}

export function CanvasHeader({
  project,
}: CanvasHeaderProps) {
  const [title, setTitle] = useState(project.title);
  const navigate = useNavigate();

  const handleTitleChange = (e: React.FocusEvent<HTMLInputElement>) => {
    // Here you would implement logic to update the project title in the database
    toast.success("Project title updated");
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  const handleShare = () => {
    toast.info("Share functionality coming soon");
  };

  const handleSave = () => {
    toast.success("Project saved");
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="h-14 border-b flex items-center justify-between px-4 bg-background">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mr-2"
        >
          Back
        </Button>
        
        <div className="flex items-center">
          <FileVideo className="h-5 w-5 mr-2 text-primary" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleChange}
            className="bg-transparent border-none focus:outline-none focus:ring-0 text-lg font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport}>
              Export as MP4
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}>
              Export as GIF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}>
              Export Script
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
