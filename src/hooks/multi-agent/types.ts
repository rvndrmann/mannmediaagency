
import { Attachment } from "@/types/message";
import { SupabaseClient } from "@supabase/supabase-js";

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  runId: string;
  groupId: string;
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: Record<string, any>;
  abortSignal?: AbortSignal;
  addMessage: (text: string, type: string, attachments?: Attachment[]) => void;
  toolAvailable: (toolName: string) => boolean;
}
