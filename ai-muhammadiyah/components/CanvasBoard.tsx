"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SparkIcon, Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import { MAX_EDGES, MAX_NODES, type Canvas, type CanvasEdge, type CanvasNode } from "@/lib/canvas";

interface CanvasBoardProps {
  canvas: Canvas | undefined;
  isSaving: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  activeConversationTitle: string | undefined;
  lastTruncated: boolean;
  onClearTruncated: () => void;
  onTitleChange: (title: string) => void;
  onGraphChange: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  onAddNode: () => void;
  onDelete: (id: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}

const shapeBorderColor: Record<NonNullable<CanvasNode["shape"]>, string> = {
  rectangle: "#004d27",
  diamond: "#fdc003",
  ellipse: "#006837",
};

function toFlowNode(node: CanvasNode): Node {
  const shape = node.shape ?? "rectangle";

  return {
    id: node.id,
    position: node.position,
    data: { label: node.label },
    type: "default",
    style: {
      borderRadius: shape === "ellipse" ? 999 : shape === "diamond" ? 4 : 12,
      transform: shape === "diamond" ? "rotate(45deg)" : undefined,
      border: `2px solid ${shapeBorderColor[shape]}`,
      background: "#ffffff",
      color: "#191c1d",
      fontSize: 13,
      fontWeight: 600,
      padding: "8px 14px",
    },
  };
}

function toFlowEdge(edge: CanvasEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    style: { stroke: "#bec9be" },
    labelStyle: { fill: "#3f4940", fontSize: 11, fontWeight: 600 },
  };
}

export default function CanvasBoard({
  canvas,
  isSaving,
  isGenerating,
  canGenerate,
  activeConversationTitle,
  lastTruncated,
  onClearTruncated,
  onTitleChange,
  onGraphChange,
  onAddNode,
  onDelete,
  onGenerate,
  onClose,
}: CanvasBoardProps) {
  const flowNodes = useMemo(
    () => (canvas ? canvas.nodes.map(toFlowNode) : []),
    [canvas],
  );
  const flowEdges = useMemo(
    () => (canvas ? canvas.edges.map(toFlowEdge) : []),
    [canvas],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      if (!canvas) {
        return;
      }

      const nextFlowNodes = applyNodeChanges<Node>(changes, flowNodes);
      const nextIds = new Set(nextFlowNodes.map((node) => node.id));
      const nextNodes: CanvasNode[] = nextFlowNodes.map((flowNode) => {
        const original = canvas.nodes.find((node) => node.id === flowNode.id);

        return {
          id: flowNode.id,
          position: flowNode.position,
          label: original?.label ?? "",
          shape: original?.shape,
        };
      });
      // A removed node must drop its edges too, otherwise saved data would
      // carry orphaned edges pointing at an id that no longer exists.
      const nextEdges = canvas.edges.filter(
        (edge) => nextIds.has(edge.source) && nextIds.has(edge.target),
      );

      onGraphChange(nextNodes, nextEdges);
    },
    [canvas, flowNodes, onGraphChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (!canvas) {
        return;
      }

      const nextFlowEdges = applyEdgeChanges<Edge>(changes, flowEdges);
      const nextEdges: CanvasEdge[] = nextFlowEdges.map((flowEdge) => ({
        id: flowEdge.id,
        source: flowEdge.source,
        target: flowEdge.target,
        label: typeof flowEdge.label === "string" ? flowEdge.label : undefined,
      }));

      onGraphChange(canvas.nodes, nextEdges);
    },
    [canvas, flowEdges, onGraphChange],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!canvas || canvas.edges.length >= MAX_EDGES) {
        return;
      }

      const nextFlowEdges = addEdge<Edge>(connection, flowEdges);
      const nextEdges: CanvasEdge[] = nextFlowEdges.map((flowEdge) => ({
        id: flowEdge.id,
        source: flowEdge.source,
        target: flowEdge.target,
        label: typeof flowEdge.label === "string" ? flowEdge.label : undefined,
      }));

      onGraphChange(canvas.nodes, nextEdges);
    },
    [canvas, flowEdges, onGraphChange],
  );

  if (!canvas) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-[#6f7a70]">
        <Icon name="canvas" className="h-8 w-8 text-[#bec9be]" />
        <p>Pilih canvas dari daftar, atau buat canvas baru.</p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          title={
            canGenerate
              ? activeConversationTitle
                ? `Generate dari "${activeConversationTitle}"`
                : "Generate dari chat ini"
              : "Buka percakapan dulu untuk generate"
          }
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SparkIcon className="h-4 w-4" />
          {isGenerating ? "Menggenerate..." : "Generate dari chat ini"}
        </button>
      </section>
    );
  }

  const nodeCap = canvas.nodes.length >= MAX_NODES;

  return (
    <section className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#bec9be] bg-white p-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-sm font-bold text-[#3f4940] hover:text-[#004d27] md:hidden"
        >
          <span aria-hidden="true">←</span>
        </button>

        <input
          value={canvas.title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Judul canvas"
          className="min-w-0 flex-1 bg-transparent text-lg font-bold text-[#191c1d] outline-none placeholder:text-[#6f7a70]"
        />

        <span className="rounded-full bg-[#f3f4f5] px-3 py-1 text-xs font-bold text-[#3f4940]">
          {isSaving ? "Menyimpan..." : "Tersimpan"}
        </span>
        <span className="hidden text-xs text-[#6f7a70] sm:inline">
          {formatRelativeTime(canvas.updatedAt)}
        </span>

        <button
          type="button"
          onClick={onAddNode}
          disabled={nodeCap}
          title={nodeCap ? `Maks ${MAX_NODES} node` : "Tambah node"}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Node
        </button>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          title={
            canGenerate
              ? activeConversationTitle
                ? `Generate dari "${activeConversationTitle}"`
                : "Generate dari chat ini"
              : "Buka percakapan dulu untuk generate"
          }
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SparkIcon className="h-4 w-4" />
          {isGenerating ? "Menggenerate..." : "Generate dari chat"}
        </button>

        <button
          type="button"
          onClick={() => onDelete(canvas.id)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6]"
        >
          <Icon name="trash" className="h-4 w-4" />
          Hapus
        </button>
      </div>

      {lastTruncated && (
        <p className="flex items-center justify-between gap-3 bg-[#fdc003]/20 p-3 text-sm font-semibold text-[#6c5000]">
          <span>Hasil generate dipotong ke batas {MAX_NODES} node × {MAX_EDGES} edge.</span>
          <button
            type="button"
            onClick={onClearTruncated}
            className="shrink-0 text-xs font-bold underline"
          >
            Tutup
          </button>
        </p>
      )}

      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#bec9be" gap={20} />
          <Controls />
          <MiniMap
            nodeColor="#004d27"
            maskColor="rgba(25, 28, 29, 0.06)"
            style={{ background: "#f3f4f5" }}
          />
        </ReactFlow>
      </div>
    </section>
  );
}
