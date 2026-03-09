import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { BaselineState } from "@/lib/patternSnapshot";

interface Node {
  id: number;
  x: number;
  y: number;
  cluster: number;
  size: number;
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

  // 3 well-separated cluster centers for clear visual grouping
  const centers = [
    { x: 24, y: 32 },  // top-left: emotional states
    { x: 76, y: 28 },  // top-right: stabilizing moments
    { x: 50, y: 72 },  // bottom-center: contextual signals
  ];

  for (let i = 0; i < nodeCount; i++) {
    const cluster = i % 3;
    const cx = centers[cluster].x;
    const cy = centers[cluster].y;
    // Tighter spread within clusters for cohesion, but enough variety
    const spread = 18;
    const sizeRoll = rand();
    const size = sizeRoll > 0.82 ? 1.25 + rand() * 0.2 : sizeRoll > 0.35 ? 0.85 + rand() * 0.25 : 0.5 + rand() * 0.25;
    nodes.push({
      id: i,
      x: cx + (rand() - 0.5) * spread * 2,
      y: cy + (rand() - 0.5) * spread * 1.6,
      cluster,
      size,
    });
  }

  // Connect nearby nodes within same cluster preferentially
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sameCluster = nodes[i].cluster === nodes[j].cluster;
      // Same-cluster connections more likely, cross-cluster rare
      if (sameCluster && dist < 16 && rand() > 0.4) {
        edges.push({ from: i, to: j });
      } else if (!sameCluster && dist < 22 && rand() > 0.88) {
        edges.push({ from: i, to: j });
      }
    }
  }

  return { nodes, edges };
}

const pulseConfig: Record<BaselineState, { duration: number; ease: string }> = {
  calm: { duration: 5, ease: "easeInOut" },
  elevated: { duration: 3, ease: "easeInOut" },
  fluctuating: { duration: 3.2, ease: "easeInOut" },
  high: { duration: 1.8, ease: "easeInOut" },
};

// Cluster colors — MEND palette
const clusterColors = {
  node: [
    "hsl(270 45% 72%)",  // lavender — emotional states
    "hsl(165 35% 70%)",  // mint — stabilizing moments
    "hsl(250 12% 68%)",  // neutral gray — context
  ],
  nodeEmpty: [
    "hsl(270 20% 84%)",
    "hsl(165 18% 84%)",
    "hsl(250 10% 84%)",
  ],
  glow: [
    "hsl(270 40% 78%)",
    "hsl(165 30% 76%)",
    "hsl(250 12% 76%)",
  ],
  edge: [
    "hsl(270 25% 82%)",
    "hsl(165 20% 82%)",
    "hsl(250 8% 84%)",
  ],
  edgeCross: "hsl(250 10% 86%)",
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
  const nodeCount = isEmpty ? 15 : 48;
  const { nodes, edges } = useMemo(() => generateGraph(nodeCount), [nodeCount]);
  const pulse = pulseConfig[baselineState];

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (baselineState !== "fluctuating") return;
    const id = setInterval(() => setTick((t) => t + 1), 2200);
    return () => clearInterval(id);
  }, [baselineState]);

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      aria-label="Emotional pattern visualization"
    >
      {/* Subtle grid texture */}
      <defs>
        <pattern id="pattern-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <path
            d="M 4 0 L 0 0 0 4"
            fill="none"
            stroke="hsl(250 15% 82%)"
            strokeWidth="0.06"
            opacity="0.35"
          />
        </pattern>
        {/* Soft glow filters per cluster */}
        <filter id="glow-0" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
        </filter>
        <filter id="glow-1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" />
        </filter>
        <filter id="glow-2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" />
        </filter>
      </defs>
      <rect width="100" height="100" fill="url(#pattern-grid)" />

      {/* Edges */}
      {edges.map((e, i) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const sameCluster = a.cluster === b.cluster;
        const edgeColor = isEmpty
          ? "hsl(250 8% 86%)"
          : sameCluster
          ? clusterColors.edge[a.cluster]
          : clusterColors.edgeCross;
        return (
          <line
            key={`e-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={edgeColor}
            strokeWidth={sameCluster ? 0.14 : 0.08}
            opacity={isEmpty ? 0.18 : sameCluster ? 0.25 : 0.12}
          />
        );
      })}

      {/* Ambient glow halos for active nodes */}
      {!isEmpty &&
        nodes.map((node) => {
          const isHighlight = node.cluster === highlightCluster;
          if (!isHighlight && node.size < 1.0) return null;
          return (
            <motion.circle
              key={`glow-${node.id}`}
              cx={node.x}
              cy={node.y}
              r={node.size * 3}
              fill={clusterColors.glow[node.cluster]}
              filter={`url(#glow-${node.cluster})`}
              animate={{ opacity: [0, isHighlight ? 0.14 : 0.08, 0] }}
              transition={{
                duration: pulse.duration * 1.4,
                ease: "easeInOut",
                repeat: Infinity,
                delay: node.id * 0.12,
              }}
            />
          );
        })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isHighlight = node.cluster === highlightCluster && !isEmpty;
        const baseRadius = isEmpty
          ? node.size * 0.7
          : isHighlight
          ? node.size * 1.5
          : node.size * 1.05;

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
              r: [baseRadius, baseRadius * 1.18, baseRadius],
              opacity: isEmpty
                ? [0.22, 0.38, 0.22]
                : isHighlight
                ? [0.6, 0.88, 0.6]
                : [0.32, 0.52, 0.32],
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
  );
}
