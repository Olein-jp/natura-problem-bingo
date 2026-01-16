import type { BingoCell, BingoGrid, GradeCode, Problem } from "@/lib/types";
import { sampleUnique, shuffle } from "@/lib/random";

function centerPos(size: number) {
  return { r: Math.floor(size / 2), c: Math.floor(size / 2) };
}

function neighborPenalty(grid: (BingoCell | null)[][], r: number, c: number, grade: GradeCode) {
  // 上下左右のみ
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  let score = 0;
  for (const [dr, dc] of dirs) {
    const rr = r + dr;
    const cc = c + dc;
    const cell = grid[rr]?.[cc];
    if (!cell) continue;
    if (cell.kind === "problem" && cell.grade === grade) score += 10;
  }
  return score;
}

function totalPenalty(grid: BingoGrid) {
  let score = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      const cell = grid[r][c];
      if (cell.kind !== "problem") continue;

      // 右と下だけ見て二重カウント回避
      const right = grid[r]?.[c + 1];
      const down = grid[r + 1]?.[c];

      if (right?.kind === "problem" && right.grade === cell.grade) score += 10;
      if (down?.kind === "problem" && down.grade === cell.grade) score += 10;
    }
  }
  return score;
}

export function canUseFree(size: number) {
  return size === 3 || size === 5;
}

export function generateBingoGrid(opts: {
  size: 3 | 4 | 5;
  freeEnabled: boolean;
  problems: Problem[];
  maxTries?: number;
}): BingoGrid {
  const { size, problems } = opts;
  const freeEnabled = opts.freeEnabled && canUseFree(size);
  const total = size * size;
  const need = freeEnabled ? total - 1 : total;

  if (problems.length < need) {
    throw new Error(`課題数が足りません（必要: ${need} / 現在: ${problems.length}）`);
  }

  const maxTries = opts.maxTries ?? 140;

  let bestGrid: BingoGrid | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const picked = sampleUnique(problems, need);

    const working: (BingoCell | null)[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => null),
    );

    if (freeEnabled) {
      const pos = centerPos(size);
      working[pos.r][pos.c] = { kind: "free" };
    }

    // 埋め順もシャッフルして偏りを減らす
    const coords = shuffle(
      Array.from({ length: total }, (_, i) => ({ r: Math.floor(i / size), c: i % size })).filter(
        ({ r, c }) => working[r][c] === null,
      ),
    );

    let pool = [...picked];

    for (const { r, c } of coords) {
      let bestIdx = -1;
      let bestLocal = Number.POSITIVE_INFINITY;

      for (let i = 0; i < pool.length; i++) {
        const cand = pool[i];
        const p = neighborPenalty(working, r, c, cand.grade);
        if (p < bestLocal) {
          bestLocal = p;
          bestIdx = i;
          if (bestLocal === 0) break;
        }
      }

      if (bestIdx === -1) break;

      const chosen = pool.splice(bestIdx, 1)[0];
      working[r][c] = { kind: "problem", key: chosen.key, grade: chosen.grade };
    }

    const failed = working.some((row) => row.some((cell) => cell === null));
    if (failed) continue;

    const grid = working as BingoGrid;
    const score = totalPenalty(grid);

    if (score < bestScore) {
      bestScore = score;
      bestGrid = grid;
      if (bestScore === 0) break;
    }
  }

  if (!bestGrid) throw new Error("生成に失敗しました");
  return bestGrid;
}
