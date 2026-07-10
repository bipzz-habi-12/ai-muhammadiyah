import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_NODES = 40;
export const MAX_EDGES = 60;

export type CanvasNodeShape = "rectangle" | "diamond" | "ellipse";

export type CanvasNode = {
  id: string;
  position: { x: number; y: number };
  label: string;
  shape?: CanvasNodeShape;
};

export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type Canvas = {
  id: string;
  workspaceId: string;
  title: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

// The real migration column is `nodes` (jsonb, default '[]') — not `data` as
// an earlier draft assumed. We store the whole {nodes, edges} graph inside
// that single column, same "one jsonb blob" pattern as sheets.data.
type CanvasRow = {
  id: string;
  workspace_id: string;
  title: string;
  nodes: unknown;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

const validShapes: CanvasNodeShape[] = ["rectangle", "diamond", "ellipse"];

function isValidShape(value: unknown): value is CanvasNodeShape {
  return typeof value === "string" && validShapes.includes(value as CanvasNodeShape);
}

// nodes jsonb isn't trusted blindly — coerce it into a well-formed graph the
// same way lib/tasks.ts's normalizeTaskItem coerces its jsonb array. Edges
// referencing a node id that no longer exists are dropped (defensive against
// a corrupt/stale write, not just relied on to never happen client-side).
function normalizeGraph(raw: unknown): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const candidate =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const rawNodes = Array.isArray(candidate.nodes) ? candidate.nodes : [];
  const nodes: CanvasNode[] = rawNodes.slice(0, MAX_NODES).flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const node = item as Record<string, unknown>;
    const id = typeof node.id === "string" && node.id ? node.id : crypto.randomUUID();
    const position =
      node.position && typeof node.position === "object"
        ? (node.position as Record<string, unknown>)
        : {};
    const x = typeof position.x === "number" && Number.isFinite(position.x) ? position.x : 0;
    const y = typeof position.y === "number" && Number.isFinite(position.y) ? position.y : 0;
    const label = typeof node.label === "string" ? node.label : "";
    const shape = isValidShape(node.shape) ? node.shape : undefined;

    return [{ id, position: { x, y }, label, shape }];
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const rawEdges = Array.isArray(candidate.edges) ? candidate.edges : [];
  const edges: CanvasEdge[] = rawEdges.slice(0, MAX_EDGES).flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const edge = item as Record<string, unknown>;
    const source = typeof edge.source === "string" ? edge.source : "";
    const target = typeof edge.target === "string" ? edge.target : "";

    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) {
      return [];
    }

    const id = typeof edge.id === "string" && edge.id ? edge.id : crypto.randomUUID();
    const label = typeof edge.label === "string" ? edge.label : undefined;

    return [{ id, source, target, label }];
  });

  return { nodes, edges };
}

function mapCanvasRow(row: CanvasRow): Canvas {
  const graph = normalizeGraph(row.nodes);

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    nodes: graph.nodes,
    edges: graph.edges,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const canvasColumns = "id,workspace_id,title,nodes,source_ref,created_at,updated_at";

export async function listCanvases(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("canvases")
    .select(canvasColumns)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CanvasRow[]).map(mapCanvasRow);
}

export async function createCanvas(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    title?: string;
    nodes?: CanvasNode[];
    edges?: CanvasEdge[];
    sourceRef?: string | null;
  },
) {
  const nodes = (input.nodes ?? []).slice(0, MAX_NODES);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = (input.edges ?? [])
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, MAX_EDGES);

  const { data, error } = await supabase
    .from("canvases")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title?.trim() || "Untitled",
      nodes: { nodes, edges },
      source_ref: input.sourceRef ?? null,
    })
    .select(canvasColumns)
    .single();

  if (error || !data) {
    throw error ?? new Error("Canvas belum bisa dibuat.");
  }

  return mapCanvasRow(data as CanvasRow);
}

export async function updateCanvas(
  supabase: SupabaseClient,
  id: string,
  patch: { title?: string; nodes?: CanvasNode[]; edges?: CanvasEdge[] },
) {
  const update: Record<string, unknown> = {};

  if (typeof patch.title === "string") {
    update.title = patch.title.trim() || "Untitled";
  }

  if (patch.nodes || patch.edges) {
    const nodes = (patch.nodes ?? []).slice(0, MAX_NODES);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = (patch.edges ?? [])
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .slice(0, MAX_EDGES);
    update.nodes = { nodes, edges };
  }

  const { data, error } = await supabase
    .from("canvases")
    .update(update)
    .eq("id", id)
    .select(canvasColumns)
    .single();

  if (error || !data) {
    return null;
  }

  return mapCanvasRow(data as CanvasRow);
}

export async function deleteCanvas(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("canvases")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

// This is appended after AI Muhammadiyah's shared "always use clean Markdown
// with headings/bullets/tables" style prompt (see responseStyleSystemPrompt
// in lib/ai/chat.ts) — that instruction conflicts with "JSON only" here the
// same way it broke Sheets' generate-from-chat (see lib/sheets.ts). The
// override line below is a best-effort nudge, not relied on alone —
// parseGeneratedCanvas() below has an arrow-relation Markdown fallback.
export const CANVAS_EXTRACTOR_SYSTEM_PROMPT = [
  "You extract entities/concepts and their relationships from a chat conversation for AI Muhammadiyah's",
  "Canvas tool (a flexible node+edge board used freely as a flowchart, mind map, or whiteboard).",
  "Read the conversation and identify concrete entities, steps, or concepts, and how they relate to",
  "each other — not a general summary.",
  "This response is consumed directly by a program, not shown to the user as-is — general",
  "Markdown/formatting style instructions do NOT apply here, they apply to normal chat replies only.",
  "Respond with ONLY a raw JSON object: no markdown code fences, no ``` blocks, no explanation before",
  "or after. The very first character of your response must be '{'. Use exactly this shape:",
  '{"title": "short canvas title", "nodes": [{"label": "entity or step", "shape": "rectangle"}],',
  '"edges": [{"sourceIndex": 0, "targetIndex": 1, "label": "optional relation label"}]}',
  '`shape` is optional: "rectangle" (default, general concept/step), "diamond" (decision point),',
  '"ellipse" (start/end point) — only set it when it clearly fits, omit it otherwise.',
  "`sourceIndex`/`targetIndex` are 0-based positions into the `nodes` array above, not ids.",
  `Use at most ${MAX_NODES} nodes and ${MAX_EDGES} edges.`,
  "If there are no clear entities or relationships in the conversation, respond with an empty graph:",
  '{"title": "Canvas dari chat", "nodes": [], "edges": []}',
  "Write in the same language the conversation is mostly in (Indonesian or English).",
].join(" ");

export type GeneratedCanvasNode = { label: string; shape?: CanvasNodeShape };
export type GeneratedCanvasEdge = {
  sourceIndex: number;
  targetIndex: number;
  label?: string;
};
export type GeneratedCanvas = {
  title: string;
  nodes: GeneratedCanvasNode[];
  edges: GeneratedCanvasEdge[];
  truncated: boolean;
};

function clampGeneratedGraph(
  title: string,
  rawNodes: GeneratedCanvasNode[],
  rawEdges: { sourceIndex: number; targetIndex: number; label?: string }[],
): GeneratedCanvas {
  const wasTooBig = rawNodes.length > MAX_NODES || rawEdges.length > MAX_EDGES;
  const nodes = rawNodes.slice(0, MAX_NODES);
  const edges = rawEdges
    .filter(
      (edge) =>
        edge.sourceIndex >= 0 &&
        edge.sourceIndex < nodes.length &&
        edge.targetIndex >= 0 &&
        edge.targetIndex < nodes.length,
    )
    .slice(0, MAX_EDGES);

  return { title, nodes, edges, truncated: wasTooBig };
}

// Scans for the first syntactically-balanced {...} object in the text,
// respecting string literals — mirrors extractFirstJsonObject in
// lib/sheets.ts (kept as a separate copy here since the two domains'
// resulting shapes differ enough that sharing isn't worth a coupling).
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function tryParseJsonCanvas(aiText: string): GeneratedCanvas | null {
  const candidates = [aiText.trim()];
  const fencedMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    candidates.push(fencedMatch[1].trim());
  }

  const balancedObject = extractFirstJsonObject(aiText);

  if (balancedObject) {
    candidates.push(balancedObject);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;

      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes)) {
        continue;
      }

      const title =
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim()
          : "Canvas dari chat";

      const rawNodes: GeneratedCanvasNode[] = parsed.nodes
        .map((item): GeneratedCanvasNode | null => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const node = item as Record<string, unknown>;

          if (typeof node.label !== "string" || !node.label.trim()) {
            return null;
          }

          return {
            label: node.label.trim(),
            shape: isValidShape(node.shape) ? node.shape : undefined,
          };
        })
        .filter((node): node is GeneratedCanvasNode => node !== null);

      const rawEdgesInput = Array.isArray(parsed.edges) ? parsed.edges : [];
      const rawEdges: { sourceIndex: number; targetIndex: number; label?: string }[] =
        rawEdgesInput
          .map((item): { sourceIndex: number; targetIndex: number; label?: string } | null => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const edge = item as Record<string, unknown>;
            const sourceIndex = Number(edge.sourceIndex);
            const targetIndex = Number(edge.targetIndex);

            if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex)) {
              return null;
            }

            return {
              sourceIndex,
              targetIndex,
              label: typeof edge.label === "string" ? edge.label : undefined,
            };
          })
          .filter(
            (edge): edge is { sourceIndex: number; targetIndex: number; label?: string } =>
              edge !== null,
          );

      return clampGeneratedGraph(title, rawNodes, rawEdges);
    } catch {
      continue;
    }
  }

  return null;
}

const arrowPattern = /\s*(?:-->|->|=>|→)\s*/;
const listItemPrefixPattern = /^\s*(?:[-*•]|\d+[.)])\s+/;

// Fallback for when the model ignores the JSON-only instruction and replies
// with plain text instead — the shared response-style prompt nudges toward
// Markdown, and for "entities and relationships" the natural drift is either
// a bullet list of concepts or arrow-style relation lines ("A -> B"), which
// is common flowchart pseudo-syntax. Builds nodes from first mention (an
// entity seen in an earlier arrow line reuses that node instead of
// duplicating it) and edges from the arrow lines.
function parseArrowRelationCanvas(aiText: string): GeneratedCanvas | null {
  const nodeIndexByLabel = new Map<string, number>();
  const nodes: GeneratedCanvasNode[] = [];
  const edges: { sourceIndex: number; targetIndex: number; label?: string }[] = [];

  const getOrCreateNodeIndex = (rawLabel: string): number | null => {
    const label = rawLabel.trim();

    if (!label) {
      return null;
    }

    const key = label.toLowerCase();
    const existing = nodeIndexByLabel.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const index = nodes.length;
    nodes.push({ label });
    nodeIndexByLabel.set(key, index);
    return index;
  };

  let title = "Canvas dari chat";
  let sawAnyLine = false;

  for (const rawLine of aiText.split("\n")) {
    const withoutPrefix = rawLine.replace(listItemPrefixPattern, "");
    const line = withoutPrefix.trim();

    if (!line) {
      continue;
    }

    if (arrowPattern.test(line)) {
      const [fromPart, ...restParts] = line.split(arrowPattern);
      const toPart = restParts.join(" ");
      // Support an optional ": label" suffix on the target side, e.g.
      // "A -> B: some relation detail".
      const labelSplit = toPart.match(/^(.+?):\s*(.+)$/);
      const toLabel = labelSplit ? labelSplit[1] : toPart;
      const edgeLabel = labelSplit ? labelSplit[2].trim() : undefined;

      const sourceIndex = getOrCreateNodeIndex(fromPart);
      const targetIndex = getOrCreateNodeIndex(toLabel);

      if (sourceIndex !== null && targetIndex !== null) {
        edges.push({ sourceIndex, targetIndex, label: edgeLabel });
        sawAnyLine = true;
      }

      continue;
    }

    if (listItemPrefixPattern.test(rawLine)) {
      if (getOrCreateNodeIndex(line) !== null) {
        sawAnyLine = true;
      }

      continue;
    }

    if (!sawAnyLine && line.startsWith("#")) {
      title = line.replace(/^#+\s*/, "").trim() || title;
    }
  }

  if (!sawAnyLine) {
    return null;
  }

  return clampGeneratedGraph(title, nodes, edges);
}

// Parses the AI's response into a generated graph. Tries strict JSON first
// (the documented contract), then falls back to an arrow-relation/bullet-list
// Markdown parse (the realistic failure mode — see the comment above
// CANVAS_EXTRACTOR_SYSTEM_PROMPT). Returns null only if neither succeeds —
// the caller should surface a clear error rather than create an empty or
// corrupt canvas.
export function parseGeneratedCanvas(aiText: string): GeneratedCanvas | null {
  return tryParseJsonCanvas(aiText) ?? parseArrowRelationCanvas(aiText);
}

// --- Browser-side fetch wrappers (used by hooks/useCanvases.ts) ---

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string) {
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

export async function fetchCanvases(workspaceId: string) {
  const response = await fetch(
    `/api/canvases?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "GET", cache: "no-store" },
  );
  const data = await parseJsonOrThrow<{ canvases: Canvas[] }>(
    response,
    "Canvas belum bisa dimuat.",
  );

  return data.canvases ?? [];
}

export async function createCanvasRequest(input: {
  workspaceId: string;
  title?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  sourceRef?: string | null;
}) {
  const response = await fetch("/api/canvases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ canvas: Canvas }>(
    response,
    "Canvas belum bisa dibuat.",
  );

  return data.canvas;
}

export async function updateCanvasRequest(
  id: string,
  patch: { title?: string; nodes?: CanvasNode[]; edges?: CanvasEdge[] },
) {
  const response = await fetch(`/api/canvases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonOrThrow<{ canvas: Canvas }>(
    response,
    "Canvas belum bisa disimpan.",
  );

  return data.canvas;
}

export async function deleteCanvasRequest(id: string) {
  const response = await fetch(`/api/canvases/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await parseJsonOrThrow<{ ok: boolean }>(response, "Canvas belum bisa dihapus.");
}

export async function generateCanvasFromChat(input: {
  workspaceId: string;
  conversationId: string;
}) {
  const response = await fetch("/api/canvases/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ canvas: Canvas; truncated: boolean }>(
    response,
    "Canvas belum bisa digenerate.",
  );

  return data;
}
