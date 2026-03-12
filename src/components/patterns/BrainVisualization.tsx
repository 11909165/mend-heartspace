import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BaselineState } from "@/lib/patternSnapshot";
import type { GraphNode, GraphEdge } from "@/hooks/useUnifiedSignals";

/* ── Layout helpers ─────────────────────────────── */

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* Tighter, more centered cluster positions */
const centers = [
  { x: 32, y: 36 },
  { x: 68, y: 34 },
  { x: 50, y: 66 },
];

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  cluster: number;
  size: number;
  label: string;
  weight: number;
}

interface LayoutEdge {
  from: string;
  to: string;
  strength: number;
}

function layoutRealNodes(graphNodes: GraphNode[], graphEdges: GraphEdge[]): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const rand = seededRandom(42);
  const nodes: LayoutNode[] = [];

  for (let i = 0; i < graphNodes.length; i++) {
    const gn = graphNodes[i];
    const cx = centers[gn.cluster].x;
    const cy = centers[gn.cluster].y;
    const spread = 11; // tighter clustering
    const size = 0.5 + gn.weight * 1.0;
    nodes.push({
      id: gn.id,
      x: cx + (rand() - 0.5) * spread * 2,
      y: cy + (rand() - 0.5) * spread * 1.4,
      cluster: gn.cluster,
      size,
      label: gn.label,
      weight: gn.weight,
    });
  }

  return { nodes, edges: graphEdges.map(e => ({ from: e.from, to: e.to, strength: e.strength })) };
}

function generateEmptyGraph(count: number): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const rand = seededRandom(42);
  const nodes: LayoutNode[] = [];
  const placeholders = [
    ["...", "...", "...", "..."],
    ["...", "...", "..."],
    ["...", "...", "...", "..."],
  ];

  for (let i = 0; i < count; i++) {
    const cluster = i % 3;
    const cx = centers[cluster].x;
    const cy = centers[cluster].y;
    const labels = placeholders[cluster];
    nodes.push({
      id: `empty-${i}`,
      x: cx + (rand() - 0.5) * 24,
      y: cy + (rand() - 0.5) * 20,
      cluster,
      size: 0.5 + rand() * 0.3,
      label: labels[Math.floor(rand() * labels.length)],
      weight: 0,
    });
  }

  const edges: LayoutEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (nodes[i].cluster === nodes[j].cluster && dist < 14 && rand() > 0.45) {
        edges.push({ from: nodes[i].id, to: nodes[j].id, strength: 1 });
      }
    }
  }
  return { nodes, edges };
}

/* ── Pulse config ───────────────────────────────── */

const pulseConfig: Record<BaselineState, { duration: number; ease: string }> = {
  calm: { duration: 5, ease: "easeInOut" },
  elevated: { duration: 3, ease: "easeInOut" },
  fluctuating: { duration: 3.2, ease: "easeInOut" },
  high: { duration: 1.8, ease: "easeInOut" },
};

const clusterColors = {
  node: [
    "hsl(270 45% 72%)",
    "hsl(162 42% 65%)",  // increased mint saturation
    "hsl(250 12% 68%)",
  ],
  nodeEmpty: [
    "hsl(270 20% 84%)",
    "hsl(162 22% 84%)",
    "hsl(250 10% 84%)",
  ],
  glow: [
    "hsl(270 40% 78%)",
    "hsl(162 35% 74%)",
    "hsl(250 12% 76%)",
  ],
  edge: [
    "hsl(270 25% 82%)",
    "hsl(162 22% 80%)",
    "hsl(250 8% 84%)",
  ],
  edgeHighlight: [
    "hsl(270 45% 68%)",
    "hsl(162 42% 58%)",
    "hsl(250 18% 62%)",
  ],
  edgeCross: "hsl(250 10% 86%)",
};

/* Tooltip & label palette – deep lavender gray */
const tooltipColors = {
  bg: "hsl(270 14% 18%)",       /* #2F2B36 equivalent */
  textPrimary: "hsl(265 30% 96%)",   /* #F3F1F7 */
  textSecondary: "hsl(268 18% 80%)", /* #CFC8D9 */
  textMuted: "hsl(268 14% 67%)",     /* #A9A0B8 */
};

/* Per-cluster label colors – soft lavender neutrals */
const labelColors = {
  active: [
    "hsl(270 30% 62%)",   /* Emotional – muted lavender */
    "hsl(162 30% 56%)",   /* Stabilizing – gentle mint */
    "hsl(255 12% 58%)",   /* Context – soft gray-lavender */
  ],
  dimmed: [
    "hsl(270 16% 72%)",
    "hsl(162 16% 72%)",
    "hsl(255 8% 72%)",
  ],
};

const FONT_STACK = "'DM Sans', 'Inter', system-ui, sans-serif";

const clusterNames = ["Emotional state", "Stabilizing moment", "Context signal"];

/* ── Mock insight data ───────────────────────────── */

const clusterInsightTemplates: Record<number, { chain: string; explanation: string }[]> = {
  0: [
    { chain: "Work Stress → Frustration → Late Night Journaling", explanation: "This emotional thread tends to surface during busy weeks." },
    { chain: "Overthinking → Tension → Evening Restlessness", explanation: "A pattern of mental loops that usually peaks after work." },
    { chain: "Loneliness → Heaviness → Quiet Reflection", explanation: "Moments of solitude that carry emotional weight." },
    { chain: "Worry → Unease → Sleep Disruption", explanation: "Anxiety-related signals that cluster around bedtime." },
  ],
  1: [
    { chain: "Journaling → Calm → Emotional Clarity", explanation: "Writing seems to create space for settling." },
    { chain: "Gratitude Practice → Ease → Better Sleep", explanation: "A grounding rhythm that supports rest." },
    { chain: "Reflection → Relief → Lighter Mornings", explanation: "Processing feelings appears to ease the next day." },
  ],
  2: [
    { chain: "Work Pressure → Relationship Tension → Self-Doubt", explanation: "Stress at work may be spilling into other areas." },
    { chain: "Family Dynamics → Emotional Weight → Avoidance", explanation: "Family-related themes that carry forward." },
    { chain: "Routine Disruption → Unease → Loss of Focus", explanation: "Changes in daily rhythm seem to trigger unsettledness." },
    { chain: "Future Uncertainty → Overthinking → Fatigue", explanation: "Worries about what's ahead tend to drain energy." },
  ],
};

function getMockInsight(node: LayoutNode): { chain: string; explanation: string; count: number } {
  const templates = clusterInsightTemplates[node.cluster] || clusterInsightTemplates[2];
  let hash = 0;
  for (let i = 0; i < node.label.length; i++) hash = ((hash << 5) - hash + node.label.charCodeAt(i)) | 0;
  const template = templates[Math.abs(hash) % templates.length];
  const count = 2 + (Math.abs(hash) % 6);
  return { ...template, count };
}

/* ── Exported hover info type ──────────────────── */

export interface HoveredNodeInfo {
  label: string;
  cluster: number;
  clusterName: string;
  frequency: number;
  connectedLabels: string[];
  stabilizer: string | null;
}

/* ── Transition duration constant ─────────────── */
const HOVER_TRANSITION = "0.12s";

/* ── Component ──────────────────────────────────── */

interface BrainVisualizationProps {
  baselineState: BaselineState;
  highlightCluster?: number;
  isEmpty?: boolean;
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
  onHoverNode?: (info: HoveredNodeInfo | null) => void;
}

export function BrainVisualization({
  baselineState,
  highlightCluster = 0,
  isEmpty = false,
  graphNodes,
  graphEdges,
  onHoverNode,
}: BrainVisualizationProps) {
  const hasRealData = graphNodes && graphNodes.length > 0 && !isEmpty;

  const { nodes, edges } = useMemo(() => {
    if (hasRealData) return layoutRealNodes(graphNodes!, graphEdges || []);
    return generateEmptyGraph(isEmpty ? 15 : 24);
  }, [hasRealData, graphNodes, graphEdges, isEmpty]);

  const pulse = pulseConfig[baselineState];
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const adjacency = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    const edgeSet = new Map<string, number[]>();
    edges.forEach((e, i) => {
      if (!neighbors.has(e.from)) neighbors.set(e.from, new Set());
      if (!neighbors.has(e.to)) neighbors.set(e.to, new Set());
      neighbors.get(e.from)!.add(e.to);
      neighbors.get(e.to)!.add(e.from);
      if (!edgeSet.has(e.from)) edgeSet.set(e.from, []);
      if (!edgeSet.has(e.to)) edgeSet.set(e.to, []);
      edgeSet.get(e.from)!.push(i);
      edgeSet.get(e.to)!.push(i);
    });
    return { neighbors, edgeSet };
  }, [edges]);

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode || isEmpty) return null;
    const set = new Set<string>();
    set.add(hoveredNode);
    const nbrs = adjacency.neighbors.get(hoveredNode);
    if (nbrs) nbrs.forEach((n) => set.add(n));
    return set;
  }, [hoveredNode, adjacency, isEmpty]);

  const connectedEdgeIndices = useMemo(() => {
    if (!hoveredNode || isEmpty) return null;
    return new Set(adjacency.edgeSet.get(hoveredNode) || []);
  }, [hoveredNode, adjacency, isEmpty]);

  useEffect(() => {
    if (!onHoverNode) return;
    if (!hoveredNode || isEmpty) {
      onHoverNode(null);
      return;
    }
    const node = nodeMap.get(hoveredNode);
    if (!node) { onHoverNode(null); return; }
    const nbrs = adjacency.neighbors.get(hoveredNode);
    const connectedLabels = nbrs
      ? [...nbrs].map((id) => nodeMap.get(id)?.label).filter(Boolean) as string[]
      : [];
    const stabilizerNode = nbrs
      ? [...nbrs].map((id) => nodeMap.get(id)).find((n) => n && n.cluster === 1)
      : null;
    onHoverNode({
      label: node.label,
      cluster: node.cluster,
      clusterName: clusterNames[node.cluster] || "Signal",
      frequency: Math.round(node.weight * 10) || 1,
      connectedLabels,
      stabilizer: stabilizerNode?.label || null,
    });
  }, [hoveredNode, isEmpty, onHoverNode, nodeMap, adjacency]);

  const getPixelPos = useCallback((svgX: number, svgY: number) => {
    if (!containerRef.current) return { px: 0, py: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      px: (svgX / 100) * rect.width,
      py: (svgY / 100) * rect.height,
    };
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (isEmpty) return;
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
  }, [isEmpty]);

  const handleBgClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const isTouchDevice = useRef(false);

  const handleNodeEnter = useCallback((nodeId: string) => {
    if (!isEmpty && !isTouchDevice.current) setHoveredNode(nodeId);
  }, [isEmpty]);

  const handleNodeLeave = useCallback(() => {
    if (!isTouchDevice.current) setHoveredNode(null);
  }, []);

  const handleNodeTouch = useCallback((nodeId: string, e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isTouchDevice.current = true;
    if (!isEmpty) {
      setHoveredNode((prev) => (prev === nodeId ? null : nodeId));
      if (!hasInteracted) setHasInteracted(true);
    }
  }, [isEmpty, hasInteracted]);

  const selectedLayoutNode = selectedNode ? nodeMap.get(selectedNode) : null;
  const insight = selectedLayoutNode ? getMockInsight(selectedLayoutNode) : null;

  const pathActive = !!connectedNodeIds && !selectedNode;

  /* Dominant nodes get persistent labels (weight > 0.6) */
  const dominantNodes = useMemo(() => {
    if (isEmpty) return [];
    return nodes.filter((n) => n.weight >= 0.6 && n.label !== "...");
  }, [nodes, isEmpty]);

  return (
    <div ref={containerRef} className="relative">
      {/* Mobile tap hint */}
      {hasRealData && (
        <AnimatePresence>
          {!hasInteracted && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute top-2 left-0 right-0 text-center text-[11px] text-muted-foreground/50 italic pointer-events-none z-10 md:hidden"
            >
              Tap a node to explore
            </motion.p>
          )}
        </AnimatePresence>
      )}
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        aria-label="Emotional pattern visualization"
        onClick={handleBgClick}
        onTouchStart={() => { isTouchDevice.current = true; setHoveredNode(null); }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <defs>
          <pattern id="pattern-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 4 0 L 0 0 0 4" fill="none" stroke="hsl(250 15% 82%)" strokeWidth="0.05" opacity="0.18" />
          </pattern>
          <filter id="glow-0" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
          </filter>
          <filter id="glow-1" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" />
          </filter>
          <filter id="glow-2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" />
          </filter>
          {/* Radial gradients for emotional nodes (cluster 0) */}
          <radialGradient id="node-grad-0" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(268 50% 78%)" />
            <stop offset="100%" stopColor="hsl(270 45% 72%)" />
          </radialGradient>
          <radialGradient id="node-grad-1" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(160 48% 72%)" />
            <stop offset="100%" stopColor="hsl(162 42% 65%)" />
          </radialGradient>
          <radialGradient id="node-grad-2" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(248 16% 74%)" />
            <stop offset="100%" stopColor="hsl(250 12% 68%)" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#pattern-grid)" />

        {/* Edges */}
        {edges.map((e, i) => {
          const a = nodeMap.get(e.from);
          const b = nodeMap.get(e.to);
          if (!a || !b) return null;
          const sameCluster = a.cluster === b.cluster;

          const isConnectedEdge = connectedEdgeIndices?.has(i);
          const dimmed = pathActive && !isConnectedEdge;

          const edgeColor = isEmpty
            ? "hsl(250 8% 86%)"
            : dimmed
            ? "hsl(250 6% 90%)"
            : isConnectedEdge
            ? clusterColors.edgeHighlight[a.cluster]
            : sameCluster
            ? clusterColors.edge[a.cluster]
            : clusterColors.edgeCross;

          const strokeW = isConnectedEdge
            ? Math.min(0.28 + (e.strength || 0) * 0.04, 0.55)
            : sameCluster
            ? Math.min(0.14 + (e.strength || 0) * 0.03, 0.35)
            : 0.08;

          const opacity = isEmpty
            ? 0.18
            : dimmed
            ? 0.04
            : isConnectedEdge
            ? 0.6
            : sameCluster
            ? 0.22
            : 0.1;

          return (
            <line
              key={`e-${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={edgeColor}
              strokeWidth={strokeW}
              opacity={opacity}
              style={{ transition: `opacity ${HOVER_TRANSITION} ease, stroke ${HOVER_TRANSITION} ease, stroke-width ${HOVER_TRANSITION} ease` }}
            />
          );
        })}

        {/* Ambient glow halos */}
        {!isEmpty &&
          nodes.map((node) => {
            const isHighlight = node.cluster === highlightCluster;
            if (!isHighlight && node.size < 0.8) return null;
            const dimmed = pathActive && !connectedNodeIds?.has(node.id);
            return (
              <motion.circle
                key={`glow-${node.id}`}
                cx={node.x} cy={node.y} r={node.size * 3}
                fill={clusterColors.glow[node.cluster]}
                filter={`url(#glow-${node.cluster})`}
                animate={{ opacity: dimmed ? [0, 0.02, 0] : [0, isHighlight ? 0.14 : 0.08, 0] }}
                transition={{
                  duration: pulse.duration * 1.4,
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: nodes.indexOf(node) * 0.12,
                }}
              />
            );
          })}

        {/* Nodes */}
        {nodes.map((node, idx) => {
          const isHighlight = node.cluster === highlightCluster && !isEmpty;
          const isSelected = selectedNode === node.id;
          const isHovered = hoveredNode === node.id;
          const isConnected = connectedNodeIds?.has(node.id);
          const dimmed = pathActive && !isConnected;

          const baseRadius = isEmpty
            ? node.size * 0.7
            : isHighlight
            ? node.size * 1.5
            : node.size * 1.05;

          const fillColor = isEmpty
            ? clusterColors.nodeEmpty[node.cluster]
            : `url(#node-grad-${node.cluster})`;

          const opacityRange = isEmpty
            ? [0.22, 0.38, 0.22]
            : isSelected
            ? [0.9, 1, 0.9]
            : isHovered
            ? [0.9, 1, 0.9]
            : dimmed
            ? [0.08, 0.12, 0.08]
            : isConnected && pathActive
            ? [0.7, 0.9, 0.7]
            : isHighlight
            ? [0.6, 0.88, 0.6]
            : [0.32, 0.52, 0.32];

          const radiusRange = isSelected
            ? [baseRadius * 1.5, baseRadius * 1.6, baseRadius * 1.5]
            : isHovered
            ? [baseRadius * 1.55, baseRadius * 1.65, baseRadius * 1.55]
            : isConnected && pathActive
            ? [baseRadius * 1.15, baseRadius * 1.3, baseRadius * 1.15]
            : [baseRadius, baseRadius * 1.18, baseRadius];

          return (
            <motion.circle
              key={node.id}
              cx={node.x} cy={node.y} r={baseRadius}
              fill={fillColor}
              stroke={isSelected ? clusterColors.node[node.cluster] : isHovered ? clusterColors.node[node.cluster] : "none"}
              strokeWidth={isSelected ? 0.4 : isHovered ? 0.3 : 0}
              style={{
                cursor: isEmpty ? "default" : "pointer",
                transition: `stroke ${HOVER_TRANSITION} ease, stroke-width ${HOVER_TRANSITION} ease`,
              }}
              onMouseEnter={() => handleNodeEnter(node.id)}
              onMouseLeave={handleNodeLeave}
              onTouchStart={(e: any) => handleNodeTouch(node.id, e)}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
              animate={{
                r: radiusRange,
                opacity: opacityRange,
              }}
              transition={{
                duration: isSelected ? 2 : isHovered ? 1.8 : pulse.duration,
                ease: pulse.ease as any,
                repeat: Infinity,
                delay: isSelected || isHovered ? 0 : idx * 0.1,
              }}
            />
          );
        })}

        {/* Persistent labels for dominant nodes */}
        {dominantNodes.map((node) => {
          const dimmed = pathActive && !connectedNodeIds?.has(node.id);
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;
          if (isHovered || isSelected) return null;
          const isDominant = node.weight >= 0.85;
          return (
            <text
              key={`label-${node.id}`}
              x={node.x}
              y={node.y + node.size * 2.2 + 2.5}
              textAnchor="middle"
              fontSize={isDominant ? "2.2" : "1.8"}
              fontWeight="500"
              letterSpacing="-0.02em"
              fill={dimmed ? labelColors.dimmed[node.cluster] : labelColors.active[node.cluster]}
              opacity={dimmed ? 0.18 : 0.6}
              style={{
                pointerEvents: "none",
                transition: `opacity ${HOVER_TRANSITION} ease, fill ${HOVER_TRANSITION} ease`,
                textTransform: "capitalize",
              }}
              fontFamily={FONT_STACK}
            >
              {node.label}
            </text>
          );
        })}

        {/* Hover tooltip — HTML foreignObject for proper wrapping */}
        {hoveredNode !== null && !selectedNode && !isEmpty && (() => {
          const node = nodeMap.get(hoveredNode);
          if (!node) return null;

          const nbrs = adjacency.neighbors.get(hoveredNode);
          const connectedLabels = nbrs
            ? [...nbrs].map((id) => nodeMap.get(id)?.label).filter(Boolean).slice(0, 3) as string[]
            : [];
          const stabilizerNode = nbrs
            ? [...nbrs].map((id) => nodeMap.get(id)).find((n) => n && n.cluster === 1)
            : null;
          const freq = Math.round(node.weight * 10) || 1;

          const tooltipW = 28;
          const tooltipH = 22;
          const rawX = node.x - tooltipW / 2;
          const rawY = node.y - node.size * 2 - tooltipH - 2;
          const clampedX = Math.max(1, Math.min(99 - tooltipW, rawX));
          const clampedY = Math.max(1, rawY);

          return (
            <foreignObject
              x={clampedX} y={clampedY}
              width={tooltipW} height={tooltipH}
              style={{ pointerEvents: "none", overflow: "visible" }}
            >
              <div
                style={{
                  background: tooltipColors.bg,
                  borderRadius: "1.8px",
                  padding: "1.6px 2px",
                  fontFamily: FONT_STACK,
                  opacity: 0.96,
                  boxShadow: "0 0.4px 1.2px hsl(270 20% 10% / 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6px",
                }}
              >
                {/* Accent dot + title */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1px" }}>
                  <div
                    style={{
                      width: "0.7px",
                      height: "0.7px",
                      borderRadius: "50%",
                      background: clusterColors.node[node.cluster],
                      marginTop: "0.5px",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: "2.4px",
                      fontWeight: 600,
                      color: tooltipColors.textPrimary,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.3,
                      textTransform: "capitalize",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {node.label}
                  </div>
                </div>
                <div style={{ fontSize: "1.8px", color: tooltipColors.textSecondary, lineHeight: 1.35 }}>
                  Appeared ~{freq} times
                </div>
                {connectedLabels.length > 0 && (
                  <div
                    style={{
                      fontSize: "1.8px",
                      color: tooltipColors.textMuted,
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    Often with: {connectedLabels.join(", ")}
                  </div>
                )}
                {stabilizerNode && (
                  <div style={{ fontSize: "1.8px", color: tooltipColors.textMuted, lineHeight: 1.35 }}>
                    Stabilizer: {stabilizerNode.label}
                  </div>
                )}
              </div>
            </foreignObject>
          );
        })()}
      </motion.svg>

      {/* ── Floating insight panel ─────────────────── */}
      <AnimatePresence>
        {selectedLayoutNode && insight && (
          <InsightPanel
            node={selectedLayoutNode}
            insight={insight}
            getPixelPos={getPixelPos}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Insight panel component ────────────────────── */

function InsightPanel({
  node,
  insight,
  getPixelPos,
  onClose,
}: {
  node: LayoutNode;
  insight: { chain: string; explanation: string; count: number };
  getPixelPos: (x: number, y: number) => { px: number; py: number };
  onClose: () => void;
}) {
  const { px, py } = getPixelPos(node.x, node.y);
  const panelWidth = 240;
  const clusterLabel = clusterNames[node.cluster] || "Signal";
  const dotColor = clusterColors.node[node.cluster];

  const flipLeft = px > 280;
  const left = flipLeft ? px - panelWidth - 16 : px + 16;
  const top = Math.max(8, py - 40);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 6 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute z-20 pointer-events-auto"
      style={{ left, top, width: panelWidth }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-[14px] border border-border/30 shadow-lg p-5 backdrop-blur-sm"
        style={{ background: "hsl(270 14% 18% / 0.97)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: tooltipColors.textMuted, fontFamily: FONT_STACK }}
            >
              {clusterLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs leading-none transition-colors"
            style={{ color: tooltipColors.textMuted }}
            aria-label="Close insight"
          >
            ✕
          </button>
        </div>
        <p
          className="mb-2.5 capitalize"
          style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: tooltipColors.textPrimary, fontFamily: FONT_STACK }}
        >
          {node.label}
        </p>
        <p
          className="leading-relaxed mb-2"
          style={{ fontSize: 13, color: tooltipColors.textSecondary, fontFamily: FONT_STACK }}
        >
          {insight.chain}
        </p>
        <p
          className="leading-snug mb-2.5"
          style={{ fontSize: 12, color: tooltipColors.textMuted, fontFamily: FONT_STACK }}
        >
          {insight.explanation}
        </p>
        <p
          className="italic"
          style={{ fontSize: 10, color: "hsl(268 12% 52%)", fontFamily: FONT_STACK }}
        >
          Observed {insight.count} times in the last 30 days
        </p>
      </div>
    </motion.div>
  );
}
