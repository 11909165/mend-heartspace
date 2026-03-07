type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mend_chat`;

export interface StreamChatResult {
  communicationBucket: string | null;
  formulationStyle: string | null;
  questionType: string | null;
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  companionMode,
  userState,
  memoryMoment,
  lastFormulationStyle,
  lastQuestionType,
}: {
  messages: Message[];
  onDelta: (deltaText: string) => void;
  onDone: (result: StreamChatResult) => void;
  onError?: (error: string) => void;
  companionMode?: string;
  userState?: any;
  memoryMoment?: string;
  lastFormulationStyle?: string | null;
  lastQuestionType?: string | null;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages,
      companion_mode: companionMode,
      user_state: userState,
      memory_moment: memoryMoment,
      last_formulation_style: lastFormulationStyle,
      last_question_type: lastQuestionType,
    }),
  });

  // Read bucket header before consuming body
  const communicationBucket = resp.headers.get("X-Communication-Bucket");
  const formulationStyle = resp.headers.get("X-Formulation-Style");
  const questionType = resp.headers.get("X-Question-Type");

  // Handle error responses
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "Connection failed" }));
    onError?.(errorData.error || "Something went wrong");
    onDone({ communicationBucket, formulationStyle, questionType });
    return;
  }

  if (!resp.body) {
    onError?.("Failed to start stream");
    onDone({ communicationBucket, formulationStyle, questionType });
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        /* ignore partial leftovers */
      }
    }
  }

  onDone({ communicationBucket, formulationStyle, questionType });
}
