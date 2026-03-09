import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Heart, Sparkles, MessageCircle, Clock, Loader2, Lightbulb, Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { usePatternSignals, PatternCard as PatternCardType, MoodTimelineEntry } from "@/hooks/usePatternSignals";
import { useUserPhase } from "@/hooks/useUserPhase";
import { getPatternsEmptyHeading, getPatternsEmptyBody, getStartConversationCTA, getAddCheckInCTA } from "@/lib/phaseCopy";
import { MoodTimeline } from "@/components/patterns/MoodTimeline";
import { BrainVisualization } from "@/components/patterns/BrainVisualization";
import { InsightCards } from "@/components/patterns/InsightCards";
import { DateRangeSelector, type DateRange } from "@/components/patterns/DateRangeSelector";
import { computePatternSnapshot, type PatternSnapshot } from "@/lib/patternSnapshot";
import { useAuth } from "@/hooks/useAuth";

const patternIcons: Record<string, typeof Heart> = {
  emotion: Heart,
  time: Clock,
  context: Lightbulb,
  weekly: Calendar,
};

const patternPriority: Record<string, number> = {
  emotion: 0,
  time: 1,
  context: 2,
  weekly: 3,
};

function getStatusPill(signalCount: number): { label: string; className: string } {
  if (signalCount >= 16) return { label: "Steady", className: "bg-mint-100/80 text-mint-500" };
  if (signalCount >= 8) return { label: "Emerging", className: "bg-lilac-100/80 text-lilac-600" };
  if (signalCount >= 3) return { label: "Forming", className: "bg-peach-100/70 text-peach-400" };
  return { label: "Listening", className: "bg-muted/60 text-muted-foreground" };
}

function StatusPill({ signalCount }: { signalCount: number }) {
  const { label, className } = getStatusPill(signalCount);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide ${className}`}>
      {label}
    </span>
  );
}

function InsightCard({ pattern, index, isEmotion, isLocked }: { pattern: PatternCardType; index: number; isEmotion: boolean; isLocked: boolean }) {
  const Icon = patternIcons[pattern.type] || Sparkles;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={!isLocked ? { y: -2, scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } } : undefined}
      whileTap={!isLocked ? { scale: 0.995 } : undefined}
      className={`rounded-2xl p-4 shadow-card cursor-default transition-shadow duration-200 ${
        isLocked
          ? "bg-muted/30 border border-border/30"
          : isEmotion
          ? "bg-gradient-to-br from-card to-lilac-50/30 border border-lilac-100/50 hover:shadow-hover"
          : "bg-card hover:shadow-hover"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isLocked ? "bg-muted/40" : isEmotion ? "bg-lilac-100/70" : "bg-muted/50"}`}>
          <Icon className={`w-3.5 h-3.5 ${isLocked ? "text-muted-foreground/40" : isEmotion ? "text-lilac-600" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[14px] font-serif font-semibold mb-1 ${isLocked ? "text-muted-foreground/60" : "text-foreground"}`}>
            {pattern.title}
          </h3>
          {isLocked ? (
            <>
              <p className="text-[13px] text-muted-foreground/30 leading-snug blur-[3px] select-none" aria-hidden>A gentle pattern is forming here...</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1.5 italic">This insight unlocks as your story grows.</p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-foreground/75 leading-snug">{pattern.body}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1.5">Based on recent reflections</p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ heading, body, ctaText }: { heading: string; body: string; ctaText: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-2xl p-8 shadow-card text-center max-w-md mx-auto"
    >
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lilac-100 to-mint-100 flex items-center justify-center mx-auto mb-5">
        <Heart className="w-7 h-7 text-lilac-600" />
      </div>
      <h2 className="text-xl font-serif font-medium text-foreground mb-2">{heading}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{body}</p>
      <Link to="/companion">
        <Button className="gradient-lilac text-primary-foreground border-0 shadow-soft hover:shadow-hover transition-all">{ctaText}</Button>
      </Link>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-lilac-600" />
      <p className="text-sm text-muted-foreground">Loading your patterns...</p>
    </div>
  );
}

function MobileCarousel({ patterns }: { patterns: (PatternCardType & { isLocked: boolean })[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -50 && currentIndex < patterns.length - 1) setCurrentIndex(currentIndex + 1);
    else if (info.offset.x > 50 && currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div className="relative overflow-hidden -mx-4 px-4">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="cursor-grab active:cursor-grabbing"
        >
          <InsightCard pattern={patterns[currentIndex]} index={0} isEmotion={patterns[currentIndex].type === "emotion"} isLocked={patterns[currentIndex].isLocked || false} />
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-center gap-2 mt-3">
        {patterns.map((_, index) => (
          <button key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 rounded-full transition-all duration-200 ${index === currentIndex ? "bg-primary w-5" : "bg-muted-foreground/30"}`} aria-label={`Go to card ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}

const lockedPlaceholders: PatternCardType[] = [
  { type: "context", title: "Themes that repeat", body: "" },
  { type: "weekly", title: "This week", body: "" },
];

function getDisplayPatterns(patterns: PatternCardType[], signalCount: number): (PatternCardType & { isLocked: boolean })[] {
  const sorted = [...patterns].sort((a, b) => (patternPriority[a.type] ?? 99) - (patternPriority[b.type] ?? 99));
  const display: (PatternCardType & { isLocked: boolean })[] = [];
  for (let i = 0; i < 2; i++) {
    if (sorted[i]) display.push({ ...sorted[i], isLocked: false });
  }
  if (sorted[2]) display.push({ ...sorted[2], isLocked: signalCount < 7 });
  else if (display.length >= 2) display.push({ ...lockedPlaceholders[0], isLocked: true });
  if (sorted[3]) display.push({ ...sorted[3], isLocked: signalCount < 12 });
  else if (display.length >= 3) display.push({ ...lockedPlaceholders[1], isLocked: true });
  return display.slice(0, 4);
}

function DynamicInsights({ patterns, moodTimeline, signalCount, ctaText }: { patterns: PatternCardType[]; moodTimeline: MoodTimelineEntry[]; signalCount: number; ctaText: string }) {
  const isMobile = useIsMobile();
  const displayPatterns = getDisplayPatterns(patterns, signalCount);
  const hasLockedCards = displayPatterns.some(p => p.isLocked);

  return (
    <>
      {isMobile ? (
        <MobileCarousel patterns={displayPatterns} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayPatterns.map((pattern, index) => (
            <InsightCard key={pattern.type + index} pattern={pattern} index={index} isEmotion={pattern.type === "emotion"} isLocked={pattern.isLocked} />
          ))}
        </div>
      )}
      {hasLockedCards && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="flex justify-center mt-4">
          <Link to="/companion">
            <Button variant="outline" size="sm" className="text-sm text-muted-foreground hover:text-foreground border-border/50 hover:border-border">
              <MessageCircle className="w-4 h-4 mr-2" />{ctaText}
            </Button>
          </Link>
        </motion.div>
      )}
      {moodTimeline.length >= 3 && <MoodTimeline entries={moodTimeline} />}
    </>
  );
}

/* ── Graph legend ────────────────────────────────── */
function GraphLegend() {
  const items = [
    { color: "bg-lilac-400", label: "Emotional states" },
    { color: "bg-mint-400", label: "Stabilizing moments" },
    { colorStyle: "hsl(250 12% 68%)", label: "Context signals" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color ?? ""}`}
            style={item.colorStyle ? { background: item.colorStyle } : undefined}
          />
          <span className="text-[11px] text-muted-foreground/70 leading-none">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────── */
export default function PatternsInsights() {
  const { data, isLoading } = usePatternSignals();
  const { user } = useAuth();
  const phase = useUserPhase(data?.signals);
  const [snapshot, setSnapshot] = useState<PatternSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("30");

  const signalCount = data?.signals?.length ?? 0;
  const hasEnoughData = signalCount >= 3;

  useEffect(() => {
    if (!user?.id) return;
    setSnapshotLoading(true);
    computePatternSnapshot(user.id)
      .then(setSnapshot)
      .catch(() => {})
      .finally(() => setSnapshotLoading(false));
  }, [user?.id, data?.signals]);

  const emptyHeading = getPatternsEmptyHeading(phase);
  const emptyBody = getPatternsEmptyBody(phase);
  const startCTA = getStartConversationCTA(phase);
  const checkInCTA = getAddCheckInCTA(phase);
  const snapshotHasData = snapshot && snapshot.signalCount >= 3;

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 max-w-3xl">

          {/* ── Header ─────────────────────────────── */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-[28px] font-serif font-semibold text-foreground leading-tight">
                Patterns & Insights
              </h1>
              <StatusPill signalCount={signalCount} />
            </div>
            <p className="text-sm text-muted-foreground/70 max-w-lg">
              MEND identifies emotional patterns from your reflections over time, gently surfacing what might otherwise go unnoticed.
            </p>
          </motion.header>

          {/* ── Content ────────────────────────────── */}
          {isLoading || snapshotLoading ? (
            <LoadingState />
          ) : !hasEnoughData ? (
            <div className="space-y-10 mt-2">
              {/* Hero graph — empty state */}
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                <div className="rounded-2xl bg-card/50 border border-border/30 shadow-card p-5 md:p-8">
                  <p className="text-center text-xs font-serif text-muted-foreground/60 mb-1">Emotional pattern map</p>
                  <p className="text-center text-[11px] text-muted-foreground/40 mb-5">
                    Signals that often appear together in your reflections
                  </p>
                  <div className="max-w-md mx-auto">
                    <BrainVisualization baselineState="calm" highlightCluster={0} isEmpty />
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground/45 mt-4 tracking-wide">
                    Your patterns will become clearer as you share more.
                  </p>
                  <GraphLegend />
                </div>
              </motion.section>
              <EmptyState heading={emptyHeading} body={emptyBody} ctaText={startCTA} />
            </div>
          ) : (
            <div className="space-y-12">

              {/* ── Hero Pattern Map ──────────────── */}
              {snapshotHasData && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Title bar with date range */}
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <h2 className="text-base font-serif font-semibold text-foreground leading-tight">
                        Emotional pattern map
                      </h2>
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        Signals that often appear together in your reflections
                      </p>
                    </div>
                    <DateRangeSelector value={dateRange} onChange={setDateRange} />
                  </div>

                  {/* Canvas card */}
                  <div className="rounded-2xl bg-card/50 border border-border/30 shadow-card p-4 md:p-6">
                    <BrainVisualization
                      baselineState={snapshot!.baselineState}
                      highlightCluster={0}
                    />
                    <GraphLegend />
                    <p className="text-center text-[11px] text-muted-foreground/40 mt-3 tracking-wide">
                      Reflecting your recent emotional rhythm
                    </p>
                  </div>
                </motion.section>
              )}

              {/* ── Snapshot Insight Cards ────────── */}
              {snapshotHasData && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.12 }}
                >
                  <InsightCards snapshot={snapshot!} />
                </motion.section>
              )}

              {/* ── What MEND is noticing ─────────── */}
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                  What MEND is noticing
                </h2>
                <DynamicInsights
                  patterns={data?.patterns || []}
                  moodTimeline={data?.moodTimeline || []}
                  signalCount={signalCount}
                  ctaText={checkInCTA}
                />
              </motion.section>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
