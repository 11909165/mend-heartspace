/**
 * useUnifiedSignals — fetches enriched mend_signals for the Patterns page.
 * Replaces static graph data with real user emotional signal nodes.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DateRange } from "@/components/patterns/DateRangeSelector";

export interface EnrichedSignal {
  id: string;
  primary_emotion: string;
  secondary_emotion: string | null;
  intensity: string;
  context: string;
  time_bucket: string;
  theme: string | null;
  trigger_signal: string | null;
  stabilizer: string | null;
  source_type: string;
  created_at: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  /** 0 = emotional state, 1 = stabilizer, 2 = context/theme/trigger */
  cluster: number;
  weight: number; // 0-1 normalized dominance
}

export interface GraphEdge {
  from: string;
  to: string;
  strength: number; // co-occurrence count
}

export interface SignalGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  signalCount: number;
}

// Friendly display labels
const emotionLabels: Record<string, string> = {
  anxious_like: "uneasy", anxiety: "uneasy", anxious: "uneasy",
  overwhelmed: "overwhelmed", heavy: "heaviness", sad: "heaviness",
  frustrated: "frustration", angry: "frustration",
  lonely: "loneliness", lost: "feeling lost", confused: "uncertainty",
  hopeful: "hope", calm: "calm", relieved: "relief",
  grateful: "gratitude", happy: "lightness", joyful: "lightness",
  content: "ease", tired: "fatigue", exhausted: "fatigue",
  numb: "distance", stressed: "tension", worried: "worry",
  guilty: "guilt", ashamed: "shame", insecure: "insecurity",
  hurt: "hurt", motivated: "motivation", excited: "excitement",
  distressed: "distress",
};

function getEmotionNodeLabel(emotion: string): string {
  return emotionLabels[emotion.toLowerCase().trim()] || emotion;
}

function buildGraph(signals: EnrichedSignal[]): SignalGraph {
  if (signals.length < 1) return { nodes: [], edges: [], signalCount: 0 };

  // Count frequencies for node weight
  const emotionFreq = new Map<string, number>();
  const stabilizerFreq = new Map<string, number>();
  const contextFreq = new Map<string, number>();
  const coOccurrence = new Map<string, number>(); // "nodeA||nodeB" -> count

  for (const s of signals) {
    const emotionKey = getEmotionNodeLabel(s.primary_emotion);
    emotionFreq.set(emotionKey, (emotionFreq.get(emotionKey) || 0) + 1);

    // Intensity multiplier
    const intensityMult = s.intensity === "high" ? 1.5 : s.intensity === "low" ? 0.7 : 1;
    emotionFreq.set(emotionKey, (emotionFreq.get(emotionKey) || 1) * intensityMult);

    // Context
    const ctx = s.context?.toLowerCase().trim();
    if (ctx && ctx !== "other") {
      contextFreq.set(ctx, (contextFreq.get(ctx) || 0) + 1);
      addCoOccurrence(coOccurrence, `e:${emotionKey}`, `c:${ctx}`);
    }

    // Theme (richer than context)
    if (s.theme) {
      const t = s.theme.toLowerCase().trim();
      contextFreq.set(t, (contextFreq.get(t) || 0) + 1);
      addCoOccurrence(coOccurrence, `e:${emotionKey}`, `c:${t}`);
    }

    // Trigger
    if (s.trigger_signal) {
      const tr = s.trigger_signal.toLowerCase().trim();
      contextFreq.set(tr, (contextFreq.get(tr) || 0) + 1);
      addCoOccurrence(coOccurrence, `e:${emotionKey}`, `c:${tr}`);
    }

    // Stabilizer
    if (s.stabilizer) {
      const st = s.stabilizer.toLowerCase().trim();
      stabilizerFreq.set(st, (stabilizerFreq.get(st) || 0) + 1);
      addCoOccurrence(coOccurrence, `e:${emotionKey}`, `s:${st}`);
    }

    // Secondary emotion co-occurrence
    if (s.secondary_emotion) {
      const secKey = getEmotionNodeLabel(s.secondary_emotion);
      emotionFreq.set(secKey, (emotionFreq.get(secKey) || 0) + 0.5);
      addCoOccurrence(coOccurrence, `e:${emotionKey}`, `e:${secKey}`);
    }
  }

  // Build nodes with normalized weights
  const nodes: GraphNode[] = [];
  const maxFreq = Math.max(
    ...Array.from(emotionFreq.values()),
    ...Array.from(stabilizerFreq.values()),
    ...Array.from(contextFreq.values()),
    1
  );

  // Top emotions (max 8)
  const topEmotions = [...emotionFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  for (const [label, freq] of topEmotions) {
    nodes.push({ id: `e:${label}`, label, cluster: 0, weight: freq / maxFreq });
  }

  // Top stabilizers (max 4)
  const topStabilizers = [...stabilizerFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  for (const [label, freq] of topStabilizers) {
    nodes.push({ id: `s:${label}`, label, cluster: 1, weight: freq / maxFreq });
  }

  // Top context/theme/triggers (max 6)
  const topContext = [...contextFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  for (const [label, freq] of topContext) {
    nodes.push({ id: `c:${label}`, label, cluster: 2, weight: freq / maxFreq });
  }

  // Build edges from co-occurrence
  const edges: GraphEdge[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const [key, count] of coOccurrence) {
    const [from, to] = key.split("||");
    if (nodeIds.has(from) && nodeIds.has(to) && count >= 1) {
      edges.push({ from, to, strength: count });
    }
  }

  return { nodes, edges, signalCount: signals.length };
}

function addCoOccurrence(map: Map<string, number>, a: string, b: string) {
  const key = a < b ? `${a}||${b}` : `${b}||${a}`;
  map.set(key, (map.get(key) || 0) + 1);
}

export function useUnifiedSignals(dateRange: DateRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unified-signals", user?.id, dateRange],
    queryFn: async (): Promise<SignalGraph> => {
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("mend_signals")
        .select("id, primary_emotion, secondary_emotion, intensity, context, time_bucket, theme, trigger_signal, stabilizer, source_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dateRange !== "all") {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(dateRange));
        query = query.gte("created_at", daysAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return buildGraph((data || []) as unknown as EnrichedSignal[]);
    },
    enabled: !!user,
  });
}
