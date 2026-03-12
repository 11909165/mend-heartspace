import { motion } from "framer-motion";

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

const easeOutCubic: [number, number, number, number] = [0.33, 1, 0.68, 1];

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutCubic },
  },
};

const imageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeOutCubic, delay: 0.1 },
  },
};

function StoryStep({ step }: { step: (typeof steps)[0] }) {
  // Patterns step triggers later (60% in viewport) via smaller margin
  const viewportMargin = step.signature ? "-40%" : "-20%";

  return (
    <div
      className={`flex flex-col items-center px-4 sm:px-6 ${
        step.signature ? "pt-20" : ""
      }`}
    >
      {/* Text */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: viewportMargin }}
        variants={textVariants}
        className="text-center mb-8 max-w-lg"
      >
        <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground/60 font-medium">
          {step.label}
        </span>
        <h3 className="mt-2 text-2xl md:text-3xl lg:text-4xl font-serif font-medium text-foreground">
          {step.title}
        </h3>
        <div className="mt-4 space-y-2 text-muted-foreground text-[15px] md:text-base leading-relaxed">
          {step.copy.map((line, i) => (
            <p key={i} className="whitespace-pre-line">
              {line}
            </p>
          ))}
        </div>
      </motion.div>

      {/* Screenshot */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: viewportMargin }}
        variants={imageVariants}
        className={`relative w-full ${
          step.signature ? "max-w-[1000px]" : "max-w-xl"
        }`}
      >
        {/* Lavender glow */}
        <div
          className="absolute -inset-10 rounded-[32px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(270 50% 85% / 0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative rounded-[24px] p-3 bg-card shadow-card overflow-hidden border border-border/50">
          <img
            src={step.image}
            alt={step.alt}
            className="w-full h-auto rounded-[16px]"
            loading="lazy"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default function ScrollStorytelling() {
  return (
    <section className="relative bg-background">
      {/* Section header */}
      <div className="pt-28 lg:pt-40 pb-16 text-center px-4">
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

      {/* Steps with generous spacing */}
      <div className="space-y-28 lg:space-y-36 pb-28 lg:pb-40">
        {steps.map((step, i) => (
          <StoryStep key={i} step={step} />
        ))}
      </div>
    </section>
  );
}
