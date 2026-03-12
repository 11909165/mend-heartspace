import { useRef, useEffect, useState, useMemo } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

import reflectionImg from "@/assets/reflection-ui.png";
import journalImg from "@/assets/journal-ui.png";
import patternsImg from "@/assets/patterns-ui2.png";
import supportGroupsImg from "@/assets/supportgroups-ui.png";

const steps = [
  {
    label: "01",
    title: "Reflect",
    copy: [
      "Speak freely about what you are experiencing.",
      "MEND listens without judgment and helps you explore what is beneath the surface.",
    ],
    image: reflectionImg,
    alt: "MEND AI companion conversation showing empathetic reflection",
  },
  {
    label: "02",
    title: "Journal",
    copy: [
      "Some thoughts do not need responses.",
      "The journal gives you a quiet place to put things down exactly as they are.",
    ],
    image: journalImg,
    alt: "MEND journal interface with prompts and recent entries",
  },
  {
    label: "03",
    title: "Patterns and insights",
    copy: [
      "Over time MEND begins to notice emotional patterns across your reflections.",
      "What feels confusing in the moment becomes clearer when seen across time.",
    ],
    image: patternsImg,
    alt: "MEND emotional pattern map visualization",
    signature: true,
  },
  {
    label: "04",
    title: "Quiet Spaces",
    copy: [
      "Some things are easier to carry together.",
      "You can listen.\nYou can share.\nYou can stay anonymous.",
    ],
    image: supportGroupsImg,
    alt: "MEND Quiet Spaces support circles for shared reflection",
  },
];

/* ── Single story panel ── */
function StoryPanel({
  step,
  progress,
}: {
  step: (typeof steps)[0];
  progress: number; // 0 = entering, 0.5 = centered, 1 = exiting
}) {
  // fade: peak at 0.3–0.7, fade edges
  const opacity = progress < 0.15
    ? progress / 0.15
    : progress > 0.8
      ? (1 - progress) / 0.2
      : 1;

  // slide up from 24px
  const translateY = progress < 0.3 ? 24 * (1 - progress / 0.3) : 0;

  // screenshot scale
  const scale = progress < 0.3
    ? 0.97 + 0.03 * (progress / 0.3)
    : 1;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6"
      style={{
        opacity: Math.max(0, Math.min(1, opacity)),
        transform: `translateY(${translateY}px)`,
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      {/* Text */}
      <div className="text-center mb-8 max-w-lg">
        <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground/60 font-medium">
          {step.label}
        </span>
        <h3 className="mt-2 text-2xl md:text-3xl lg:text-4xl font-serif font-medium text-foreground">
          {step.title}
        </h3>
        <div className="mt-4 space-y-2 text-muted-foreground text-[15px] md:text-base leading-relaxed">
          {step.copy.map((line, i) => (
            <p key={i} className="whitespace-pre-line">{line}</p>
          ))}
        </div>
      </div>

      {/* Screenshot */}
      <div className={`relative w-full ${step.signature ? "max-w-2xl" : "max-w-xl"}`}>
        {/* Lavender glow */}
        <div
          className="absolute -inset-10 rounded-[32px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(270 50% 85% / 0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="relative rounded-[24px] p-3 bg-card shadow-card overflow-hidden border border-border/50"
          style={{ transform: `scale(${scale})` }}
        >
          <img
            src={step.image}
            alt={step.alt}
            className="w-full h-auto rounded-[16px]"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Main scroll storytelling section ── */
export default function ScrollStorytelling() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (v) => setProgress(v));
    return unsubscribe;
  }, [smoothProgress]);

  // Map overall progress to per-step progress
  // Each step gets ~25% of total scroll, with overlap zones
  const stepCount = steps.length;

  return (
    <section className="relative bg-background">
      {/* Section header */}
      <div className="pt-28 lg:pt-40 pb-12 text-center px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-serif font-medium text-foreground mb-4"
        >
          How MEND helps you understand yourself
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-lg mx-auto"
        >
          Reflection becomes clarity when patterns begin to appear.
        </motion.p>
      </div>

      {/* Scroll container: each step gets ~85vh of scroll space */}
      <div
        ref={containerRef}
        style={{ height: `${stepCount * 85}vh` }}
        className="relative"
      >
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          {steps.map((step, i) => {
            // Each step occupies 1/stepCount of progress
            const stepStart = i / stepCount;
            const stepEnd = (i + 1) / stepCount;
            const stepProgress = Math.max(
              0,
              Math.min(1, (progress - stepStart) / (stepEnd - stepStart))
            );

            // Only render if in a reasonable range
            if (stepProgress < -0.1 || stepProgress > 1.1) return null;

            return (
              <StoryPanel key={i} step={step} progress={stepProgress} />
            );
          })}
        </div>
      </div>
    </section>
  );
}
