import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AMBIENT_LINES,
  ACKNOWLEDGMENT,
  AMBIENT_TIMING,
} from "@/lib/journalGuardrails";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { extractSignal } from "@/lib/extractSignal";
import { JournalEntryTile } from "@/components/journal/JournalEntryTile";
import { JournalEntryModal } from "@/components/journal/JournalEntryModal";

const prompts = [
  "What's been weighing on you?",
  "Something you're avoiding",
  "A moment that stayed with you",
  "One thing you handled better than before",
  "Something you wish you'd said",
];

type JournalEntry = { id: string; content: string; created_at: string; prompt: string | null };

export default function Journal() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [showAmbient, setShowAmbient] = useState(false);
  const [showAcknowledgment, setShowAcknowledgment] = useState(false);
  const [ambientLine] = useState(() => AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingStartRef = useRef<number | null>(null);
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("journal_entries")
      .select("id, content, created_at, prompt")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setEntries(data);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const activateEditor = useCallback((prompt?: string) => {
    setIsEditing(true);
    setShowAcknowledgment(false);
    if (prompt) {
      setSelectedPrompt(prompt);
      setContent(prompt + "\n\n");
    }
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  // Track typing duration for ambient guidance
  useEffect(() => {
    if (!isEditing || !content.trim()) {
      typingStartRef.current = null;
      setShowAmbient(false);
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      return;
    }

    if (!typingStartRef.current) {
      typingStartRef.current = Date.now();
    }

    // Show ambient after ~17 seconds of writing
    if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    ambientTimerRef.current = setTimeout(() => {
      if (typingStartRef.current && Date.now() - typingStartRef.current > AMBIENT_TIMING.delayMs) {
        setShowAmbient(true);
        ambientDismissRef.current = setTimeout(() => setShowAmbient(false), AMBIENT_TIMING.dismissMs);
      }
    }, AMBIENT_TIMING.delayMs - (Date.now() - (typingStartRef.current || Date.now())));

    return () => {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      if (ambientDismissRef.current) clearTimeout(ambientDismissRef.current);
    };
  }, [content, isEditing]);

  const handleBlur = useCallback(async () => {
    if (!content.trim()) {
      setIsEditing(false);
      setSelectedPrompt(null);
      return;
    }
    // Save entry
    if (user) {
      const { data: entryData } = await supabase.from("journal_entries").insert({
        user_id: user.id,
        content: content.trim(),
        prompt: selectedPrompt,
      }).select("id").single();

      // Background signal extraction
      if (entryData) {
        extractSignal({
          userId: user.id,
          content: content.trim(),
          sourceType: "journal_entry",
          sourceId: entryData.id,
        });
      }
    }
    // Show acknowledgment, then reset
    setShowAcknowledgment(true);
    setShowAmbient(false);
    setTimeout(() => {
      setShowAcknowledgment(false);
      setIsEditing(false);
      setContent("");
      setSelectedPrompt(null);
      typingStartRef.current = null;
      fetchEntries();
    }, ACKNOWLEDGMENT.displayDuration);
  }, [content, user, selectedPrompt, fetchEntries]);

  const hasContent = content.trim().length > 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-serif text-foreground mb-2">Journal</h1>
          <p className="text-muted-foreground/70">
            A place to put things down, without needing a response.
          </p>
        </motion.div>

        {/* Editor / Idle Container */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Card
            className={`border-border/40 bg-card/50 backdrop-blur-sm shadow-soft transition-all duration-500 ${
              !isEditing ? "cursor-pointer hover:shadow-hover hover:border-border/60" : ""
            }`}
            onClick={!isEditing ? () => activateEditor() : undefined}
          >
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                {!isEditing && !showAcknowledgment ? (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    className="text-center"
                  >
                    <p className="text-foreground/60 font-medium mb-1">
                      Start writing whenever you're ready
                    </p>
                    <p className="text-sm text-muted-foreground/50">
                      No structure. No right way to do this.
                    </p>
                  </motion.div>
                ) : showAcknowledgment ? (
                  <motion.div
                    key="ack"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.6 } }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-6"
                  >
                    <p className="text-foreground/70 font-medium mb-1.5">
                      {ACKNOWLEDGMENT.primary}
                    </p>
                    <p className="text-sm text-muted-foreground/50">
                      {ACKNOWLEDGMENT.secondary}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <Textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Write here…"
                      className="min-h-[180px] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground/80 placeholder:text-muted-foreground/30 text-base leading-relaxed p-0"
                    />
                    {/* Ambient guidance */}
                    <AnimatePresence>
                      {showAmbient && (
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 0.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8 }}
                          className="text-xs text-muted-foreground mt-4"
                        >
                          {ambientLine}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Prompt Chips — only in idle state */}
        <AnimatePresence>
          {!isEditing && !showAcknowledgment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-12"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary/50" />
                <span className="text-xs text-muted-foreground/50">or try a prompt</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {prompts.map((prompt, index) => (
                  <motion.button
                    key={prompt}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      activateEditor(prompt);
                    }}
                    className={`px-4 py-2 text-sm rounded-full border transition-all duration-200 ${
                      selectedPrompt === prompt
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/30 border-border/40 text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground/80"
                    }`}
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Entries Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <p className="text-[11px] text-muted-foreground/40 tracking-wide mb-4 text-center">
            recent entries
          </p>

          <AnimatePresence mode="wait">
            {entries.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="border-border/30 bg-muted/20 shadow-none">
                  <CardContent className="p-10 text-center">
                    <p className="text-foreground/70 font-medium mb-2">
                      This space stays quiet until you use it.
                    </p>
                    <p className="text-sm text-muted-foreground/50">
                      You don't need to write often. Just when it helps.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {entries.map((entry, index) => (
                  <JournalEntryTile
                    key={entry.id}
                    entry={entry}
                    index={index}
                    onClick={() => setViewEntry(entry)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <JournalEntryModal
          entry={viewEntry}
          open={!!viewEntry}
          onOpenChange={(open) => { if (!open) setViewEntry(null); }}
        />
      </div>
    </Layout>
  );
}
