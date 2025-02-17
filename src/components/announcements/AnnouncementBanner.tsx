
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { X } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "error";
  active: boolean;
}

export const AnnouncementBanner = () => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .gte("end_date", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
  });

  const activeAnnouncements = announcements?.filter(
    (announcement) => !dismissedIds.includes(announcement.id)
  );

  if (!activeAnnouncements?.length) return null;

  const getIcon = (type: Announcement["type"]) => {
    switch (type) {
      case "info":
        return <Info className="h-5 w-5" />;
      case "warning":
        return <AlertCircle className="h-5 w-5" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5" />;
      case "error":
        return <XCircle className="h-5 w-5" />;
    }
  };

  const getBgColor = (type: Announcement["type"]) => {
    switch (type) {
      case "info":
        return "bg-blue-600";
      case "warning":
        return "bg-yellow-600";
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  return (
    <div className="space-y-2">
      {activeAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`${getBgColor(
            announcement.type
          )} text-white py-3 px-4 relative`}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            {getIcon(announcement.type)}
            <div className="flex-1">
              <p className="font-medium">{announcement.title}</p>
              <p className="text-sm text-white/90">{announcement.content}</p>
            </div>
            <button
              onClick={() => handleDismiss(announcement.id)}
              className="text-white/80 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
