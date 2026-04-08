import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Communication-Bucket, X-Formulation-Style, X-Question-Type",
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
  "want to end my life",
  "thinking about ending everything",
  "don't want to be here anymore",
  "need to talk to someone about suicide",
  "can't go on anymore",
  "feeling like ending my life",
  "helpline",
  "hotline",
  "suicide number",
  "suicide line",
  "crisis line",
  "need help now",
];

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

function classifyBucket(userText: string, mode: string): string {
  if (detectCrisis(userText)) return "Crisis";

  const lower = userText.toLowerCase();

  const smallTalkPatterns = [
    /^(hi|hello|hey|hiya|howdy|sup|yo)/i,
    /^(how are you|how's it going|what's up)/i,
    /^(tell me a joke|who are you)/i,
    /^(thanks|thank you|bye|goodbye|cya)/i,
    /^(good|fine|ok|okay|not bad|great)/i,
  ];

  if (userText.split(" ").length <= 8 && smallTalkPatterns.some((p) => p.test(lower))) {
    return "Small Talk";
  }

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
Goal: Deep insight, Simple, grounded accuracy, plain delivery.
Tone Guidelines (CRITICAL):
- Name the core struggle or emotion accurately (e.g. regret, shame, fear) but use plain, everyday words.
- ABSOLUTELY NO clinical or dramatic words: "oscillating", "self-compassion", "self-loathing", "burden", "profound", "layered", "disorientation", "processing", "heavy shield", "walls", "armor", "waves", "terrain", "shielding".
- Use direct, grounded sentences. Use plain, everyday language.
- Example: "That regret sounds heavy." NOT "You are carrying a deep emotional burden."
- If the user says little, respond even more briefly. (1 sentence is often enough).

Structure:
1. Clean Formulation
2. One integrated block of 1-3 short sentences total.
3. Blend the observation and any simple question naturally. No parts.
Tone: Simple, directly human, mature friend.`,

  "Sit with me": `MODE: Sit with me
Goal: Containment + presence.
Structure (follow exactly):
1. Reflection: Mirror their situation plainly using their own words.
2. Validation: Name the dominant emotion clearly and validate it without explaining it.
3. Gentle anchor: At most one gentle grounding question or a brief anchoring statement.

Rules:
- Mirror situation plainly.
- Name dominant emotion clearly.
- No reframes. No pattern linking. No interpretation.
- At most one gentle grounding question.
Tone: Calm, steady, warm. Minimal words. Maximum presence.`,

  "Challenge me gently": `MODE: Challenge me gently
Goal: Expand perspective safely.
Structure (follow exactly):
1. Assumption spotted: Identify one possible assumption in what they shared.
2. Alternate frame: Offer one alternative interpretation that respects their autonomy.
3. Closing reflection: End with a brief, grounded statement that leaves space for the user to sit with the new frame.

Rules:
- Identify one possible assumption.
- Offer one alternative interpretation.
- Maintain autonomy support. No shaming language.
- Do NOT ask any questions. End with a statement, not a question.
Tone: Calm, firm, respectful.`,

  "Help me decide": `MODE: Help me decide
Goal: Reduce overwhelm, clarify tradeoffs.
Structure (follow exactly):
1. Define choice: State the real decision in one sentence.
2. Tradeoff contrast: Present 2 options with a clear tradeoff and surface the likely value conflict.
3. Clarifying question: Ask one constraint question that narrows their choice.

Rules:
- Define the real decision in one sentence.
- Present 2 options with a tradeoff.
- Surface likely value conflict.
- Ask one constraint question.
Tone: Structured, clear, empowering.`,

  "Just listen": `MODE: Just listen
Goal: Reflect only. Zero interpretation.
Structure (follow exactly):
1. Mirror: Repeat the core situation using the user's own language.
2. Emotion naming: Name the main emotion you hear, nothing more.
3. Presence: End with a brief, warm statement of presence (e.g., "I'm here." or "That's a lot to carry.").

Rules:
- Repeat core situation using user's own language.
- Name main emotion. Nothing more.
- ABSOLUTELY NO advice. NO reframing. NO interpretation. NO pattern references.
- Do NOT ask any questions. No invitations, no prompts. End with a statement.
Tone: Present, simple, non-analytical.`,
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
      .limit(20);

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
  let coreInstruction = modeTemplate;
  let bucketContext = `Communication bucket: ${bucket}`;

  if (bucket === "Crisis") {
    coreInstruction = `MODE: Crisis Response
Goal: Immediate safety and connection.
Structure:
1. Acknowledge: Gently and briefly acknowledge the weight of what they shared.
2. Mandatory Resource: YOU MUST provide the Indian Suicide Hotline at 9152987821.
3. Presence: A warm, brief statement of presence.

Rules:
- DO NOT mention any other hotline (no 988, no 741741).
- Keep it under 80 words.
- No clinical jargon.
- No complex curiosity questions. At most, ask if they can reach out to someone they trust.`;
    bucketContext = "CRISIS OVERRIDE ACTIVE: Priority is safe referral to the Indian Suicide Hotline (9152987821).";
  } else if (bucket === "Small Talk") {
    coreInstruction = `MODE: Small Talk
Goal: Be a natural, friendly, non-clinical companion.
Structure:
1. Warm Response: Respond naturally to their greeting or casual remark.
2. Gentle Pivot: Briefly ask how they are really doing or what's on their mind.

Rules:
- 2-3 sentences maximum.
- Casual, warm, like a mature friend texting.
- NO clinical jargon or deep analysis.
- DO NOT force emotional reflection.`;
    bucketContext = "Communication bucket: Small Talk (Keep it casual and simple)";
  }

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

  return `You are MEND, a reflective emotional companion. Not a therapist, coach, or authority.

${coreInstruction}

${bucketContext}
${userContext}${convContext}${memoryContext}${memoryMomentContext}

GLOBAL CRAFT REQUIREMENTS (applied in a single pass):
- Maximum 100 words. Keep it extremely concise.
- Plain, grounded language ONLY. No poetic or metaphorical phrasing.
- ABSOLUTELY NO imagery: "heavy shield", "walls", "armor", "waves", "terrain", "shielding", "journey", "navigating".
- Speak like a clear, emotionally aware human, not a writer or therapist.
- Do NOT over-expand. If user says 1-5 words, respond in 1-2 short sentences.
- Reference at least 1 concrete phrase from the user's message.
- Tone: Natural, clear, simple.
${mode === "Just listen" || mode === "Challenge me gently" ? "- Do NOT ask any questions. End with a statement." : "- Ask exactly 1 simple, targeted question."}
- FORBIDDEN phrases: "it sounds like", "it seems like", "maybe", "perhaps", "I wonder if", "It is understandable".
- Speak tentatively when reflecting, not conclusively.
- Never use clinical or dramatic metaphors.
- Never give advice or solutions.

If unsure, default to mirroring simply and cleanly.`;
}

/* ── Unified Rewrite Constraints (Merged into Pass A for zero-latency) ── */
function applyPremiumRewriteConstraints(
  basePrompt: string,
  mode: string,
  bucket: string,
  formulationStyle: string,
  questionType: string,
): string {
  if (bucket === "Small Talk") {
    return `You are MEND, a natural, friendly companion responding to small talk.
    
Response rules:
1. Maximum 3 sentences.
2. Warm, simple, conversational tone.
3. No therapeutic jargon or deep emotional layering.
4. End with a simple, natural question about how they are doing (unless they said goodbye).

Output ONLY the final response.`;
  }

  const noQuestionMode = mode === "Just listen" || mode === "Challenge me gently";

  return `${basePrompt}

PREMIUM REFINEMENT OVERRIDE:
Your goal is to make this response feel deeply human, natural, and psychologically attuned — not templated.

Use this formulation style: ${formulationStyle}
${noQuestionMode ? "" : `Use this question type: ${questionType}`}

Premium Rules:
1. Maximum 100 words. Keep it extremely concise (1-3 sentences total is ideal).
2. NO repetitive sentence structures. NEVER start responses with "Because you..." or "It sounds like...".
3. NO clinical or dramatic vocabulary: BANNED: "oscillating", "self-compassion", "self-loathing", "processing", "burden", "profound", "layered", "spectrum", "dynamic", "heavy shield", "walls", "armor", "waves", "terrain", "shielding".
4. Calm, grounded, non-clinical tone.
5. Emotional awareness must feel organic and integrated. No "textbook" format.
6. Use plain, direct, human language. Use concrete words from the user's message.
7. ${noQuestionMode || bucket === "Crisis" ? "End with a statement or safety question." : `Ask a question ONLY when it naturally drives the conversation forward. Do not force it.`}
 8. NO dashes (--) or trailing special characters.
 
Style Guide:
- ${formulationStyle}: ${formulationStyle === "direct_mirroring"
      ? "Open with vivid emotional reflection."
      : formulationStyle === "pattern_naming"
        ? "Gently name a recurring pattern."
        : formulationStyle === "emotional_contrast"
          ? "Highlight surface reaction vs underlying vulnerability."
          : formulationStyle === "narrative_frame"
            ? "Frame experience as a recurring chapter."
            : formulationStyle === "observational_reflection"
              ? "Describe what you notice groundedly."
              : "Offer a soft interpretation using uncertain language."
    }
`;
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

/* ── Pass B: Premium rewrite prompt ── */
function buildRewritePrompt(
  mode: string,
  bucket: string,
  prevFormulationStyle?: string | null,
  prevQuestionType?: string | null,
): { prompt: string; formulationStyle: string; questionType: string } {
  const formulationStyle = pickRandom(FORMULATION_STYLES, prevFormulationStyle as any);
  const questionType = pickRandom(QUESTION_TYPES, prevQuestionType as any);

  const noQuestionMode = mode === "Just listen" || mode === "Challenge me gently";
  const isSmallTalk = bucket === "Small Talk";

  if (isSmallTalk) {
    return {
      prompt: `You are rewriting a draft companion response. 
Make it feel deeply human, natural, and like a casual text from a mature friend.

Response rules:
1. Maximum 3 sentences.
2. Warm, simple, conversational tone.
3. No therapeutic jargon or deep emotional layering.
4. End with a simple, natural question about how they are doing (unless they said goodbye).

The final output must be the rewritten response only.
No explanations or labels.`,
      formulationStyle: "casual",
      questionType: "casual",
    };
  }

  const prompt = `You are rewriting a draft companion response into a premium, emotionally intelligent response.

Your goal is to make it feel deeply human, natural, and psychologically attuned — not templated.

Do not repeat structural phrasing from prior turns.

Do not begin with:
- Because you
- It sounds like
- It seems like

Use the assigned formulation style only:
FORMULATION_STYLE: ${formulationStyle}

The previous formulation style was:
PREVIOUS_STYLE: ${prevFormulationStyle || "none"}

Do not reuse the previous style.

${noQuestionMode
      ? ""
      : `The assigned question type is:
QUESTION_TYPE: ${questionType}

The previous question type was:
PREVIOUS_QUESTION_TYPE: ${prevQuestionType || "none"}

Do not reuse the previous question type.`
    }

Response rules:
1. Maximum 120 words.
2. Calm, grounded, non-clinical tone.
3. No dashes.
4. Emotional layering must feel natural, not formulaic.
5. Do not explicitly label "protective emotion" unless absolutely necessary.
6. Avoid repetitive sentence rhythm.
7. Avoid therapy-manual phrasing.
8. Use concrete language drawn from the user's message.
9. ${noQuestionMode || bucket === "Crisis" ? "Do not include a curiosity question. End with a statement or a simple safety-related question." : "Maintain exactly one question."}
10. ${bucket === "Crisis" ? "CRISIS REQUIREMENT: You MUST include the Indian Suicide Hotline (9152987821). DO NOT mention 988. This is the top priority." : noQuestionMode ? "End every response with a statement, never a question mark." : `Ask exactly 1 question of type "${questionType}".`}

Formulation style guidance:

direct_mirroring:
Open with vivid emotional reflection grounded in the user's specific situation.

pattern_naming:
Gently name a recurring pattern without sounding analytical.

emotional_contrast:
Highlight contrast between surface reaction and underlying vulnerability.

narrative_frame:
Frame the experience as a recurring story or chapter.

observational_reflection:
Describe what you are noticing with steady, grounded language.

gentle_hypothesis:
Offer a soft interpretation using uncertain language once, not repeatedly.

${!noQuestionMode
      ? `Question type guidance:

somatic:
Ask about physical sensation in the body.

belief:
Ask about the belief forming underneath the reaction.

boundary:
Ask what boundary may feel crossed.

value:
Ask what personal value feels unmet.

relational:
Ask how they interpret the other person's behavior.

future:
Ask what would feel different next time.`
      : ""
    }

${bucket === "Crisis" ? "CRISIS: YOU MUST include the Indian Suicide Hotline at 9152987821. DO NOT mention 988. Gently acknowledge what they shared. Brief and warm." : ""}

The final output must be the rewritten response only.
No explanations.
No labels.
No JSON.
No meta commentary.`;

  return { prompt, formulationStyle, questionType };
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
- Memory Types: 
    - preference: Capture likes, dislikes, and hobbies (e.g. "Loves biryani", "Prefers early morning walks"). These should be specific.
    - recurring_theme/trigger/etc: Capture emotional and behavioral patterns.
- Keep content under 120 characters.
- Content must be reusable. Be specific for preferences, but abstract for emotional patterns.
- Only extract genuinely durable patterns, habits, or established facts.
- If nothing durable exists in this interaction, return {"add": []}.
- Maximum 5 items per extraction.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, companion_mode, user_state, memory_moment, last_formulation_style, last_question_type } =
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const mode = companion_mode || "Reflect with me";
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
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

    // ── Unified Pass: Direct Streaming ──
    const formulationStyle = pickRandom(FORMULATION_STYLES, last_formulation_style);
    const questionType = pickRandom(QUESTION_TYPES, last_question_type);

    const basePrompt = buildDraftPrompt(
      mode,
      bucket,
      user_state || null,
      conversationSummary,
      memoryPack,
      memory_moment,
    );

    const unifiedPrompt = applyPremiumRewriteConstraints(basePrompt, mode, bucket, formulationStyle, questionType);

    console.log(`[mend_chat] Starting unified streaming pass (${bucket})`);
    const streamResponse = await streamAI(LOVABLE_API_KEY, unifiedPrompt, messages);

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

    // ── Capture and Stream ──
    let fullResponseText = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content || "";
              fullResponseText += content;
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
        controller.enqueue(chunk);
      },
      flush() {
        // Trigger background tasks once the stream is fully captured
        console.log("[mend_chat] Stream captured, length:", fullResponseText.length);

        if (userId) {
          (async () => {
            try {
              const supabase = getSupabaseAdmin();
              const { data: recentMsg } = await supabase
                .from("mend_messages")
                .select("id")
                .eq("user_id", userId)
                .eq("role", "user")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              await Promise.all([
                extractAndStoreMemories(
                  LOVABLE_API_KEY,
                  supabase,
                  userId!,
                  lastUserMsg,
                  fullResponseText,
                  memoryPack,
                  recentMsg?.id,
                ),
                (async () => {
                  const snapshotPrompt = buildSnapshotPrompt();
                  const snapshotInput = [
                    { role: "user", content: lastUserMsg },
                    { role: "assistant", content: fullResponseText },
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
                  }
                })(),
              ]);
            } catch (e) {
              console.error("Background tasks failed:", e);
            }
          })();
        }
      },
    });

    return new Response(streamResponse.body!.pipeThrough(transformStream), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Communication-Bucket": bucket,
        "X-Formulation-Style": formulationStyle,
        "X-Question-Type": questionType,
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
