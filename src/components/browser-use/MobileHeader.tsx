
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface MobileHeaderProps {
  title: string;
  creditsRemaining?: number;
  className?: string;
}

export function MobileHeader({ title, creditsRemaining, className }: MobileHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center gap-4 bg-gray-900 p-4 border-b border-gray-800 sticky top-0 z-10 ${className || ""}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/")}
        className="text-gray-400 hover:text-white md:hidden"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <Bot className="h-6 w-6 text-primary hidden md:block" />
      <h1 className="text-xl font-bold text-white flex-1">
        {title}
      </h1>
      {creditsRemaining !== undefined && (
        <Badge variant="outline" className="ml-2">
          Credits: {creditsRemaining}
        </Badge>
      )}
    </div>
  );
}
