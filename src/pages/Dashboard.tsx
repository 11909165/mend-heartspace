import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sun,
  MessageCircle,
  TrendingUp,
  Clock,
  Flame,
  ArrowRight,
  Sparkles,
  Heart,
  FileText,
  Compass,
  BadgeCheck,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const placeholderPatterns = [
  "Overthinking",
  "Sleep",
  "Work pressure",
  "Boundaries",
  "Social drain",
];

const deepenItems = [
  {
    title: "Prepare Reflection Summary",
    helper: "Bring a short, editable summary of your recent reflections.",
    icon: FileText,
  },
  {
    title: "Explore suggested themes",
    helper: "A few themes showing up recently, gently surfaced.",
    icon: Compass,
  },
  {
    title: "Browse professionals",
    helper: "See options when you feel ready.",
    icon: BadgeCheck,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const [signalLine, setSignalLine] = useState<string>(
    "This space is here whenever you feel ready.",
  );

  useEffect(() => {
    if (!user) return;
    const fetchTopSignals = async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const { data } = await supabase
        .from("mend_signals")
        .select("context")
        .eq("user_id", user.id)
        .gte("created_at", fourteenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (data && data.length >= 3) {
        const freq = new Map<string, number>();
        for (const s of data) {
          const t = s.context.toLowerCase().trim();
          freq.set(t, (freq.get(t) || 0) + 1);
        }
        const top = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([t]) => t);
        if (top.length >= 2) {
          setSignalLine(
            `Recently, ${top[0]} and ${top[1]} have appeared in your reflections.`,
          );
        } else if (top.length === 1) {
          setSignalLine(`Recently, ${top[0]} has appeared in your reflections.`);
        }
      }
    };
    fetchTopSignals();
  }, [user]);

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-16 gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-card rounded-3xl overflow-hidden mb-6">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl gradient-lilac flex items-center justify-center shadow-soft shrink-0">
                    <Sun className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-2">
                      Welcome back, {firstName}.
                    </h1>
                    <p className="text-muted-foreground mb-6">
                      This is your space to check in today.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link to="/checkin">
                        <Button className="gradient-lilac text-primary-foreground border-0 shadow-soft hover:shadow-hover transition-all active:scale-[0.97]">
                          Start today&apos;s check-in
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                      <Link to="/companion">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Open Companion
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Momentum Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 gap-4 mb-6"
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-soft rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-mint-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-mint-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">This week</span>
                </div>
                <p className="text-3xl font-serif font-medium text-foreground mb-1">2</p>
                <p className="text-sm text-muted-foreground">Check-ins</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-soft rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-lilac-100 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Streak</span>
                </div>
                <p className="text-3xl font-serif font-medium text-foreground mb-1">3</p>
                <p className="text-sm text-muted-foreground">days</p>
              </CardContent>
            </Card>
          </motion.div>

          <p className="text-xs text-muted-foreground text-center mb-6">
            No pressure. Just noticing.
          </p>

          {/* Continue Last Reflection - Nice to have */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Link to="/companion">
              <Card className="bg-gradient-to-r from-lilac-50 to-mint-50 border-border/50 shadow-soft rounded-2xl mb-6 hover:shadow-hover transition-all cursor-pointer active:scale-[0.99]">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-soft">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Continue last reflection</p>
                    <p className="text-xs text-muted-foreground">Pick up where you left off</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Recent Patterns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-soft rounded-2xl mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-serif font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Recent patterns
                  </CardTitle>
                  <Link to="/patterns" className="text-xs text-primary hover:underline">
                    View patterns
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {placeholderPatterns.map((pattern) => (
                    <Badge
                      key={pattern}
                      variant="secondary"
                      className="bg-lilac-50 text-foreground/80 hover:bg-lilac-100 rounded-full px-3 py-1 text-sm font-normal"
                    >
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Deepen Your Reflection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-card/85 backdrop-blur-sm border-border/40 shadow-soft rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif font-medium flex items-center gap-2 text-foreground/90">
                  <Heart className="w-4 h-4 text-primary/80" />
                  Deepen your reflection
                </CardTitle>
                <p className="text-sm text-muted-foreground/90 mt-1 leading-relaxed max-w-md">
                  When you feel ready, sit with someone trained to listen.
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-muted-foreground/70 italic mb-4 border-l-2 border-primary/15 pl-3">
                  {signalLine}
                </p>
                {deepenItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-muted/35 to-card border border-border/40 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lilac-100 to-mint-100 border border-border/40 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary/80" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground/90">
                        {item.title}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.helper}
                      </p>
                    </div>
                  </div>
                ))}
                <Link to="/sessions" className="block pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground/90 hover:text-foreground rounded-2xl py-6 bg-gradient-to-r from-lilac-50/60 to-mint-50/60 border border-border/40 hover:bg-gradient-to-r hover:from-lilac-100/70 hover:to-mint-100/70 transition-all"
                  >
                    Open Deepen Your Reflection
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
