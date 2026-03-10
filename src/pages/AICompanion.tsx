import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Heart, Cloud, Moon, Lock, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { usePatternSignals } from "@/hooks/usePatternSignals";
import { useUserPhase } from "@/hooks/useUserPhase";
import { getCompanionWelcomeText } from "@/lib/phaseCopy";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTimeDivider } from "@/lib/conversationDividers";
import { useReflectionBubble } from "@/hooks/useReflectionBubble";
import { ReflectionBubble } from "@/components/chat/ReflectionBubble";
import { useCompanionMode } from "@/hooks/useCompanionMode";
import { ModeSelector } from "@/components/chat/ModeSelector";
import { computeUserState, buildDynamicPrompts } from "@/lib/userState";

const ICON_MAP = {
  sparkles: Sparkles,
  cloud: Cloud,
  moon: Moon,
  heart: Heart,
} as const;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
}

export default function AICompanion() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: signalsData } = usePatternSignals();
  const phase = useUserPhase(signalsData?.signals);
  const { mode, setMode } = useCompanionMode(user?.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
  const [reflectionAttachedTo, setReflectionAttachedTo] = useState<string | null>(null);
  const [memoryMomentUsed, setMemoryMomentUsed] = useState(false);
  const [pendingMemoryMoment, setPendingMemoryMoment] = useState<string | null>(null);
  const [lastFormulationStyle, setLastFormulationStyle] = useState<string | null>(null);
  const [lastQuestionType, setLastQuestionType] = useState<string | null>(null);

  const { reflectionMessage, evaluate: evaluateReflection, reset: resetReflection, suppressToday } = useReflectionBubble(user?.id);

  // Compute user state from signals
  const userState = useMemo(() => {
    return computeUserState(signalsData?.signals || []);
  }, [signalsData?.signals]);

  // Dynamic gentle prompts
  const dynamicPrompts = useMemo(() => {
    if (!isAuthenticated || !userState) {
      return [
        { label: "Reflect on today", icon: "sparkles" as const },
        { label: "Something that's been sitting with me", icon: "cloud" as const },
        { label: "I feel unsettled and don't know why", icon: "moon" as const },
        { label: "I just need to say this out loud", icon: "heart" as const },
      ];
    }
    return buildDynamicPrompts(userState);
  }, [isAuthenticated, userState]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 120;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsNearBottom(nearBottom);
  }, []);

  useEffect(() => {
    if (!isFetchingHistory && messages.length > 0 && !hasInitiallyScrolled) {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
        setHasInitiallyScrolled(true);
      });
    }
  }, [isFetchingHistory, messages.length, hasInitiallyScrolled, scrollToBottom]);

  useEffect(() => {
    if (hasInitiallyScrolled && isNearBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, hasInitiallyScrolled, isNearBottom, scrollToBottom]);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!isAuthenticated || !user?.id) {
        setIsFetchingHistory(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("mend_messages")
          .select("id, role, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching chat history:", error);
          toast.error("Couldn't load your previous conversations");
        } else if (data && data.length > 0) {
          setMessages(data.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            created_at: msg.created_at,
          })));
        }
      } catch (err) {
        console.error("Error fetching chat history:", err);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    fetchChatHistory();
  }, [isAuthenticated, user?.id]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isDisabled || isLoading) return;

    const trimmedContent = content.trim();
    
    if (!isAuthenticated) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmedContent,
      };

      setMessages(prev => [...prev, userMessage]);
      setMessage("");
      setIsLoading(true);
      setIsDisabled(true);

      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      let assistantContent = "";
      const assistantId = `assistant-${Date.now()}`;

      try {
        await streamChat({
          messages: apiMessages,
          companionMode: mode,
          lastFormulationStyle,
          lastQuestionType,
          onDelta: (chunk) => {
            assistantContent += chunk;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.id === assistantId) {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
            });
          },
          onDone: (result) => {
            console.log("[MEND turn]", { experience_mode: mode, communication_bucket: result.communicationBucket });
            if (result.formulationStyle) setLastFormulationStyle(result.formulationStyle);
            if (result.questionType) setLastQuestionType(result.questionType);
            setIsLoading(false);
            setTimeout(() => setShowRedirectMessage(true), 800);
          },
          onError: (error) => {
            toast.error(error);
            setIsLoading(false);
          },
        });
      } catch (error) {
        console.error("Error getting response:", error);
        toast.error("Something went wrong. Please try again.");
        setIsLoading(false);
      }
      return;
    }

    // Authenticated flow
    setMessage("");
    setIsLoading(true);

    try {
      // Check for memory moment (once per session)
      let memoryMoment: string | undefined;
      if (!memoryMomentUsed) {
        try {
          const { data: highConfMemories } = await supabase
            .from("mend_user_memory")
            .select("content, memory_type, evidence_count, confidence, safety_level")
            .eq("user_id", user!.id)
            .eq("status", "active")
            .eq("memory_type", "recurring_theme")
            .gt("evidence_count", 3)
            .gt("confidence", 0.7)
            .neq("safety_level", "crisis_related")
            .order("evidence_count", { ascending: false })
            .limit(1);

          if (highConfMemories && highConfMemories.length > 0) {
            memoryMoment = highConfMemories[0].content;
            setMemoryMomentUsed(true);
            setPendingMemoryMoment(memoryMoment);
          }
        } catch (e) {
          console.error("Memory moment check failed:", e);
        }
      }

      const { data: userMsgData, error: userMsgError } = await supabase
        .from("mend_messages")
        .insert({
          user_id: user!.id,
          role: "user",
          content: trimmedContent,
          experience_mode: mode,
        })
        .select()
        .single();

      if (userMsgError) {
        throw new Error("Failed to save your message");
      }

      const userMessage: ChatMessage = {
        id: userMsgData.id,
        role: "user",
        content: trimmedContent,
      };

      setMessages(prev => [...prev, userMessage]);

      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      let assistantContent = "";
      const tempAssistantId = `temp-assistant-${Date.now()}`;

      await streamChat({
        messages: apiMessages,
        companionMode: mode,
        userState: userState || undefined,
        memoryMoment: memoryMoment,
        lastFormulationStyle,
        lastQuestionType,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.id === tempAssistantId) {
              return prev.map((m, i) => 
                i === prev.length - 1 ? { ...m, content: assistantContent } : m
              );
            }
            return [...prev, { id: tempAssistantId, role: "assistant", content: assistantContent }];
          });
        },
        onDone: async (result) => {
          console.log("[MEND turn]", { experience_mode: mode, communication_bucket: result.communicationBucket });
          if (result.formulationStyle) setLastFormulationStyle(result.formulationStyle);
          if (result.questionType) setLastQuestionType(result.questionType);

          const { data: assistantMsgData, error: assistantMsgError } = await supabase
            .from("mend_messages")
            .insert({
              user_id: user!.id,
              role: "assistant",
              content: assistantContent,
              experience_mode: mode,
              communication_bucket: result.communicationBucket,
            })
            .select()
            .single();

          if (assistantMsgError) {
            console.error("Failed to save assistant message:", assistantMsgError);
          } else {
            setMessages(prev => prev.map(m => 
              m.id === tempAssistantId ? { ...m, id: assistantMsgData.id } : m
            ));
          }

          try {
            await supabase.functions.invoke("extract_signals", {
              body: {
                user_id: user!.id,
                message_id: userMsgData.id,
                content: trimmedContent,
                source_type: "companion_chat",
                source_id: userMsgData.id,
              },
            });
          } catch (signalError) {
            console.error("Signal extraction failed:", signalError);
          }

          setIsLoading(false);

          const currentIndex = messages.length + 2;
          evaluateReflection(
            [...messages, userMessage, { role: "assistant", content: assistantContent }].map(m => ({ role: m.role, content: m.content })),
            currentIndex
          ).then(() => {
            setReflectionAttachedTo(assistantMsgData?.id || tempAssistantId);
          });
        },
        onError: (error) => {
          toast.error(error);
          setIsLoading(false);
        },
      });
    } catch (error) {
      console.error("Error in chat flow:", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setIsLoading(false);
    }
  }, [isAuthenticated, isDisabled, isLoading, messages, user, mode, userState, evaluateReflection]);

  const handleClearConversation = useCallback(async () => {
    if (messages.length === 0 || isLoading) return;

    if (isAuthenticated && user?.id) {
      try {
        const { error } = await supabase
          .from("mend_messages")
          .delete()
          .eq("user_id", user.id);

        if (error) {
          console.error("Error clearing messages:", error);
          toast.error("Couldn't clear conversation");
          return;
        }
      } catch (err) {
        console.error("Error clearing conversation:", err);
        toast.error("Something went wrong");
        return;
      }
    }

    setMessages([]);
    setIsDisabled(false);
    setShowRedirectMessage(false);
    resetReflection();
    setReflectionAttachedTo(null);
    toast.success("Conversation cleared");
  }, [isAuthenticated, isLoading, messages.length, user?.id, resetReflection]);

  const handlePromptClick = (prompt: string) => {
    if (!isDisabled && !isLoading) {
      setMessage(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(message);
    }
  };

  const getWelcomeMessage = () => {
    return getCompanionWelcomeText(phase, isAuthenticated);
  };

  const timeDividers = useMemo(() => {
    const dividers = new Map<string, string>();
    for (let i = 1; i < messages.length; i++) {
      const label = getTimeDivider(
        messages[i - 1].created_at ?? null,
        messages[i].created_at ?? null
      );
      if (label) dividers.set(messages[i].id, label);
    }
    return dividers;
  }, [messages]);

  return (
  <Layout hideFooter fullScreen>
      <div className="h-full min-h-0 flex flex-col">
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent className="max-w-sm rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Start fresh?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will clear your conversation history. Your patterns and insights will remain.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-xl">Keep talking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearConversation}
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear conversation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Main Chat Area — fully centered */}
        <div className="flex-1 flex flex-col min-h-0">
          <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 px-4 py-6 pb-12 lg:px-8 lg:py-10 lg:pb-16 overflow-y-auto relative">
            {isFetchingHistory ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-sm text-muted-foreground mt-3">Loading your conversations...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-20 h-20 rounded-2xl gradient-lilac flex items-center justify-center mb-6 shadow-soft"
                >
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-serif font-medium text-foreground mb-3"
                >
                  {isAuthenticated ? "Welcome back." : "Hi, I'm here for you"}
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-muted-foreground mb-6 leading-relaxed"
                >
                  {getWelcomeMessage()}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Ready to listen</span>
                </motion.div>
              </div>
            ) : (
              <div className="max-w-[720px] mx-auto space-y-6">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <div key={msg.id}>
                      {timeDividers.has(msg.id) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-3 py-3"
                        >
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-xs text-muted-foreground/60 font-medium italic">
                            {timeDividers.get(msg.id)}
                          </span>
                          <div className="flex-1 h-px bg-border/50" />
                        </motion.div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card shadow-soft border border-border rounded-bl-md"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg gradient-lilac flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-primary-foreground" />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">MEND</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </motion.div>
                      {reflectionMessage && reflectionAttachedTo === msg.id && msg.role === "assistant" && (
                        <div className="mt-1.5">
                          <ReflectionBubble message={reflectionMessage} onSuppressToday={suppressToday} />
                        </div>
                      )}
                    </div>
                  ))}
                </AnimatePresence>

                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex justify-start"
                    >
                      <div className="bg-card shadow-soft border border-border rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg gradient-lilac flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-primary-foreground" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">MEND</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-lilac-300 animate-pulse" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-sm text-muted-foreground">MEND is thinking…</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showRedirectMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-center"
                    >
                      <div className="bg-card shadow-soft border border-border rounded-2xl px-6 py-5 max-w-sm text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                          If you'd like me to remember this and continue, create a free account.
                        </p>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => navigate("/signup")}
                            className="w-full gradient-lilac text-primary-foreground border-0"
                          >
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate("/signup")}
                            className="w-full"
                          >
                            Sign up with email
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>
            )}

            <AnimatePresence>
              {!isNearBottom && messages.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => scrollToBottom("smooth")}
                  className="sticky bottom-4 left-1/2 -translate-x-1/2 mx-auto flex items-center gap-1.5 px-4 py-2 bg-card/90 backdrop-blur-sm border border-border rounded-full shadow-soft text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Jump to latest
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Message Input Area */}
          <div className="pt-6 px-4 pb-4 lg:pt-8 lg:px-6 lg:pb-6 border-t border-border/30 bg-card/20">
            <div className="max-w-[720px] mx-auto">
              {/* Gentle Prompts — horizontal chips */}
              {!isDisabled && (
                <div className="mb-3">
                  <p className="text-[0.8rem] font-medium text-muted-foreground/60 mb-3">Not sure where to begin?</p>
                  <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                    {dynamicPrompts.map((prompt, index) => {
                      const IconComponent = ICON_MAP[prompt.icon];
                      return (
                        <motion.button
                          key={prompt.label}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          onClick={() => handlePromptClick(prompt.label)}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-5 py-2.5 bg-muted/40 hover:bg-muted/70 rounded-2xl whitespace-nowrap text-xs text-muted-foreground/80 hover:text-foreground transition-all duration-200 hover:-translate-y-px hover:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.12)] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <IconComponent className="w-3 h-3 text-lilac-300" />
                          <span>{prompt.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New conversation + Mode selector row */}
              <div className="flex items-center justify-between mb-3">
                {isAuthenticated && (
                  <ModeSelector mode={mode} onModeChange={setMode} />
                )}
                <AnimatePresence>
                  {messages.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowClearDialog(true)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors ml-auto disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>New</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isDisabled ? "Sign up to continue..." : "How are you feeling today?"}
                    disabled={isDisabled || isLoading}
                    className={`w-full min-h-[52px] max-h-32 px-4 py-3 bg-muted rounded-xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground transition-opacity ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    rows={1}
                  />
                </div>
                <Button 
                  size="lg" 
                  className="gradient-lilac text-primary-foreground border-0 shadow-soft hover:shadow-hover transition-all h-[52px] px-6"
                  disabled={!message.trim() || isDisabled || isLoading}
                  onClick={() => handleSendMessage(message)}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                MEND provides emotional support, not medical advice.
              </p>

              <AnimatePresence>
                {isDisabled && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-center text-muted-foreground mt-3"
                  >
                    Sign up or log in to continue chatting with MEND.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
