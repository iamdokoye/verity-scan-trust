export function QrPlaceholder({ size = 200, value = "VTA" }: { size?: number; value?: string }) {
  // Deterministic pseudo-QR pattern from token
  const cells = 21;
  const seed = Array.from(value).reduce((a, c) => a + c.charCodeAt(0), 0);
  const grid: boolean[][] = [];
  for (let r = 0; r < cells; r++) {
    grid[r] = [];
    for (let c = 0; c < cells; c++) {
      const v = (Math.sin((r + 1) * (c + 3) * (seed % 17 || 7)) + 1) / 2;
      grid[r][c] = v > 0.55;
    }
  }
  // Finder patterns at corners
  const finder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
    if (inBox(0, 0) || inBox(0, cells - 7) || inBox(cells - 7, 0)) {
      const localR = r >= cells - 7 ? r - (cells - 7) : r;
      const localC = c >= cells - 7 ? c - (cells - 7) : c;
      const lr = localR, lc = localC;
      if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
      if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
      return false;
    }
    return null;
  };
  const cell = size / cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-md bg-white">
      {Array.from({ length: cells }).map((_, r) =>
        Array.from({ length: cells }).map((_, c) => {
          const f = finder(r, c);
          const on = f === null ? grid[r][c] : f;
          if (!on) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="currentColor"
            />
          );
        }),
      )}
    </svg>
  );
}
