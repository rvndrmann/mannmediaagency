
import { toast } from "sonner";

export const useExploreActions = () => {
  const handleCopyPrompt = async (id: string, prompt: string, setCopiedPrompts: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompts(prev => ({ ...prev, [id]: true }));
      toast.success("Prompt copied to clipboard");
      setTimeout(() => {
        setCopiedPrompts(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  const handleCopyValue = async (id: string, value: number, field: string, setCopiedField: (value: string | null) => void) => {
    try {
      await navigator.clipboard.writeText(value.toString());
      setCopiedField(`${id}-${field}`);
      toast.success(`${field} value copied`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy value");
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  return {
    handleCopyPrompt,
    handleCopyValue,
    handleDownload
  };
};
