import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

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

/* Compute per-step visibility from 0..1 scroll progress */
function getStepVisibility(scrollProgress: number, stepIndex: number, total: number) {
  const segmentSize = 1 / total;
  const center = (stepIndex + 0.5) * segmentSize;
  const halfWidth = segmentSize * 0.5;
  const dist = Math.abs(scrollProgress - center);
  // 1 at center, drops to 0 at edges
  const t = Math.max(0, 1 - dist / halfWidth);
  return t;
}

export default function ScrollStorytelling() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.0005,
  });

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsub = smoothProgress.on("change", (v) => setProgress(v));
    return unsub;
  }, [smoothProgress]);

  const total = steps.length;

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

      {/* Scroll runway */}
      <div
        ref={containerRef}
        style={{ height: `${total * 90}vh` }}
        className="relative"
      >
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          {steps.map((step, i) => {
            const vis = getStepVisibility(progress, i, total);
            if (vis < 0.01) return null;

            // Active: opacity 1, y 0, scale 1
            // Inactive: opacity ~0.35, y 24, scale 0.97
            const opacity = 0.3 + vis * 0.7;
            const translateY = (1 - vis) * 24;
            const imgScale = 0.97 + vis * 0.03;
            const imgOpacity = 0.25 + vis * 0.75;

            return (
              <div
                key={i}
                className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6"
                style={{
                  opacity,
                  transform: `translateY(${translateY}px)`,
                  zIndex: Math.round(vis * 10),
                  pointerEvents: vis > 0.5 ? "auto" : "none",
                  willChange: "transform, opacity",
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
                    {step.copy.map((line, j) => (
                      <p key={j} className="whitespace-pre-line">{line}</p>
                    ))}
                  </div>
                </div>

                {/* Screenshot */}
                <div className={`relative w-full ${step.signature ? "max-w-[1000px]" : "max-w-xl"}`}>
                  <div
                    className="absolute -inset-10 rounded-[32px] pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(ellipse at center, hsl(270 50% 85% / 0.12) 0%, transparent 70%)",
                    }}
                  />
                  <div
                    className="relative rounded-[24px] p-3 bg-card shadow-card overflow-hidden border border-border/50"
                    style={{
                      transform: `scale(${imgScale})`,
                      opacity: imgOpacity,
                      willChange: "transform, opacity",
                    }}
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
          })}
        </div>
      </div>
    </section>
  );
}
