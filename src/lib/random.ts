export function shuffle<T>(arr: T[], rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleUnique<T>(arr: T[], n: number, rng = Math.random): T[] {
  if (n > arr.length) throw new Error("Not enough items to sample");
  return shuffle(arr, rng).slice(0, n);
}
