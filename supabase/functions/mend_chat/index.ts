import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Communication-Bucket",
};

/* ── Bucket definitions per mode ── */
const MODE_BUCKETS: Record<string, string[]> = {
  "Reflect with me": ["Emotional Processing", "Pattern Reflection", "Seeking Perspective"],
  "Sit with me": ["Venting", "Reassurance", "Emotional Processing"],
  "Challenge me gently": ["Seeking Perspective", "Pattern Reflection", "Decision Making"],
  "Help me decide": ["Decision Making", "Practical Action", "Seeking Perspective"],
  "Just listen": ["Venting", "Reassurance"],
};

const CRISIS_KEYWORDS = [
  "kill myself",
  "suicide",
  "end it all",
  "want to die",
  "self harm",
  "self-harm",
  "hurt myself",
  "not worth living",
  "better off dead",
  "helpline",
  "hotline",
  "emergency number",
];

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

function classifyBucket(userText: string, mode: string): string {
  if (detectCrisis(userText)) return "Crisis";

  const lower = userText.toLowerCase();
  const allowed = MODE_BUCKETS[mode] || MODE_BUCKETS["Reflect with me"];

  const signals: Record<string, number> = {};
  for (const b of allowed) signals[b] = 0;

  if (allowed.includes("Venting")) {
    if (/i (just )?need to (let|get) (this|it) out|vent|scream|ugh|frustrated|angry|furious|sick of/i.test(lower))
      signals["Venting"] += 3;
    if (/can't take|had enough|exhausted|done with/i.test(lower)) signals["Venting"] += 2;
  }
  if (allowed.includes("Reassurance")) {
    if (/am i (wrong|okay|normal|overreacting)|is (this|it) (okay|normal)|tell me|reassure|worried/i.test(lower))
      signals["Reassurance"] += 3;
    if (/scared|afraid|anxious|nervous/i.test(lower)) signals["Reassurance"] += 2;
  }
  if (allowed.includes("Emotional Processing")) {
    if (/feel(ing)?|emotion|sad|grief|loss|miss|heart|heavy|numb|confused about (my|how i) feel/i.test(lower))
      signals["Emotional Processing"] += 3;
    if (/overwhelm|cry|tears|hurt/i.test(lower)) signals["Emotional Processing"] += 2;
  }
  if (allowed.includes("Pattern Reflection")) {
    if (/always|again|keep doing|pattern|cycle|repeat|every time|same thing/i.test(lower))
      signals["Pattern Reflection"] += 3;
    if (/notice|realize|wonder why i/i.test(lower)) signals["Pattern Reflection"] += 2;
  }
  if (allowed.includes("Seeking Perspective")) {
    if (/perspective|different way|another angle|think about this|make sense|understand/i.test(lower))
      signals["Seeking Perspective"] += 3;
    if (/what do you think|how (should|would|do)/i.test(lower)) signals["Seeking Perspective"] += 2;
  }
  if (allowed.includes("Decision Making")) {
    if (/decide|decision|choose|option|should i|torn between|dilemma/i.test(lower)) signals["Decision Making"] += 3;
    if (/pros and cons|trade.?off|either.*or/i.test(lower)) signals["Decision Making"] += 2;
  }
  if (allowed.includes("Practical Action")) {
    if (/what (can|should) i do|next step|plan|action|strategy|how to (handle|deal|manage|fix|solve)/i.test(lower))
      signals["Practical Action"] += 3;
    if (/advice|suggestion|recommend|tip/i.test(lower)) signals["Practical Action"] += 2;
  }

  let best = allowed[0];
  let bestScore = 0;
  for (const [bucket, score] of Object.entries(signals)) {
    if (score > bestScore) {
      best = bucket;
      bestScore = score;
    }
  }
  return best;
}

/* ── Mode-specific system templates ── */
const MODE_TEMPLATES: Record<string, string> = {
  "Reflect with me": `MODE: Reflect with me
Goal: Gentle, grounded presence and curiosity.
Structure: Simply reflect what they said in everyday language, then optionally ask a natural, conversational question.
Tone: Like a mature, warm friend over text. No dramatic phrasing.`,

  "Sit with me": `MODE: Sit with me
Goal: Containment + presence.
Structure: Validate their situation in a simple sentence. Be present. No advice or deep analysis.
Tone: Calm, steady, warm. Like a dependable friend.`,

  "Challenge me gently": `MODE: Challenge me gently
Goal: Expand perspective safely.
Structure: Softly point out an alternative angle, but keep it very brief.
Tone: Supportive, honest, low-key.`,

  "Help me decide": `MODE: Help me decide
Goal: Reduce overwhelm.
Structure: Clarify the actual choice they are making in plain words.
Tone: Grounded, practical, friendly.`,

  "Just listen": `MODE: Just listen
Goal: Reflect only. Zero interpretation.
Structure: Simple acknowledgment. "I'm here." Minimal words.
Tone: Present, simple, raw.`,
};

const VARIATION_OPENERS = [
  "That's a lot to hold.",
  "I'm with you.",
  "Let's slow this down for a second.",
  "Okay. We can take this one piece at a time.",
  "I hear you.",
  "We don't need to rush this.",
  "That's worth sitting with.",
  "I'm glad you're saying this.",
];

/* ── Memory pack types ── */
interface MemoryPack {
  recurring_themes: string[];
  triggers: string[];
  coping_patterns: string[];
  preferences: string[];
  goals: string[];
  boundaries: string[];
  recent_trend: string;
}

/* ── Fetch memory pack ── */
async function getMemoryPack(supabase: any, userId: string): Promise<MemoryPack | null> {
  try {
    const { data: memories } = await supabase
      .from("mend_user_memory")
      .select("memory_type, content, evidence_count, confidence")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("evidence_count", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(8);

    if (!memories || memories.length === 0) return null;

    const pack: MemoryPack = {
      recurring_themes: [],
      triggers: [],
      coping_patterns: [],
      preferences: [],
      goals: [],
      boundaries: [],
      recent_trend: "",
    };

    for (const m of memories) {
      switch (m.memory_type) {
        case "recurring_theme":
          pack.recurring_themes.push(m.content);
          break;
        case "trigger":
          pack.triggers.push(m.content);
          break;
        case "coping_pattern":
          pack.coping_patterns.push(m.content);
          break;
        case "preference":
          pack.preferences.push(m.content);
          break;
        case "goal":
          pack.goals.push(m.content);
          break;
        case "boundary":
          pack.boundaries.push(m.content);
          break;
        case "relationship_context":
          pack.recurring_themes.push(m.content);
          break;
      }
    }

    // Fetch most recent weekly insight for trend
    const { data: insight } = await supabase
      .from("mend_weekly_insights")
      .select("narrative")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insight?.narrative) {
      pack.recent_trend = insight.narrative.slice(0, 200);
    }

    return pack;
  } catch (e) {
    console.error("Failed to fetch memory pack:", e);
    return null;
  }
}

/* ── Format memory pack for system prompt (max ~1000 chars) ── */
function formatMemoryContext(pack: MemoryPack): string {
  const lines: string[] = ["User Memory Context:"];

  if (pack.recurring_themes.length)
    lines.push(`Recurring themes:\n${pack.recurring_themes.map((t) => `- ${t}`).join("\n")}`);
  if (pack.triggers.length) lines.push(`Common triggers:\n${pack.triggers.map((t) => `- ${t}`).join("\n")}`);
  if (pack.coping_patterns.length)
    lines.push(`Helpful coping:\n${pack.coping_patterns.map((t) => `- ${t}`).join("\n")}`);
  if (pack.goals.length) lines.push(`Goals:\n${pack.goals.map((t) => `- ${t}`).join("\n")}`);
  if (pack.boundaries.length) lines.push(`Boundaries:\n${pack.boundaries.map((t) => `- ${t}`).join("\n")}`);
  if (pack.preferences.length) lines.push(`Preferences:\n${pack.preferences.map((t) => `- ${t}`).join("\n")}`);
  if (pack.recent_trend) lines.push(`Recent trend: ${pack.recent_trend}`);

  const result = lines.join("\n\n");
  return result.slice(0, 1000);
}

/* ── Pass A: Draft system prompt ── */
function buildDraftPrompt(
  mode: string,
  bucket: string,
  userState: any | null,
  conversationSummary: string | null,
  memoryPack: MemoryPack | null,
  memoryMoment?: string,
): string {
  const modeTemplate = MODE_TEMPLATES[mode] || MODE_TEMPLATES["Reflect with me"];
  const bucketContext =
    bucket === "Crisis"
      ? "CRISIS OVERRIDE: Gently acknowledge what they shared. If they are in crisis, encourage reaching out to the Indian Suicide Hotline at 9152987821 or someone they trust. CRITICAL: Never mention 988 or 741741. Do NOT add any standard safety boilerplate. Be present, not prescriptive. Keep your response brief and warm."
      : `Communication bucket: ${bucket}`;

  let userContext = "";
  if (userState) {
    const parts: string[] = [];
    if (userState.top_emotions?.length)
      parts.push(`Their recent emotional landscape includes: ${userState.top_emotions.join(", ")}.`);
    if (userState.top_contexts?.length)
      parts.push(`Themes they've been reflecting on: ${userState.top_contexts.join(", ")}.`);
    if (userState.intensity_trend === "rising") parts.push("Their emotional intensity has been increasing recently.");
    else if (userState.intensity_trend === "easing") parts.push("Things seem to be settling a bit for them lately.");
    if (userState.recurring_themes?.length) parts.push(`Recurring themes: ${userState.recurring_themes.join(", ")}.`);
    if (userState.time_bucket_pattern)
      parts.push(`They tend to reflect most during the ${userState.time_bucket_pattern}.`);
    if (parts.length)
      userContext = `\n\nUser context (reference naturally, never quote stats or say "I noticed a pattern"):\n${parts.join("\n")}`;
  }

  let convContext = "";
  if (conversationSummary) {
    convContext = `\n\nConversation so far (use for continuity, do not repeat back): ${conversationSummary}`;
  }

  let memoryContext = "";
  if (memoryPack) {
    memoryContext = `\n\n${formatMemoryContext(memoryPack)}\n(Use memory context naturally. Do not quote it directly. Do not say "I remember" or "you mentioned before" unless evidence_count is very high.)`;
  }

  let memoryMomentContext = "";
  if (memoryMoment) {
    memoryMomentContext = `\n\nMEMORY MOMENT (use naturally in this response, weave it in gently): "${memoryMoment}". Frame it as something you've noticed over time. Do not overemphasize it.`;
  }

  const openerIndex = Math.floor(Math.random() * VARIATION_OPENERS.length);

  return `You are MEND, a reflective emotional companion for users in India. Not a therapist, coach, or authority.

${modeTemplate}

${bucketContext}
${userContext}${convContext}${memoryContext}${memoryMomentContext}

GLOBAL CRAFT REQUIREMENTS (apply to every response):
- Respond like a mature, emotionally intelligent friend texting you, NOT a therapist, coach, or an AI bot.
- Keep it simple, short, direct (max 3-4 lines total).
- NEVER follow a predictable structure (e.g., repeating a paragraph, then a blank line, then a single question).
- NEVER use flowery, poetic, deep, or overly dramatic words (e.g., "profound", "crushing", "immense", "sharp", "darkness", "narrow", "echo", "spirit").
- Write naturally, in simple, raw language. No psychological deep dives or emotional essays.
- Speak in a casual, warm, texting-style tone (lowercase is fine).
- If asked for a helpline or number, simply reply: "Here is the Indian Suicide Hotline: 9152987821. I'm here for you." and nothing else.
- CRITICAL SAFETY RULE: You are serving users in India. Never mention 988, 741741, or any US numbers. For crisis support, ONLY provide the Indian Suicide Hotline: 9152987821.
- FORBIDDEN: Do not add standard safety blocks, boilerplate disclaimers, or automatic help info.`;
}

/* ── Formulation styles and question types for Pass B variety ── */
const FORMULATION_STYLES = [
  "direct_mirroring",
  "pattern_naming",
  "emotional_contrast",
  "narrative_frame",
  "observational_reflection",
  "gentle_hypothesis",
] as const;

const QUESTION_TYPES = ["somatic", "belief", "boundary", "value", "relational", "future"] as const;

function pickRandom<T>(arr: readonly T[], exclude?: T): T {
  const filtered = exclude ? arr.filter((x) => x !== exclude) : [...arr];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/* ── Per-request state for anti-repetition (reset each serve call) ── */
let lastFormulationStyle: string | null = null;
let lastQuestionType: string | null = null;

/* ── Pass B: Premium rewrite prompt ── */
function buildRewritePrompt(mode: string, bucket: string): string {
  const formulationStyle = pickRandom(FORMULATION_STYLES, lastFormulationStyle as any);
  const questionType = pickRandom(QUESTION_TYPES, lastQuestionType as any);
  lastFormulationStyle = formulationStyle;
  lastQuestionType = questionType;

  const noQuestionMode = mode === "Just listen" || mode === "Challenge me gently";

  return `You are rewriting a draft companion response into a premium, emotionally intelligent response.

Your goal is to make it feel deeply human, natural, and psychologically attuned — not templated.

Do not repeat structural phrasing from prior turns.

Do not begin with:
- Because you
- It sounds like
- It seems like

Use the assigned formulation style only:
FORMULATION_STYLE: ${formulationStyle}

The previous formulation style was:
PREVIOUS_STYLE: ${lastFormulationStyle || "none"}

Do not reuse the previous style.

${
  noQuestionMode
    ? ""
    : `The assigned question type is:
QUESTION_TYPE: ${questionType}

The previous question type was:
PREVIOUS_QUESTION_TYPE: ${lastQuestionType || "none"}

Do not reuse the previous question type.`
}

Response rules:
1. MAX 3-4 short, natural sentences TOTAL. No exceptions.
2. Calm, grounded, completely non-clinical tone. Act like a mature, empathetic friend texting.
3. NEVER use dramatic, poetic, or flowery words like "immense", "sharp", "profound", "crushing", "echo", "darkness", "spirit".
4. NEVER structure your response with strict paragraphs, empty lines, and a lone question at the end. Mix it up naturally.
5. Do not explain, analyze, or give deep psychological essays.
6. Use a casual, warm, texting-style tone: lowercase is okay. Don't be too robotic or formal. Keep it feeling human.
7. ${noQuestionMode ? "Do not include a question. End with a statement." : "If you ask a question, make it sound like a friend talking, not a therapist."}
8. If asked for a helpline or number, simply give 9152987821 straight away without an introductory speech.

Formulation style guidance:
Just sound human. Listen to them and reply like a friend. NO clinical reflections. NO paragraphs.

  ${bucket === "Crisis" ? "CRISIS: Gently acknowledge. Encourage reaching out to someone trusted or the Indian Suicide Hotline at 9152987821. DO NOT mention 988 or US numbers. NO generic safety boilerplate. Maintain your casual, human, texting-style tone. Brief and warm." : ""}

The final output must be the rewritten response only.
No explanations.
No labels.
No JSON.
No meta commentary.`;
}

/* ── Pass C: Memory extraction prompt ── */
function buildMemoryExtractionPrompt(): string {
  return `You are a memory extraction module for MEND, an emotional companion.

Extract durable behavioral memory items from this interaction. These will be stored long-term to help MEND understand the user over time.

Return JSON ONLY in this exact format:
{
  "add": [
    {
      "memory_type": "recurring_theme|trigger|coping_pattern|preference|relationship_context|goal|boundary",
      "content": "short reusable description under 120 characters",
      "confidence": 0.5,
      "safety_level": "normal|sensitive|crisis_related"
    }
  ]
}

Rules:
- Do NOT store personal identifiers (names, locations, workplaces).
- Do NOT store explicit self-harm content. For crisis themes, use abstract phrasing like "persistent hopelessness".
- Keep content under 120 characters.
- Content must be reusable and abstract, not a direct quote from the user.
- Only extract genuinely durable patterns, not fleeting mentions.
- If nothing durable exists in this interaction, return {"add": []}.
- Maximum 3 items per extraction.
- Confidence should be 0.3-0.6 for first mentions, higher only if strongly evidenced.`;
}

/* ── Conversation snapshot prompt ── */
function buildSnapshotPrompt(): string {
  return `Summarize this conversation turn in 1-2 sentences. Focus on the user's core emotional state and what they're working through. Also list 1-3 key themes as a JSON array of short strings. Output valid JSON only: {"summary": "...", "themes": ["...", "..."]}`;
}

/* ── Supabase helper ── */
function getSupabaseAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/* ── Non-streaming AI call ── */
async function callAI(apiKey: string, systemPrompt: string, messages: any[]): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI call failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

/* ── Streaming AI call ── */
async function streamAI(apiKey: string, systemPrompt: string, messages: any[]): Promise<Response> {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });
}

/* ── Premium constraint validation ── */
function validatePremiumConstraints(text: string): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const lower = text.toLowerCase();

  const forbidden = ["it sounds like", "it seems like", "maybe", "perhaps", "i wonder if", "it is understandable"];
  for (const phrase of forbidden) {
    if (lower.includes(phrase)) failures.push(`Contains forbidden phrase: "${phrase}"`);
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 130) failures.push(`Over word limit: ${wordCount} words`);

  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount === 0) failures.push("No question found");
  if (questionCount > 2) failures.push(`Too many questions: ${questionCount}`);

  const paragraphs = text.split(/\n\n+/).filter((s) => s.trim());
  if (paragraphs.length > 4) failures.push(`Too many parts: ${paragraphs.length}`);

  return { passed: failures.length === 0, failures };
}

/* ── Simple similarity check ── */
function contentSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/* ── Pass C: Extract and store memories ── */
async function extractAndStoreMemories(
  apiKey: string,
  supabase: any,
  userId: string,
  userMessage: string,
  assistantResponse: string,
  memoryPack: MemoryPack | null,
  messageId?: string,
) {
  try {
    const extractionPrompt = buildMemoryExtractionPrompt();
    const extractionMessages = [
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantResponse },
    ];

    if (memoryPack) {
      extractionMessages.unshift({
        role: "user",
        content: `Current memory context:\n${JSON.stringify(memoryPack)}`,
      });
    }

    const raw = await callAI(apiKey, extractionPrompt, extractionMessages);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.add || !Array.isArray(parsed.add) || parsed.add.length === 0) return;

    for (const item of parsed.add.slice(0, 3)) {
      if (!item.memory_type || !item.content || item.content.length > 120) continue;

      const validTypes = [
        "preference",
        "recurring_theme",
        "trigger",
        "coping_pattern",
        "relationship_context",
        "goal",
        "boundary",
      ];
      if (!validTypes.includes(item.memory_type)) continue;

      const safetyLevel =
        item.safety_level === "crisis_related"
          ? "crisis_related"
          : item.safety_level === "sensitive"
            ? "sensitive"
            : "normal";

      // Check for existing similar memory
      const { data: existing } = await supabase
        .from("mend_user_memory")
        .select("id, content, evidence_count, confidence")
        .eq("user_id", userId)
        .eq("memory_type", item.memory_type)
        .eq("status", "active");

      let matchedMemoryId: string | null = null;
      if (existing) {
        for (const ex of existing) {
          if (contentSimilarity(ex.content, item.content) > 0.8) {
            matchedMemoryId = ex.id;
            // Update existing memory
            await supabase
              .from("mend_user_memory")
              .update({
                evidence_count: ex.evidence_count + 1,
                confidence: Math.min(1, (ex.confidence || 0.5) + 0.05),
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", ex.id);
            break;
          }
        }
      }

      if (!matchedMemoryId) {
        // Insert new memory
        const { data: newMemory } = await supabase
          .from("mend_user_memory")
          .insert({
            user_id: userId,
            memory_type: item.memory_type,
            content: item.content,
            confidence: item.confidence || 0.5,
            safety_level: safetyLevel,
            source: "chat",
          })
          .select("id")
          .single();

        if (newMemory) matchedMemoryId = newMemory.id;
      }

      // Insert evidence link
      if (matchedMemoryId && messageId) {
        await supabase.from("mend_memory_evidence").insert({
          memory_id: matchedMemoryId,
          message_id: messageId,
          snippet: userMessage.slice(0, 200),
        });
      }
    }

    console.log("[mend_chat] Pass C: Memory extraction complete");
  } catch (e) {
    console.error("Memory extraction failed:", e);
  }
}

function isSmallTalk(text: string): boolean {
  const t = text.trim().toLowerCase();

  // protect crisis or helpline numbers from being treated as small talk
  if (/(helpline|hotline|911|emergency|suicide|kill|die|number)/.test(t)) return false;

  // very short messages
  if (t.length <= 12 && !/(sad|tired|angry|upset|feel)/.test(t)) {
    return true;
  }

  const casualPatterns = [
    /^hi+$/,
    /^hello+$/,
    /^hey+$/,
    /^hii+$/,
    /^heyy+$/,
    /^yo$/,
    /^sup$/,
    /^what'?s up$/,
    /^k$/,
    /^ok$/,
    /^okay$/,
    /^lol$/,
    /^lmao$/,
  ];

  if (casualPatterns.some((p) => p.test(t))) return true;

  // casual sentences
  if (
    /^(hi|hey|hello).*(how are you|what's up|how's it going)/.test(t) ||
    /(how are you|what's up|wyd|what are you doing)/.test(t)
  ) {
    return true;
  }

  return false;
}

function isCasualIntent(text: string): boolean {
  const lower = text.toLowerCase();

  // protect crisis or helpline keywords from being treated as casual intent
  if (/(helpline|hotline|911|emergency|suicide|kill|die|number)/.test(lower)) return false;

  // ❗ don't catch emotional sentences
  if (lower.length < 15 && !/(feel|sad|angry|tired|upset|anxious|lost|overwhelmed)/.test(lower)) {
    return true;
  }

  if (/^(thanks|thank you|cool|nice|great|awesome)/.test(lower) || /(haha|lol|ok|fine|alright)/.test(lower)) {
    return true;
  }

  return false;
}

function casualReply(input: string) {
  const t = input.toLowerCase();

  if (t.includes("how are you") || t.includes("how r u")) {
    return "i'm ok, i hope u r doing well.";
  }

  if (t.includes("what's up") || t.includes("sup") || t.includes("wyd")) {
    const p = [
      "not much, just here if u need anything. How are you?",
      "just hanging out 🙂, how are you?",
      "doing okay! what's on your mind?",
    ];
    return p[Math.floor(Math.random() * p.length)];
  }

  if (t.includes("thank") || t.includes("thx")) {
    return "no worries! let me know if u need anything else 🙂";
  }

  const generic = [
    "hey 🙂 what's up?",
    "hi! how's your day going?",
    "hey! i'm here 🙂",
    "hey 😄 what's on ur mind?",
    "hi there! How are you feeling today?",
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}

function isLightEmotional(text: string): boolean {
  const lower = text.toLowerCase();

  return /(tired|long day|meh|drained|low energy|not great|ugh)/.test(lower) && lower.length < 80;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, companion_mode, user_state, memory_moment } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const mode = companion_mode || "Reflect with me";

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    console.log("------ DEBUG START ------");
    console.log("All messages:", messages);
    console.log("Last message picked:", lastUserMsg);
    console.log("isSmallTalk:", isSmallTalk(lastUserMsg));
    console.log("isCasualIntent:", isCasualIntent(lastUserMsg));
    console.log("-------------------------");

    if (isSmallTalk(lastUserMsg) || isCasualIntent(lastUserMsg)) {
      console.log("✅ EARLY RETURN TRIGGERED");
      const reply = casualReply(lastUserMsg);

      return new Response(JSON.stringify({ role: "assistant", content: reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isLightEmotional(lastUserMsg)) {
      return new Response(
        JSON.stringify({
          role: "assistant",
          content: "long day? 😌 wanna talk about it or just chill here?",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* NORMAL MEND FLOW */
    const bucket = classifyBucket(lastUserMsg, mode);

    // Fetch conversation state + memory pack
    let conversationSummary: string | null = null;
    let memoryPack: MemoryPack | null = null;
    let userId: string | null = null;

    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const supabase = getSupabaseAdmin();
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user },
        } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);

        if (user) {
          userId = user.id;

          // Fetch conversation state and memory pack in parallel
          const [stateResult, packResult] = await Promise.all([
            supabase.from("conversation_state").select("summary").eq("user_id", user.id).maybeSingle(),
            getMemoryPack(supabase, user.id),
          ]);

          if (stateResult.data?.summary) {
            conversationSummary = stateResult.data.summary;
          }
          memoryPack = packResult;
        }
      }
    } catch (e) {
      console.error("Failed to fetch conversation state:", e);
    }

    console.log("❌ Going to MEND / OpenAI pipeline");
    // ── Pass A: Generate draft (non-streaming) ──
    const draftPrompt = buildDraftPrompt(
      mode,
      bucket,
      user_state || null,
      conversationSummary,
      memoryPack,
      memory_moment,
    );
    const draftResponse = await callAI(LOVABLE_API_KEY, draftPrompt, messages);
    const cleanedDraft = draftResponse.replace(/988/g, "9152987821").replace(/741741/g, "Indian Suicide Hotline");

    console.log("[mend_chat] Pass A draft generated, length:", cleanedDraft.length);

    // ── Pass B: Premium rewrite (streaming) ──
    const rewritePrompt = buildRewritePrompt(mode, bucket);
    const rewriteMessages = [
      ...messages,
      { role: "assistant", content: cleanedDraft },
      {
        role: "user",
        content:
          "Now rewrite this draft into the final premium response. Output ONLY the rewritten response. CRITICAL: If you mention a helpline, you MUST use the Indian Suicide Hotline: 9152987821. Never use 988 or 741741. Ensure the tone is casual and lowercase.",
      },
    ];

    const streamResponse = await streamAI(LOVABLE_API_KEY, rewritePrompt, rewriteMessages);

    if (!streamResponse.ok) {
      if (streamResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "I need a moment to catch my breath. Please try again in a few seconds." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (streamResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "The AI companion service needs attention. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await streamResponse.text();
      console.error("AI gateway error (Pass B):", streamResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Something went wrong. Let's try again in a moment." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate + Debug log ──
    const validation = validatePremiumConstraints(draftResponse);
    console.log(
      "[mend_chat]",
      JSON.stringify({
        experience_mode: mode,
        communication_bucket: bucket,
        premium_constraints_satisfied: validation.passed,
        memory_pack_injected: !!memoryPack,
        ...(validation.failures.length ? { constraint_failures: validation.failures } : {}),
      }),
    );

    // ── Background: Pass C memory extraction + conversation snapshot ──
    if (userId) {
      (async () => {
        try {
          const supabase = getSupabaseAdmin();

          // Find the most recent user message ID for evidence linking
          const { data: recentMsg } = await supabase
            .from("mend_messages")
            .select("id")
            .eq("user_id", userId)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Run Pass C memory extraction and conversation snapshot in parallel
          await Promise.all([
            extractAndStoreMemories(
              LOVABLE_API_KEY,
              supabase,
              userId!,
              lastUserMsg,
              draftResponse,
              memoryPack,
              recentMsg?.id,
            ),
            (async () => {
              const snapshotPrompt = buildSnapshotPrompt();
              const snapshotInput = [
                { role: "user", content: lastUserMsg },
                { role: "assistant", content: draftResponse },
              ];

              const snapshotRaw = await callAI(LOVABLE_API_KEY, snapshotPrompt, snapshotInput);
              const jsonMatch = snapshotRaw.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const snapshot = JSON.parse(jsonMatch[0]);
                await supabase.from("conversation_state").upsert(
                  {
                    user_id: userId,
                    summary: snapshot.summary || "",
                    themes: snapshot.themes || [],
                    last_updated: new Date().toISOString(),
                  },
                  { onConflict: "user_id" },
                );
                console.log("[mend_chat] Conversation snapshot updated");
              }
            })(),
          ]);
        } catch (e) {
          console.error("Background tasks failed:", e);
        }
      })();
    } else {
      // Unauthenticated: just do snapshot if possible
      (async () => {
        try {
          const authHeader = req.headers.get("authorization");
          if (!authHeader) return;

          const token = authHeader.replace("Bearer ", "");
          const {
            data: { user },
          } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);

          if (!user) return;

          const snapshotPrompt = buildSnapshotPrompt();
          const snapshotInput = [
            { role: "user", content: lastUserMsg },
            { role: "assistant", content: draftResponse },
          ];

          const snapshotRaw = await callAI(LOVABLE_API_KEY, snapshotPrompt, snapshotInput);
          const jsonMatch = snapshotRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const snapshot = JSON.parse(jsonMatch[0]);
            const supabase = getSupabaseAdmin();
            await supabase.from("conversation_state").upsert(
              {
                user_id: user.id,
                summary: snapshot.summary || "",
                themes: snapshot.themes || [],
                last_updated: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );
          }
        } catch (e) {
          console.error("Snapshot update failed:", e);
        }
      })();
    }

    return new Response(streamResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Communication-Bucket": bucket,
      },
    });
  } catch (e) {
    console.error("mend_chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
