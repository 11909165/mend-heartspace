import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  "kill myself", "suicide", "end it all", "want to die", "self harm",
  "self-harm", "hurt myself", "not worth living", "better off dead",
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
    if (/i (just )?need to (let|get) (this|it) out|vent|scream|ugh|frustrated|angry|furious|sick of/i.test(lower)) signals["Venting"] += 3;
    if (/can't take|had enough|exhausted|done with/i.test(lower)) signals["Venting"] += 2;
  }
  if (allowed.includes("Reassurance")) {
    if (/am i (wrong|okay|normal|overreacting)|is (this|it) (okay|normal)|tell me|reassure|worried/i.test(lower)) signals["Reassurance"] += 3;
    if (/scared|afraid|anxious|nervous/i.test(lower)) signals["Reassurance"] += 2;
  }
  if (allowed.includes("Emotional Processing")) {
    if (/feel(ing)?|emotion|sad|grief|loss|miss|heart|heavy|numb|confused about (my|how i) feel/i.test(lower)) signals["Emotional Processing"] += 3;
    if (/overwhelm|cry|tears|hurt/i.test(lower)) signals["Emotional Processing"] += 2;
  }
  if (allowed.includes("Pattern Reflection")) {
    if (/always|again|keep doing|pattern|cycle|repeat|every time|same thing/i.test(lower)) signals["Pattern Reflection"] += 3;
    if (/notice|realize|wonder why i/i.test(lower)) signals["Pattern Reflection"] += 2;
  }
  if (allowed.includes("Seeking Perspective")) {
    if (/perspective|different way|another angle|think about this|make sense|understand/i.test(lower)) signals["Seeking Perspective"] += 3;
    if (/what do you think|how (should|would|do)/i.test(lower)) signals["Seeking Perspective"] += 2;
  }
  if (allowed.includes("Decision Making")) {
    if (/decide|decision|choose|option|should i|torn between|dilemma/i.test(lower)) signals["Decision Making"] += 3;
    if (/pros and cons|trade.?off|either.*or/i.test(lower)) signals["Decision Making"] += 2;
  }
  if (allowed.includes("Practical Action")) {
    if (/what (can|should) i do|next step|plan|action|strategy|how to (handle|deal|manage|fix|solve)/i.test(lower)) signals["Practical Action"] += 3;
    if (/advice|suggestion|recommend|tip/i.test(lower)) signals["Practical Action"] += 2;
  }

  let best = allowed[0];
  let bestScore = 0;
  for (const [bucket, score] of Object.entries(signals)) {
    if (score > bestScore) { best = bucket; bestScore = score; }
  }
  return best;
}

/* ── Mode-specific system templates ── */
const MODE_TEMPLATES: Record<string, string> = {
  "Reflect with me": `MODE: Reflect with me
Goal: Insight + emotional layering.
Structure (follow exactly):
1. Formulation: "Because [specific event], you're feeling [surface emotion] on top of [protective emotion], and you need [inferred need]."
2. Emotional deepening: Layer surface emotion with a possible protective emotion underneath. Provide emotional deepening, not advice. Reference light past context if relevant.
3. One precise curiosity question that invites self-exploration.

Rules:
- Start with formulation.
- Layer surface + protective emotion.
- No advice. Emotional deepening only.
- One precise curiosity question.
- May reference light past context if relevant.
Tone: Slow, grounded, insightful.`,

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
        case "recurring_theme": pack.recurring_themes.push(m.content); break;
        case "trigger": pack.triggers.push(m.content); break;
        case "coping_pattern": pack.coping_patterns.push(m.content); break;
        case "preference": pack.preferences.push(m.content); break;
        case "goal": pack.goals.push(m.content); break;
        case "boundary": pack.boundaries.push(m.content); break;
        case "relationship_context": pack.recurring_themes.push(m.content); break;
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

  if (pack.recurring_themes.length) lines.push(`Recurring themes:\n${pack.recurring_themes.map(t => `- ${t}`).join("\n")}`);
  if (pack.triggers.length) lines.push(`Common triggers:\n${pack.triggers.map(t => `- ${t}`).join("\n")}`);
  if (pack.coping_patterns.length) lines.push(`Helpful coping:\n${pack.coping_patterns.map(t => `- ${t}`).join("\n")}`);
  if (pack.goals.length) lines.push(`Goals:\n${pack.goals.map(t => `- ${t}`).join("\n")}`);
  if (pack.boundaries.length) lines.push(`Boundaries:\n${pack.boundaries.map(t => `- ${t}`).join("\n")}`);
  if (pack.preferences.length) lines.push(`Preferences:\n${pack.preferences.map(t => `- ${t}`).join("\n")}`);
  if (pack.recent_trend) lines.push(`Recent trend: ${pack.recent_trend}`);

  const result = lines.join("\n\n");
  return result.slice(0, 1000);
}

/* ── Pass A: Draft system prompt ── */
function buildDraftPrompt(mode: string, bucket: string, userState: any | null, conversationSummary: string | null, memoryPack: MemoryPack | null, memoryMoment?: string): string {
  const modeTemplate = MODE_TEMPLATES[mode] || MODE_TEMPLATES["Reflect with me"];
  const bucketContext = bucket === "Crisis"
    ? "CRISIS OVERRIDE: Gently acknowledge what they shared. Encourage reaching out to someone they trust or a helpline. Be present, not prescriptive. Keep your response brief and warm."
    : `Communication bucket: ${bucket}`;

  let userContext = "";
  if (userState) {
    const parts: string[] = [];
    if (userState.top_emotions?.length) parts.push(`Their recent emotional landscape includes: ${userState.top_emotions.join(", ")}.`);
    if (userState.top_contexts?.length) parts.push(`Themes they've been reflecting on: ${userState.top_contexts.join(", ")}.`);
    if (userState.intensity_trend === "rising") parts.push("Their emotional intensity has been increasing recently.");
    else if (userState.intensity_trend === "easing") parts.push("Things seem to be settling a bit for them lately.");
    if (userState.recurring_themes?.length) parts.push(`Recurring themes: ${userState.recurring_themes.join(", ")}.`);
    if (userState.time_bucket_pattern) parts.push(`They tend to reflect most during the ${userState.time_bucket_pattern}.`);
    if (parts.length) userContext = `\n\nUser context (reference naturally, never quote stats or say "I noticed a pattern"):\n${parts.join("\n")}`;
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

${modeTemplate}

${bucketContext}
${userContext}${convContext}${memoryContext}${memoryMomentContext}

GLOBAL CRAFT REQUIREMENTS (apply to every response):
- Maximum 120 words. Exactly 3 short parts.
- Include: 1 surface emotion, 1 protective emotion (if applicable), 1 inferred emotional need (safety, clarity, reassurance, autonomy, connection, or rest).
- Reference at least 1 concrete phrase from the user's message.
${mode === "Just listen" || mode === "Challenge me gently" ? "- Do NOT ask any questions. End with a statement." : "- Ask exactly 1 targeted question."}
- FORBIDDEN phrases: "it sounds like", "it seems like", "maybe", "perhaps", "I wonder if", "It is understandable".
- Vary your opening lines. Here is one you could use if it fits: "${VARIATION_OPENERS[openerIndex]}"
- Speak tentatively when reflecting, not conclusively.
- Reflect the user's words and emotional tone before adding anything new.
- Do NOT explain why feelings occur or suggest underlying causes.
- Avoid therapist-style or clinical language.
- Do not introduce metaphors or theories unless the user uses them first.
- Never give advice, solutions, action items, or next steps.
- Never use diagnostic or clinical terms.
- Never present yourself as an expert or authority.

If unsure, default to mirroring and asking "what do you notice?".`;
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

const QUESTION_TYPES = [
  "somatic",
  "belief",
  "boundary",
  "value",
  "relational",
  "future",
] as const;

function pickRandom<T>(arr: readonly T[], exclude?: T): T {
  const filtered = exclude ? arr.filter(x => x !== exclude) : [...arr];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/* ── Pass B: Premium rewrite prompt ── */
function buildRewritePrompt(mode: string, bucket: string, prevFormulationStyle?: string | null, prevQuestionType?: string | null): { prompt: string; formulationStyle: string; questionType: string } {
  const formulationStyle = pickRandom(FORMULATION_STYLES, prevFormulationStyle as any);
  const questionType = pickRandom(QUESTION_TYPES, prevQuestionType as any);

  const noQuestionMode = mode === "Just listen" || mode === "Challenge me gently";

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

${noQuestionMode ? "" : `The assigned question type is:
QUESTION_TYPE: ${questionType}

The previous question type was:
PREVIOUS_QUESTION_TYPE: ${prevQuestionType || "none"}

Do not reuse the previous question type.`}

Response rules:
1. Maximum 120 words.
2. Calm, grounded, non-clinical tone.
3. No dashes.
4. Emotional layering must feel natural, not formulaic.
5. Do not explicitly label "protective emotion" unless absolutely necessary.
6. Avoid repetitive sentence rhythm.
7. Avoid therapy-manual phrasing.
8. Use concrete language drawn from the user's message.
9. ${noQuestionMode ? "Do not include a question. End with a statement." : "Maintain exactly one question."}
10. ${noQuestionMode ? "End every response with a statement, never a question mark." : `Ask exactly 1 question of type "${questionType}".`}

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

${!noQuestionMode ? `Question type guidance:

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
Ask what would feel different next time.` : ""}

${bucket === "Crisis" ? "CRISIS: Gently acknowledge. Encourage reaching out to someone trusted or a helpline. Brief and warm." : ""}

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
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
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

  const paragraphs = text.split(/\n\n+/).filter(s => s.trim());
  if (paragraphs.length > 4) failures.push(`Too many parts: ${paragraphs.length}`);

  return { passed: failures.length === 0, failures };
}

/* ── Simple similarity check ── */
function contentSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
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
  messageId?: string
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

      const validTypes = ["preference", "recurring_theme", "trigger", "coping_pattern", "relationship_context", "goal", "boundary"];
      if (!validTypes.includes(item.memory_type)) continue;

      const safetyLevel = item.safety_level === "crisis_related" ? "crisis_related" : item.safety_level === "sensitive" ? "sensitive" : "normal";

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
        await supabase
          .from("mend_memory_evidence")
          .insert({
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
    const { messages, companion_mode, user_state, memory_moment, last_formulation_style, last_question_type } = await req.json();

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
        const { data: { user } } = await createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!
        ).auth.getUser(token);

        if (user) {
          userId = user.id;
          
          // Fetch conversation state and memory pack in parallel
          const [stateResult, packResult] = await Promise.all([
            supabase
              .from("conversation_state")
              .select("summary")
              .eq("user_id", user.id)
              .maybeSingle(),
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

    // ── Pass A: Generate draft (non-streaming) ──
    const draftPrompt = buildDraftPrompt(mode, bucket, user_state || null, conversationSummary, memoryPack, memory_moment);
    const draftResponse = await callAI(LOVABLE_API_KEY, draftPrompt, messages);

    console.log("[mend_chat] Pass A draft generated, length:", draftResponse.length);

    // ── Pass B: Premium rewrite (streaming) ──
    const { prompt: rewritePrompt, formulationStyle, questionType } = buildRewritePrompt(mode, bucket, last_formulation_style, last_question_type);
    const rewriteMessages = [
      ...messages,
      { role: "assistant", content: draftResponse },
      { role: "user", content: "Now rewrite this draft into the final premium response. Output ONLY the rewritten response." },
    ];

    const streamResponse = await streamAI(LOVABLE_API_KEY, rewritePrompt, rewriteMessages);

    if (!streamResponse.ok) {
      if (streamResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "I need a moment to catch my breath. Please try again in a few seconds." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (streamResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "The AI companion service needs attention. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await streamResponse.text();
      console.error("AI gateway error (Pass B):", streamResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Something went wrong. Let's try again in a moment." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validate + Debug log ──
    const validation = validatePremiumConstraints(draftResponse);
    console.log("[mend_chat]", JSON.stringify({
      experience_mode: mode,
      communication_bucket: bucket,
      premium_constraints_satisfied: validation.passed,
      memory_pack_injected: !!memoryPack,
      ...(validation.failures.length ? { constraint_failures: validation.failures } : {}),
    }));

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
              recentMsg?.id
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
                await supabase
                  .from("conversation_state")
                  .upsert({
                    user_id: userId,
                    summary: snapshot.summary || "",
                    themes: snapshot.themes || [],
                    last_updated: new Date().toISOString(),
                  }, { onConflict: "user_id" });
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
          const { data: { user } } = await createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!
          ).auth.getUser(token);

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
            await supabase
              .from("conversation_state")
              .upsert({
                user_id: user.id,
                summary: snapshot.summary || "",
                themes: snapshot.themes || [],
                last_updated: new Date().toISOString(),
              }, { onConflict: "user_id" });
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
        "X-Formulation-Style": formulationStyle,
        "X-Question-Type": questionType,
      },
    });
  } catch (e) {
    console.error("mend_chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
