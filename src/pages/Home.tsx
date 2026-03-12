import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useMemo } from "react";
import ScrollStorytelling from "@/components/home/ScrollStorytelling";

/* ── tiny inline neural cluster (background decoration) ── */
function NeuralCluster() {
  const { nodes, edges } = useMemo(() => {
    const rand = ((s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; })(42);
    const n = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 20 + rand() * 60,
      y: 20 + rand() * 60,
    }));
    const e: { from: number; to: number }[] = [];
    for (let i = 0; i < n.length; i++)
      for (let j = i + 1; j < n.length; j++) {
        const d = Math.hypot(n[i].x - n[j].x, n[i].y - n[j].y);
        if (d < 20 && rand() > 0.4) e.push({ from: i, to: j });
      }
    return { nodes: n, edges: e };
  }, []);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
      {edges.map((e, i) => (
        <line key={i} x1={nodes[e.from].x} y1={nodes[e.from].y} x2={nodes[e.to].x} y2={nodes[e.to].y}
          stroke="hsl(270 45% 80%)" strokeWidth={0.2} strokeOpacity={0.25} />
      ))}
      {nodes.map((n) => (
        <motion.circle key={n.id} cx={n.x} cy={n.y} r={1.2}
          fill="hsl(270 45% 78%)"
          animate={{ r: [1.2, 1.6, 1.2], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, delay: n.id * 0.3 }}
        />
      ))}
    </svg>
  );
}

/* ── fade-in wrapper ── */
const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Home() {
  return (
    <Layout>
      {/* ─── SECTION 1 — Hero ─── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden gradient-hero">
        {/* Background neural cluster */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px]">
            <NeuralCluster />
          </div>
        </div>
        {/* Soft gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-lilac-200/20 blur-3xl animate-float" />
          <div className="absolute bottom-16 right-12 w-80 h-80 rounded-full bg-mint-200/20 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <Reveal>
              <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-serif font-medium text-foreground leading-snug text-balance">
                Some thoughts don't need fixing.
                <br className="hidden sm:block" />
                They need understanding.
              </h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed text-balance max-w-xl mx-auto">
                A private space to reflect, notice patterns, and make sense of what you're carrying.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/companion">
                  <Button size="lg" className="gradient-lilac text-primary-foreground border-0 shadow-soft hover:shadow-hover transition-all duration-300 px-8">
                    Begin Reflecting
                  </Button>
                </Link>
                <Link to="/how-mend-helps" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  See how it works
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2 — Scroll Storytelling ─── */}
      <ScrollStorytelling />

      {/* ─── SECTION 3 — Emotional Close ─── */}
      <section className="py-28 lg:py-36 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-lilac-100 via-mint-50 to-peach-100 rounded-3xl p-12 md:p-16 shadow-card">
              <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-4">
                You don't have to figure yourself out alone.
              </h2>
              <p className="text-muted-foreground mb-8">
                Start noticing. Start understanding. Start gently.
              </p>
              <Link to="/companion">
                <Button size="lg" className="gradient-lilac text-primary-foreground border-0 shadow-soft hover:shadow-hover transition-all duration-300 px-8">
                  Begin Reflecting
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}
