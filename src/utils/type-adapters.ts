
import { AgentIconType } from "@/types/message";

/**
 * Type adapter to convert AgentIconType from our client definition
 * to the more restrictive database enum type
 */
export const adaptAgentIconToDBType = (icon: AgentIconType): string => {
  // Default to 'Bot' if the icon is not in the accepted list
  const acceptedIcons = [
    "Bot", "PenLine", "Image", "Wrench", "Code", 
    "FileText", "Zap", "Brain", "Lightbulb", "Music"
  ];
  
  if (acceptedIcons.includes(icon)) {
    return icon;
  }
  
  // Map other icons to the closest match
  const iconMapping: Record<string, string> = {
    "Video": "Image",
    "Globe": "Bot",
    "ShoppingBag": "Bot"
  };
  
  return iconMapping[icon] || "Bot";
};

/**
 * Adapter for component Message[] to component-specific message types
 */
export const adaptMessagesToComponentFormat = <T>(
  messages: any[],
  transformer?: (msg: any) => T
): T[] => {
  if (!messages) return [] as T[];
  
  if (transformer) {
    return messages.map(msg => transformer(msg));
  }
  
  // Default simple transformation
  return messages as T[];
};

/**
 * Convert a string to a valid database icon type
 */
export const toValidIconType = (iconString: string): "Bot" | "PenLine" | "Image" | "Wrench" | "Code" | "FileText" | "Zap" | "Brain" | "Lightbulb" | "Music" => {
  const validIcons = ["Bot", "PenLine", "Image", "Wrench", "Code", "FileText", "Zap", "Brain", "Lightbulb", "Music"];
  
  return validIcons.includes(iconString) 
    ? iconString as "Bot" | "PenLine" | "Image" | "Wrench" | "Code" | "FileText" | "Zap" | "Brain" | "Lightbulb" | "Music"
    : "Bot";
};
