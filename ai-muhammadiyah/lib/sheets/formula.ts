// Pure spreadsheet-formula evaluator for the Sheets tool. No Supabase/React
// dependency — testable standalone (see app/dev-sheets-formula-scratch/route.ts).
//
// v1 scope only: +, -, *, / with parentheses, plus SUM/AVERAGE/COUNT over a
// single A1:B2-style range. Cell addresses are purely positional (column
// index -> letter, row index -> number) and are independent of the grid's
// `columns` header labels — see lib/sheets.ts for that split.

export const MAX_COLUMNS = 26;
export const MAX_ROWS = 50;

export type Grid = { columns: string[]; rows: string[][] };

export function columnLetterToIndex(letter: string): number {
  let index = 0;

  for (let i = 0; i < letter.length; i += 1) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }

  return index - 1;
}

export function indexToColumnLetter(index: number): string {
  let n = index + 1;
  let letters = "";

  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }

  return letters || "A";
}

type ErrorCode = "#CIRCULAR!" | "#REF!" | "#ERROR!";

class FormulaError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.code = code;
  }
}

type Resolved =
  | { kind: "blank" }
  | { kind: "number"; value: number }
  | { kind: "text"; value: string };

interface EvalContext {
  rows: string[][];
  numCols: number;
  visiting: Set<string>;
  memo: Map<string, Resolved | { kind: "error"; code: ErrorCode }>;
}

function parseCellRef(ref: string): { row: number; col: number } | null {
  const match = ref.match(/^([A-Z]+)([0-9]+)$/);

  if (!match) {
    return null;
  }

  const col = columnLetterToIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;

  if (row < 0) {
    return null;
  }

  return { row, col };
}

function evaluateCellInternal(ctx: EvalContext, row: number, col: number): Resolved {
  const key = `${row},${col}`;
  const cached = ctx.memo.get(key);

  if (cached) {
    if (cached.kind === "error") {
      throw new FormulaError(cached.code);
    }

    return cached;
  }

  if (row < 0 || row >= ctx.rows.length || col < 0 || col >= ctx.numCols) {
    throw new FormulaError("#REF!");
  }

  if (ctx.visiting.has(key)) {
    throw new FormulaError("#CIRCULAR!");
  }

  const raw = String(ctx.rows[row]?.[col] ?? "");

  if (!raw.trim().startsWith("=")) {
    const trimmed = raw.trim();

    if (trimmed === "") {
      const resolved: Resolved = { kind: "blank" };
      ctx.memo.set(key, resolved);
      return resolved;
    }

    const num = Number(trimmed);

    if (Number.isFinite(num)) {
      const resolved: Resolved = { kind: "number", value: num };
      ctx.memo.set(key, resolved);
      return resolved;
    }

    const resolved: Resolved = { kind: "text", value: trimmed };
    ctx.memo.set(key, resolved);
    return resolved;
  }

  ctx.visiting.add(key);

  try {
    const tokens = tokenize(raw.trim().slice(1));
    const state: ParserState = { tokens, pos: 0, ctx };
    const value = parseExpr(state);

    if (state.pos !== tokens.length) {
      throw new FormulaError("#ERROR!");
    }

    const resolved: Resolved = { kind: "number", value };
    ctx.visiting.delete(key);
    ctx.memo.set(key, resolved);
    return resolved;
  } catch (err) {
    ctx.visiting.delete(key);
    const code = err instanceof FormulaError ? err.code : "#ERROR!";
    ctx.memo.set(key, { kind: "error", code });
    throw new FormulaError(code);
  }
}

function resolveRefNumeric(ctx: EvalContext, refStr: string): number {
  const parsed = parseCellRef(refStr);

  if (!parsed) {
    throw new FormulaError("#ERROR!");
  }

  const resolved = evaluateCellInternal(ctx, parsed.row, parsed.col);

  if (resolved.kind === "blank") {
    return 0;
  }

  if (resolved.kind === "number") {
    return resolved.value;
  }

  // Text operand in direct arithmetic — matches spreadsheet convention where
  // functions (SUM/AVERAGE/COUNT) silently skip text but arithmetic errors.
  throw new FormulaError("#ERROR!");
}

// AVERAGE/COUNT treat non-numeric cells in a range as absent, not zero — a
// range of all-blank/all-text cells makes AVERAGE divide-by-zero, reported
// as #ERROR! rather than NaN/Infinity.
function applyFunction(
  name: string,
  startRef: string,
  endRef: string,
  ctx: EvalContext,
): number {
  const start = parseCellRef(startRef);
  const end = parseCellRef(endRef);

  if (!start || !end) {
    throw new FormulaError("#ERROR!");
  }

  const rowStart = Math.min(start.row, end.row);
  const rowEnd = Math.max(start.row, end.row);
  const colStart = Math.min(start.col, end.col);
  const colEnd = Math.max(start.col, end.col);

  const numbers: number[] = [];

  for (let r = rowStart; r <= rowEnd; r += 1) {
    for (let c = colStart; c <= colEnd; c += 1) {
      const resolved = evaluateCellInternal(ctx, r, c);

      if (resolved.kind === "number") {
        numbers.push(resolved.value);
      }
    }
  }

  if (name === "SUM") {
    return numbers.reduce((total, value) => total + value, 0);
  }

  if (name === "COUNT") {
    return numbers.length;
  }

  if (name === "AVERAGE") {
    if (numbers.length === 0) {
      throw new FormulaError("#ERROR!");
    }

    return numbers.reduce((total, value) => total + value, 0) / numbers.length;
  }

  throw new FormulaError("#ERROR!");
}

// --- Tokenizer + recursive-descent parser ---------------------------------

type Token =
  | { type: "num"; value: number }
  | { type: "ref"; value: string }
  | { type: "range"; start: string; end: string }
  | { type: "func"; name: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (ch === " " || ch === "\t") {
      i += 1;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i += 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i += 1;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;

      while (j < expr.length && /[0-9.]/.test(expr[j])) {
        j += 1;
      }

      const numStr = expr.slice(i, j);

      if (!/^[0-9]*\.?[0-9]+$/.test(numStr)) {
        throw new FormulaError("#ERROR!");
      }

      tokens.push({ type: "num", value: Number(numStr) });
      i = j;
      continue;
    }

    if (/[A-Za-z]/.test(ch)) {
      let j = i;

      while (j < expr.length && /[A-Za-z]/.test(expr[j])) {
        j += 1;
      }

      let k = j;

      while (k < expr.length && /[0-9]/.test(expr[k])) {
        k += 1;
      }

      if (k > j) {
        // Letters immediately followed by digits => a cell reference,
        // optionally the start of an A1:B2 range.
        const refStr = expr.slice(i, k).toUpperCase();

        if (expr[k] === ":") {
          let m = k + 1;

          while (m < expr.length && /[A-Za-z]/.test(expr[m])) {
            m += 1;
          }

          let n = m;

          while (n < expr.length && /[0-9]/.test(expr[n])) {
            n += 1;
          }

          if (n === m) {
            throw new FormulaError("#ERROR!");
          }

          const endRef = expr.slice(k + 1, n).toUpperCase();
          tokens.push({ type: "range", start: refStr, end: endRef });
          i = n;
          continue;
        }

        tokens.push({ type: "ref", value: refStr });
        i = k;
        continue;
      }

      // Pure letters with no trailing digits — must be a function name.
      if (expr[j] !== "(") {
        throw new FormulaError("#ERROR!");
      }

      tokens.push({ type: "func", name: expr.slice(i, j).toUpperCase() });
      i = j;
      continue;
    }

    throw new FormulaError("#ERROR!");
  }

  return tokens;
}

interface ParserState {
  tokens: Token[];
  pos: number;
  ctx: EvalContext;
}

function peek(state: ParserState): Token | undefined {
  return state.tokens[state.pos];
}

function parseExpr(state: ParserState): number {
  let value = parseTerm(state);

  for (;;) {
    const token = peek(state);

    if (!token || token.type !== "op" || (token.value !== "+" && token.value !== "-")) {
      break;
    }

    state.pos += 1;
    const rhs = parseTerm(state);
    value = token.value === "+" ? value + rhs : value - rhs;
  }

  return value;
}

function parseTerm(state: ParserState): number {
  let value = parseFactor(state);

  for (;;) {
    const token = peek(state);

    if (!token || token.type !== "op" || (token.value !== "*" && token.value !== "/")) {
      break;
    }

    state.pos += 1;
    const rhs = parseFactor(state);
    value = token.value === "*" ? value * rhs : value / rhs;
  }

  return value;
}

function parseFactor(state: ParserState): number {
  const token = peek(state);

  if (!token) {
    throw new FormulaError("#ERROR!");
  }

  if (token.type === "num") {
    state.pos += 1;
    return token.value;
  }

  if (token.type === "op" && token.value === "-") {
    state.pos += 1;
    return -parseFactor(state);
  }

  if (token.type === "lparen") {
    state.pos += 1;
    const value = parseExpr(state);

    if (peek(state)?.type !== "rparen") {
      throw new FormulaError("#ERROR!");
    }

    state.pos += 1;
    return value;
  }

  if (token.type === "ref") {
    state.pos += 1;
    return resolveRefNumeric(state.ctx, token.value);
  }

  if (token.type === "func") {
    state.pos += 1;

    if (peek(state)?.type !== "lparen") {
      throw new FormulaError("#ERROR!");
    }

    state.pos += 1;
    const rangeToken = peek(state);

    if (rangeToken?.type !== "range") {
      throw new FormulaError("#ERROR!");
    }

    state.pos += 1;

    if (peek(state)?.type !== "rparen") {
      throw new FormulaError("#ERROR!");
    }

    state.pos += 1;
    return applyFunction(token.name, rangeToken.start, rangeToken.end, state.ctx);
  }

  throw new FormulaError("#ERROR!");
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "#ERROR!";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Math.round(value * 1e10) / 1e10);
}

// Evaluates a single cell in isolation (own context/memo) — used by the
// formula smoke-test harness. UI code should prefer evaluateGrid, which
// shares one context across the whole grid for a single render pass.
export function evaluateCellValue(
  rows: string[][],
  numCols: number,
  row: number,
  col: number,
): string {
  const ctx: EvalContext = { rows, numCols, visiting: new Set(), memo: new Map() };

  try {
    const resolved = evaluateCellInternal(ctx, row, col);

    if (resolved.kind === "blank") {
      return "";
    }

    if (resolved.kind === "number") {
      return formatNumber(resolved.value);
    }

    return resolved.value;
  } catch (err) {
    return err instanceof FormulaError ? err.code : "#ERROR!";
  }
}

// Full-grid recompute, shared context/memo across all cells in this pass.
// Called on every render — grids are small (cap 50x26) so this is cheap
// enough that cross-render memoization/dependency-graph tracking isn't
// worth the complexity for v1.
export function evaluateGrid(grid: Grid): string[][] {
  const ctx: EvalContext = {
    rows: grid.rows,
    numCols: grid.columns.length,
    visiting: new Set(),
    memo: new Map(),
  };

  return grid.rows.map((row, rowIndex) =>
    row.map((_, colIndex) => {
      try {
        const resolved = evaluateCellInternal(ctx, rowIndex, colIndex);

        if (resolved.kind === "blank") {
          return "";
        }

        if (resolved.kind === "number") {
          return formatNumber(resolved.value);
        }

        return resolved.value;
      } catch (err) {
        return err instanceof FormulaError ? err.code : "#ERROR!";
      }
    }),
  );
}
