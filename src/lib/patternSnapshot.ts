/**
 * PatternSnapshot — lightweight frontend computation layer.
 * Pulls from mend_signals (last 14 days) and computes aggregate metrics
 * for Brain Activity visualization and insight cards.
 * Session-cached so Patterns loads instantly after first compute.
 */

import { supabase } from "@/integrations/supabase/client";

export type BaselineState = "calm" | "elevated" | "fluctuating" | "high";

export interface PatternSnapshot {
  avgIntensity: number;
  volatility: number;
  dominantThemes: string[];
  baselineState: BaselineState;
  signalCount: number;
  recentWeekCount: number;
  priorWeekCount: number;
  computedAt: number;
}

// Map text intensity values to numeric
const intensityMap: Record<string, number> = {
  low: 1,
  mild: 1.5,
  moderate: 2.5,
  medium: 2.5,
  high: 3.5,
  intense: 4,
  extreme: 5,
};

function intensityToNumber(raw: string): number | null {
  const n = intensityMap[raw.toLowerCase().trim()];
  if (n !== undefined) return n;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? null : parsed;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(mean(squaredDiffs));
}

function computeBaselineState(avgIntensity: number, volatility: number): BaselineState {
  if (volatility >= 1.1) return "fluctuating";
  if (avgIntensity <= 2.2) return "calm";
  if (avgIntensity <= 3.5) return "elevated";
  return "high";
}

// Friendly theme labels for display
const themeLabels: Record<string, string> = {
  relationships: "relationships",
  relationship: "relationships",
  self: "self-reflection",
  self_worth: "self-worth",
  routine: "daily rhythm",
  daily: "daily rhythm",
  sleep: "rest",
  work: "work",
  family: "family",
  health: "well-being",
  future: "the future",
  past: "the past",
  loss: "loss",
  change: "change",
  uncertainty: "uncertainty",
  safety: "feeling safe",
};

export function getThemeLabel(theme: string): string {
  return themeLabels[theme.toLowerCase().trim()] || theme;
}

// Session cache
let cachedSnapshot: PatternSnapshot | null = null;
let cachedUserId: string | null = null;

export function clearSnapshotCache() {
  cachedSnapshot = null;
  cachedUserId = null;
}

export type DateRangeValue = "7" | "30" | "all";

export async function computePatternSnapshot(userId: string, range: DateRangeValue = "30"): Promise<PatternSnapshot> {
  // Return cached if same user, same range, and computed within last 5 minutes
  const cacheKey = `${userId}_${range}`;
  if (
    cachedSnapshot &&
    cachedUserId === cacheKey &&
    Date.now() - cachedSnapshot.computedAt < 5 * 60 * 1000
  ) {
    return cachedSnapshot;
  }

  let query = supabase
    .from("mend_signals")
    .select("intensity, context, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (range !== "all") {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(range));
    query = query.gte("created_at", daysAgo.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  const signals = data || [];

  // Numeric intensities (ignore nulls)
  const numericIntensities = signals
    .map((s) => intensityToNumber(s.intensity))
    .filter((n): n is number => n !== null);

  const avgIntensity = mean(numericIntensities);
  const volatility = stdDev(numericIntensities);

  // Dominant themes by frequency
  const themeFreq = new Map<string, number>();
  for (const s of signals) {
    const t = s.context.toLowerCase().trim();
    themeFreq.set(t, (themeFreq.get(t) || 0) + 1);
  }
  const dominantThemes = [...themeFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);

  // Weekly split for stabilizer insight
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentWeekCount = signals.filter(
    (s) => s.created_at && new Date(s.created_at) >= sevenDaysAgo
  ).length;
  const priorWeekCount = signals.length - recentWeekCount;

  const baselineState = computeBaselineState(avgIntensity, volatility);

  const snapshot: PatternSnapshot = {
    avgIntensity,
    volatility,
    dominantThemes,
    baselineState,
    signalCount: signals.length,
    recentWeekCount,
    priorWeekCount,
    computedAt: Date.now(),
  };

  cachedSnapshot = snapshot;
  cachedUserId = userId;

  return snapshot;
}
