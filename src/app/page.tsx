"use client";

import data from "@/data/bouldering.json";
import type { DataSet, GradeCode, Mode } from "@/lib/types";
import { generateBingoGrid, canUseFree } from "@/lib/bingo";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";

const DATA = data as unknown as DataSet;

// 共通：チップのベース（ToggleGroupItem用）
const CHIP_BASE =
  "rounded-full px-4 py-2 text-sm transition-all border " +
  "shadow-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// 非選択：背景は薄く、文字は読める濃さ（ライト/ダーク両対応）
const CHIP_OFF = "bg-muted/40 text-foreground/80 hover:bg-accent hover:text-foreground";

// 選択：data-state=on を素直にクラスで指定（Tailwindに確実に拾わせる）
const CHIP_ON =
  "data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:border-foreground data-[state=on]:shadow-sm";

function formatDateTimeJP(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
}

export default function HomePage() {
  const grades = DATA.grades;
  const allGradeCodes = useMemo(() => Object.keys(grades) as GradeCode[], [grades]);

  const [mode, setMode] = useState<Mode>("adult");
  const [size, setSize] = useState<3 | 4 | 5>(3);
  const [freeEnabled, setFreeEnabled] = useState(true);
  const [selectedGrades, setSelectedGrades] = useState<GradeCode[]>(["5-6", "4"]);

  const [grid, setGrid] = useState<ReturnType<typeof generateBingoGrid> | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const filteredProblems = useMemo(() => {
    return DATA.problems.filter((p) => {
      if (mode === "kid" && !p.kid) return false;
      if (mode === "adult" && p.kid) return false;
      if (!selectedGrades.includes(p.grade)) return false;
      return true;
    });
  }, [mode, selectedGrades]);

  const freeAllowed = canUseFree(size);
  const actualFree = freeAllowed ? freeEnabled : false;

  function onGenerate() {
    setError(null);
    try {
      const g = generateBingoGrid({
        size,
        freeEnabled: actualFree,
        problems: filteredProblems,
      });
      setGrid(g);
      setGeneratedAt(new Date());
    } catch (e) {
      setGrid(null);
      setGeneratedAt(null);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  }

  async function onExportPng() {
    if (!boardRef.current) return;
    const dataUrl = await toPng(boardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "white",
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `bingo-${mode}-${size}x${size}.png`;
    a.click();
  }

  const conditionText = useMemo(() => {
    const gradeLabels = selectedGrades
      .map((code) => grades[code]?.label ?? code)
      .join(", ");
    return `${mode === "kid" ? "子供用" : "大人用"} / ${size}×${size}${actualFree ? " / FREEあり" : ""} / ${gradeLabels}`;
  }, [mode, size, actualFree, selectedGrades, grades]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/50">
      <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="space-y-0.5">
            <h1 className="text-lg font-semibold leading-none">Natura Bingo</h1>
            <p className="text-xs text-muted-foreground">条件を選んでビンゴを生成 → PNGで保存</p>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Left: Controls */}
          <section className="space-y-6">
            {/* 1) モード */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">モード</CardTitle>
              </CardHeader>
              <CardContent>
                <ToggleGroup
                  type="single"
                  value={mode}
                  onValueChange={(v) => v && setMode(v as Mode)}
                  className="flex flex-wrap gap-2 justify-start"
                >
                  <ToggleGroupItem value="kid" className={`${CHIP_BASE} ${CHIP_OFF} ${CHIP_ON}`}>
                    子供用
                  </ToggleGroupItem>
                  <ToggleGroupItem value="adult" className={`${CHIP_BASE} ${CHIP_OFF} ${CHIP_ON}`}>
                    大人用
                  </ToggleGroupItem>
                </ToggleGroup>
              </CardContent>
            </Card>

            {/* 2) グレード */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">グレード</CardTitle>
              </CardHeader>
              <CardContent>
                <ToggleGroup
                  type="multiple"
                  value={selectedGrades}
                  onValueChange={(v) => setSelectedGrades(v as GradeCode[])}
                  className="flex flex-wrap gap-2 justify-start"
                >
                  {allGradeCodes.map((code) => {
                    const g = grades[code];
                    const isActive = selectedGrades.includes(code);

                    return (
                      <ToggleGroupItem
                        key={code}
                        value={code}
                        className={`${CHIP_BASE} ${isActive ? "shadow-sm" : CHIP_OFF}`}
                        style={
                          isActive
                            ? {
                                backgroundColor: g.bgColor,
                                color: g.fontColor,
                                borderColor: g.bgColor,
                              }
                            : undefined
                        }
                      >
                        {g.label}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    抽選対象：<span className="font-medium text-foreground">{filteredProblems.length}</span> 件
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="rounded-full"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedGrades(allGradeCodes)}
                    >
                      全部選択
                    </Button>
                    <Button className="rounded-full" variant="outline" size="sm" onClick={() => setSelectedGrades([])}>
                      全部解除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3) ビンゴ設定 */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">ビンゴ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>サイズ</Label>
                  <ToggleGroup
                    type="single"
                    value={String(size)}
                    onValueChange={(v) => v && setSize(Number(v) as 3 | 4 | 5)}
                    className="flex flex-wrap gap-2 justify-start"
                  >
                    <ToggleGroupItem value="3" className={`${CHIP_BASE} ${CHIP_OFF} ${CHIP_ON}`}>
                      3×3
                    </ToggleGroupItem>
                    <ToggleGroupItem value="4" className={`${CHIP_BASE} ${CHIP_OFF} ${CHIP_ON}`}>
                      4×4
                    </ToggleGroupItem>
                    <ToggleGroupItem value="5" className={`${CHIP_BASE} ${CHIP_OFF} ${CHIP_ON}`}>
                      5×5
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label>FREEマス</Label>
                    <p className="text-xs text-muted-foreground">3×3 / 5×5 のみ中央に配置（4×4はOFF固定）</p>
                  </div>
                  <Switch checked={actualFree} onCheckedChange={(v) => setFreeEnabled(v)} disabled={!freeAllowed} />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </CardContent>
            </Card>

            {/* 4) 生成ボタン（最下部） */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">生成</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button className="rounded-full" onClick={onGenerate}>
                  生成する
                </Button>
                <Button className="rounded-full" variant="secondary" onClick={onExportPng} disabled={!grid}>
                  PNG保存
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Right: Preview */}
          <aside className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">プレビュー</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!grid ? (
                  <div className="rounded-xl border bg-muted/40 p-6 text-sm text-muted-foreground">
                    まだビンゴがありません。左の設定から「生成する」を押してください。
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    {/* 盤面（テキスト類は最小、条件と日時のみ） */}
                    <div
                      ref={boardRef}
                      className="w-full max-w-[520px] rounded-2xl border bg-white p-4 shadow-sm"
                    >
                      {/* 盤面 */}
                      <div className="rounded-xl border-2 border-neutral-900 p-2">
                        <div
                          className="grid"
                          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                        >
                          {grid.flatMap((row, r) =>
                            row.map((cell, c) => {
                              const isCenter =
                                actualFree &&
                                size !== 4 &&
                                r === Math.floor(size / 2) &&
                                c === Math.floor(size / 2);

                              if (cell.kind === "free") {
                                return (
                                  <div key={`${r}-${c}`} className="aspect-square border border-neutral-900 p-2">
                                    <div className="flex h-full items-center justify-center">
                                      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-neutral-900 bg-red-600 text-white">
                                        <div className="text-[10px] font-bold tracking-widest">FREE</div>
                                        <div className="text-lg">★</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              const gd = grades[cell.grade];

                              return (
                                <div key={`${r}-${c}`} className="aspect-square border border-neutral-900 p-2">
                                  <div className="flex h-full items-center justify-center">
                                    <div
                                      className={[
                                        "flex h-full w-full items-center justify-center rounded-lg border-2 border-neutral-900 text-sm font-extrabold",
                                        isCenter ? "ring-2 ring-neutral-900" : "",
                                      ].join(" ")}
                                      style={{
                                        backgroundColor: gd.bgColor,
                                        color: gd.fontColor,
                                      }}
                                    >
                                      {cell.key}
                                    </div>
                                  </div>
                                </div>
                              );
                            }),
                          )}
                        </div>
                      </div>

                      {/* 下部：条件（左） / 生成日時（右） */}
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="text-[10px] leading-snug text-neutral-600">
                          {conditionText}
                        </div>
                        <div className="shrink-0 text-[10px] text-neutral-600">
                          {generatedAt ? formatDateTimeJP(generatedAt) : ""}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">※ PNG保存はプレビュー（白背景）をそのまま書き出します</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">ヒント</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>5×5 などマス数が多い場合、選択グレードの課題数が足りないと生成できません。</p>
                <p>「全部選択」→ 生成 → その後に絞る、が一番サクサクです。</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
