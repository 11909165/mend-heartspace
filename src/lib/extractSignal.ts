/**
 * Utility to extract emotional signals from any user content surface.
 * Calls the extract_signals edge function in the background.
 */
import { supabase } from "@/integrations/supabase/client";

export type SignalSourceType = "companion_chat" | "journal_entry" | "support_post";

interface ExtractSignalParams {
  userId: string;
  content: string;
  sourceType: SignalSourceType;
  sourceId: string;
  /** Only for companion_chat backward compat */
  messageId?: string;
}

/**
 * Fire-and-forget signal extraction. Errors are logged but never block UX.
 */
export async function extractSignal(params: ExtractSignalParams): Promise<void> {
  try {
    await supabase.functions.invoke("extract_signals", {
      body: {
        user_id: params.userId,
        content: params.content,
        source_type: params.sourceType,
        source_id: params.sourceId,
        message_id: params.messageId ?? null,
      },
    });
  } catch (err) {
    console.error(`Signal extraction failed (${params.sourceType}):`, err);
  }
}
