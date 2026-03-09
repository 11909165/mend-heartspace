import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { BaselineState } from "@/lib/patternSnapshot";

interface Node {
  id: number;
  x: number;
  y: number;
  cluster: number;
  size: number; // relative size 0.6–1.4
}

interface Edge {
  from: number;
  to: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateGraph(nodeCount: number): { nodes: Node[]; edges: Edge[] } {
  const rand = seededRandom(42);
  const nodes: Node[] = [];

  // 3 cluster centers — spread wider for spacious feel
  const centers = [
    { x: 28, y: 35 },
    { x: 72, y: 30 },
    { x: 50, y: 68 },
  ];

  for (let i = 0; i < nodeCount; i++) {
    const cluster = i % 3;
    const cx = centers[cluster].x;
    const cy = centers[cluster].y;
    // Vary size: some dominant (larger), most moderate, a few small
    const sizeRoll = rand();
    const size = sizeRoll > 0.85 ? 1.3 + rand() * 0.15 : sizeRoll > 0.4 ? 0.9 + rand() * 0.2 : 0.55 + rand() * 0.25;
    nodes.push({
      id: i,
      x: cx + (rand() - 0.5) * 36,
      y: cy + (rand() - 0.5) * 32,
      cluster,
      size,
    });
  }

  // Connect nearby nodes — thin, sparse connections
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20 && rand() > 0.5) {
        edges.push({ from: i, to: j });
      }
    }
  }

  return { nodes, edges };
}

// Pulse timing per baseline state
const pulseConfig: Record<BaselineState, { duration: number; ease: string }> = {
  calm: { duration: 5, ease: "easeInOut" },
  elevated: { duration: 3, ease: "easeInOut" },
  fluctuating: { duration: 3.2, ease: "easeInOut" },
  high: { duration: 1.8, ease: "easeInOut" },
};

// Cluster color mapping — MEND palette
// Cluster 0: lavender (emotional states)
// Cluster 1: mint (stabilizing moments)
// Cluster 2: neutral gray (contextual signals)
const clusterColors = {
  node: [
    "hsl(270 45% 72%)",  // lavender
    "hsl(165 35% 70%)",  // mint
    "hsl(250 12% 68%)",  // neutral gray
  ],
  nodeEmpty: [
    "hsl(270 20% 82%)",
    "hsl(165 18% 82%)",
    "hsl(250 10% 82%)",
  ],
  glow: [
    "hsl(270 45% 80%)",
    "hsl(165 35% 78%)",
    "hsl(250 12% 76%)",
  ],
  edge: [
    "hsl(270 30% 78%)",
    "hsl(165 25% 78%)",
    "hsl(250 10% 80%)",
  ],
};

interface BrainVisualizationProps {
  baselineState: BaselineState;
  highlightCluster: number;
  isEmpty?: boolean;
}

export function BrainVisualization({
  baselineState,
  highlightCluster,
  isEmpty = false,
}: BrainVisualizationProps) {
  const nodeCount = isEmpty ? 14 : 48;
  const { nodes, edges } = useMemo(() => generateGraph(nodeCount), [nodeCount]);
  const pulse = pulseConfig[baselineState];

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (baselineState !== "fluctuating") return;
    const id = setInterval(() => setTick((t) => t + 1), 2200);
    return () => clearInterval(id);
  }, [baselineState]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full mx-auto"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        aria-label="Emotional pattern visualization"
      >
        {/* Subtle grid background */}
        <defs>
          <pattern id="pattern-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path
              d="M 5 0 L 0 0 0 5"
              fill="none"
              stroke="hsl(250 15% 80%)"
              strokeWidth="0.08"
              opacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#pattern-grid)" />

        {/* Edges — thin, low opacity */}
        {edges.map((e, i) => {
          const a = nodes[e.from];
          const b = nodes[e.to];
          const edgeColor = isEmpty
            ? "hsl(250 10% 84%)"
            : clusterColors.edge[a.cluster] || clusterColors.edge[0];
          return (
            <line
              key={`e-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={edgeColor}
              strokeWidth={0.15}
              opacity={isEmpty ? 0.2 : 0.22}
            />
          );
        })}

        {/* Glow layer for highlight cluster */}
        {!isEmpty &&
          nodes
            .filter((n) => n.cluster === highlightCluster)
            .map((node) => (
              <motion.circle
                key={`glow-${node.id}`}
                cx={node.x}
                cy={node.y}
                r={node.size * 3.2}
                fill={clusterColors.glow[node.cluster]}
                animate={{ opacity: [0, 0.12, 0] }}
                transition={{
                  duration: pulse.duration * 1.3,
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: node.id * 0.13,
                }}
              />
            ))}

        {/* Nodes */}
        {nodes.map((node) => {
          const isHighlight = node.cluster === highlightCluster && !isEmpty;
          const baseRadius = isEmpty
            ? node.size * 0.7
            : isHighlight
            ? node.size * 1.6
            : node.size * 1.1;

          const delay =
            baselineState === "fluctuating"
              ? (node.id * 0.37 + tick * 0.1) % pulse.duration
              : node.id * 0.1;

          const fillColor = isEmpty
            ? clusterColors.nodeEmpty[node.cluster]
            : clusterColors.node[node.cluster];

          return (
            <motion.circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={baseRadius}
              fill={fillColor}
              animate={{
                r: [baseRadius, baseRadius * 1.2, baseRadius],
                opacity: isEmpty
                  ? [0.25, 0.4, 0.25]
                  : isHighlight
                  ? [0.65, 0.9, 0.65]
                  : [0.35, 0.55, 0.35],
              }}
              transition={{
                duration: pulse.duration,
                ease: pulse.ease as any,
                repeat: Infinity,
                delay,
              }}
            />
          );
        })}
      </svg>
    </motion.div>
  );
}
